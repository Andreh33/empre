"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { getRequestMeta } from "@/lib/request-context";
import { logAudit } from "@/services/audit";
import { signOut } from "@/auth";
import { verifyPassword } from "@/services/password";
import type { ActionResult } from "./auth";

/**
 * Solicitar baja: marca user.deletedAt y user.deletionScheduledFor (+7 dias).
 * El cron de Fase 9 hara el borrado fisico tras la gracia (con excepcion de
 * documentos con obligacion legal: se conservan en una "cuarentena" 4-6 anyos).
 */
const requestDeletionSchema = z.object({
  password: z.string().min(1),
});

export async function requestDeletionAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, code: "UNAUTHORIZED", message: "Inicia sesion" };

  const parsed = requestDeletionSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Falta contrasenya" };

  const [u] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  if (!u) return { ok: false, code: "NOT_FOUND", message: "Usuario no encontrado" };

  if (!(await verifyPassword(u.passwordHash, parsed.data.password))) {
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Contrasenya incorrecta" };
  }

  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db
    .update(schema.users)
    .set({
      deletedAt: now.toISOString(),
      deletionScheduledFor: inSevenDays.toISOString(),
      updatedAt: now.toISOString(),
    })
    .where(eq(schema.users.id, session.user.id));

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "USER_SOFT_DELETED",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { scheduledFor: inSevenDays.toISOString() },
  });

  await signOut({ redirectTo: "/" });
  return { ok: true };
}

const consentUpdateSchema = z.object({
  tipo: z.enum(schema.TIPOS_CONSENTIMIENTO),
  aceptado: z.string().transform((v) => v === "on" || v === "true"),
});

export async function updateConsentAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, code: "UNAUTHORIZED", message: "Inicia sesion" };

  const parsed = consentUpdateSchema.safeParse({
    tipo: formData.get("tipo"),
    aceptado: formData.get("aceptado") ?? "false",
  });
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Datos invalidos" };

  const meta = await getRequestMeta();
  await db.insert(schema.consents).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    tipoConsentimiento: parsed.data.tipo,
    versionDocumento: "1.0",
    aceptado: parsed.data.aceptado,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  await logAudit({
    userId: session.user.id,
    accion: parsed.data.aceptado ? "CONSENT_GIVEN" : "CONSENT_REVOKED",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { tipo: parsed.data.tipo },
  });
  return { ok: true };
}
