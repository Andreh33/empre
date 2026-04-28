"use server";

/**
 * Server Actions del perfil de cliente:
 *   - createOrUpdateProfile: alta o edicion (datos no sensibles).
 *   - requestSensitiveChange: solicitar cambio de DNI o IBAN -> email.
 *   - confirmSensitiveChange: aplicar el cambio si el token es valido.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { encryptField, decryptField } from "@/lib/crypto";
import { getRequestMeta } from "@/lib/request-context";
import { logAudit } from "@/services/audit";
import { sendEmail, sensitiveChangeTemplate } from "@/services/mail";
import {
  generateToken,
  hashToken,
  isExpired,
  isoFromNow,
} from "@/services/tokens";
import {
  applySensitiveChange,
  createProfile,
  getProfileByUserId,
  isDniInUse,
  updateProfile,
} from "@/services/client-profile";
import {
  profileSchema,
  profileUpdateSchema,
  sensitiveChangeRequestSchema,
} from "@/lib/schemas/client-profile";
import { detectAndValidate, isValidIBAN_ES } from "@/lib/spanish-id";
import type { ActionResult } from "./auth";

function fail<T = unknown>(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, code, message, fieldErrors };
}

function formDataToObject(fd: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of fd.entries()) {
    out[k] = typeof v === "string" ? v : undefined;
  }
  return out;
}

// ---------------------------------------------------------------------
// CREAR / ACTUALIZAR perfil
// ---------------------------------------------------------------------
export async function createOrUpdateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");
  if (session.user.role !== "CLIENT") {
    return fail("FORBIDDEN", "Solo los clientes pueden editar su perfil aqui");
  }

  const obj = formDataToObject(formData);
  const existing = await getProfileByUserId(session.user.id);

  // En alta usamos el schema completo (con DNI). En edicion usamos el parcial
  // (DNI/IBAN se cambian por flujo aparte) pero mantenemos los valores actuales
  // para no romper el modelo.
  const meta = await getRequestMeta();

  if (!existing) {
    const parsed = profileSchema.safeParse(obj);
    if (!parsed.success) {
      return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
    }
    if (await isDniInUse(parsed.data.dni)) {
      return fail("DNI_IN_USE", "Ese DNI ya esta registrado", {
        dni: ["Ya existe una cuenta con ese DNI"],
      });
    }
    await createProfile(session.user.id, parsed.data);
    await logAudit({
      userId: session.user.id,
      accion: "PROFILE_CREATED",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { ok: true };
  }

  // Edicion (parcial: sin DNI ni IBAN).
  const parsed = profileUpdateSchema.safeParse(obj);
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }
  await updateProfile(session.user.id, parsed.data);
  await logAudit({
    userId: session.user.id,
    accion: "PROFILE_UPDATED",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------
// SOLICITAR cambio de DNI/IBAN -> envia email con token
// ---------------------------------------------------------------------
export async function requestSensitiveChangeAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");
  if (session.user.role !== "CLIENT") return fail("FORBIDDEN", "Solo clientes");

  const parsed = sensitiveChangeRequestSchema.safeParse({
    tipo: formData.get("tipo"),
    valor: formData.get("valor"),
  });
  if (!parsed.success) return fail("VALIDATION", "Revisa los campos");

  const { tipo, valor } = parsed.data;
  const cleaned = valor.trim().toUpperCase().replace(/[\s-]/g, "");

  if (tipo === "DNI") {
    const r = detectAndValidate(cleaned);
    if (!r.valid || (r.kind !== "DNI" && r.kind !== "NIE")) {
      return fail("VALIDATION", "DNI/NIE invalido");
    }
    if (await isDniInUse(cleaned, session.user.id)) {
      return fail("DNI_IN_USE", "Ese DNI ya esta registrado en otra cuenta");
    }
  } else if (tipo === "IBAN") {
    if (!isValidIBAN_ES(cleaned)) return fail("VALIDATION", "IBAN espanyol invalido");
  }

  const token = generateToken();
  await db.insert(schema.sensitiveChangeTokens).values({
    id: randomUUID(),
    userId: session.user.id,
    tipo,
    payloadEncrypted: encryptField(cleaned),
    tokenHash: hashToken(token),
    expiresAt: isoFromNow(30 * 60 * 1000),
  });

  const url = `${env.APP_URL}/panel/datos/confirmar?token=${token}`;
  await sendEmail({ to: session.user.email, ...sensitiveChangeTemplate(url, tipo) });

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "PROFILE_SENSITIVE_CHANGE_REQUESTED",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { tipo },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------
// CONFIRMAR cambio sensible con token
// ---------------------------------------------------------------------
const confirmSchema = z.object({ token: z.string().min(20).max(200) });

export async function confirmSensitiveChangeAction(
  formData: FormData,
): Promise<ActionResult<{ tipo: "DNI" | "IBAN" }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");

  const parsed = confirmSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return fail("VALIDATION", "Token invalido");

  const tokenHash = hashToken(parsed.data.token);
  const [record] = await db
    .select()
    .from(schema.sensitiveChangeTokens)
    .where(eq(schema.sensitiveChangeTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.usedAt || isExpired(record.expiresAt)) {
    return fail("INVALID_TOKEN", "Enlace invalido o caducado. Solicita uno nuevo.");
  }
  if (record.userId !== session.user.id) {
    return fail("FORBIDDEN", "Token de otra cuenta");
  }

  const newValue = decryptField(record.payloadEncrypted);
  await applySensitiveChange(record.userId, record.tipo, newValue);

  await db
    .update(schema.sensitiveChangeTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(schema.sensitiveChangeTokens.id, record.id));

  const meta = await getRequestMeta();
  await logAudit({
    userId: record.userId,
    accion: "PROFILE_SENSITIVE_CHANGE_CONFIRMED",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { tipo: record.tipo },
  });

  return { ok: true, data: { tipo: record.tipo } };
}
