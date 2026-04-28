"use server";

/**
 * Server Actions del admin sobre clientes:
 *   - inviteClientAction: alta de cliente con email de invitacion (token de
 *     activacion = mismo token de password reset, valido 24 h).
 *   - adminUpdateProfileAction: edita perfil completo de un cliente
 *     (incluye DNI/IBAN: el admin puede corregir sin flujo email).
 *   - assignAdminAction: cambia el admin gestor de un cliente.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { emailHash, encryptField, searchHash } from "@/lib/crypto";
import { getRequestMeta } from "@/lib/request-context";
import { hashPassword } from "@/services/password";
import { generateToken, hashToken, isoFromNow } from "@/services/tokens";
import { sendEmail, clientInvitationTemplate } from "@/services/mail";
import { logAudit } from "@/services/audit";
import { profileSchema } from "@/lib/schemas/client-profile";
import { applySensitiveChange, isDniInUse, updateProfile } from "@/services/client-profile";
import type { ActionResult } from "./auth";

function fail<T = unknown>(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, code, message, fieldErrors };
}

// ---------------------------------------------------------------------
// INVITAR CLIENTE: crea user + perfil + token de activacion (24 h).
// ---------------------------------------------------------------------
const inviteSchema = z
  .object({ email: z.string().email().toLowerCase() })
  .and(profileSchema);

export async function inviteClientAction(
  formData: FormData,
): Promise<ActionResult<{ activationUrl?: string }>> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return fail("FORBIDDEN", "Solo administradores");
  }

  const obj: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) obj[k] = typeof v === "string" ? v : undefined;

  const parsed = inviteSchema.safeParse(obj);
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }

  const { email, ...profile } = parsed.data;
  const eHash = emailHash(email);

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.emailHash, eHash))
    .limit(1);

  if (existing) {
    return fail("EMAIL_IN_USE", "Ya existe una cuenta con ese email");
  }
  if (await isDniInUse(profile.dni)) {
    return fail("DNI_IN_USE", "Ese DNI ya esta registrado", {
      dni: ["Ya existe una cuenta con ese DNI"],
    });
  }

  const userId = randomUUID();
  // Contraseña temporal aleatoria (el cliente la cambiara en el flujo de invitacion).
  const tempHash = await hashPassword(generateToken().slice(0, 24) + "Aa1!");

  await db.insert(schema.users).values({
    id: userId,
    email,
    emailHash: eHash,
    passwordHash: tempHash,
    role: "CLIENT",
    emailVerified: true, // el admin lo crea: no necesita verificar
    emailVerifiedAt: new Date().toISOString(),
  });

  await db.insert(schema.clientProfiles).values({
    id: randomUUID(),
    userId,
    nombre: profile.nombre,
    apellidos: profile.apellidos,
    telefono: profile.telefono,
    fechaNacimiento: profile.fechaNacimiento,
    dniEncrypted: encryptField(profile.dni),
    dniHash: searchHash(profile.dni),
    calle: profile.calle,
    numero: profile.numero,
    piso: profile.piso ?? null,
    codigoPostal: profile.codigoPostal,
    ciudad: profile.ciudad,
    provincia: profile.provincia,
    pais: profile.pais,
    estadoCivil: profile.estadoCivil ?? null,
    profesion: profile.profesion ?? null,
    situacionLaboral: profile.situacionLaboral ?? null,
    nssEncrypted: profile.nss ? encryptField(profile.nss) : null,
    ibanEncrypted: profile.iban ? encryptField(profile.iban) : null,
    tipoCliente: profile.tipoCliente,
    cifEncrypted: profile.cif ? encryptField(profile.cif) : null,
    cifHash: profile.cif ? searchHash(profile.cif) : null,
    razonSocial: profile.razonSocial ?? null,
    formaJuridica: profile.formaJuridica ?? null,
    domicilioFiscal: profile.domicilioFiscal ?? null,
    assignedAdminId: session.user.id,
  });

  await db
    .update(schema.users)
    .set({ onboardingCompleted: true })
    .where(eq(schema.users.id, userId));

  // Token de activacion = reset password de 24 h.
  const token = generateToken();
  await db.insert(schema.passwordResetTokens).values({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: isoFromNow(24 * 60 * 60 * 1000),
  });

  const url = `${env.APP_URL}/recuperar/confirmar?token=${token}`;

  // Si hay Resend, enviamos email; si no, devolvemos el link al admin para
  // que se lo pase al cliente por el canal que prefiera.
  if (env.RESEND_API_KEY) {
    await sendEmail({ to: email, ...clientInvitationTemplate(url, profile.nombre) });
  }

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "USER_CREATED",
    recursoTipo: "user",
    recursoId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { invitedEmail: email },
  });
  await logAudit({
    userId: session.user.id,
    accion: "PROFILE_CREATED",
    recursoTipo: "user",
    recursoId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true, data: env.RESEND_API_KEY ? {} : { activationUrl: url } };
}

// ---------------------------------------------------------------------
// EDITAR perfil desde admin (incluye DNI/IBAN).
// ---------------------------------------------------------------------
export async function adminUpdateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return fail("FORBIDDEN", "Solo administradores");
  }

  const targetUserId = formData.get("userId");
  if (typeof targetUserId !== "string" || !targetUserId) {
    return fail("VALIDATION", "Falta userId");
  }

  const obj: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) obj[k] = typeof v === "string" ? v : undefined;

  const parsed = profileSchema.safeParse(obj);
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }

  if (await isDniInUse(parsed.data.dni, targetUserId)) {
    return fail("DNI_IN_USE", "Ese DNI ya esta en otra cuenta", {
      dni: ["Ya existe otra cuenta con ese DNI"],
    });
  }

  // updateProfile no toca DNI/IBAN: lo aplicamos aparte.
  const { dni, iban, ...rest } = parsed.data;
  await updateProfile(targetUserId, rest);
  await applySensitiveChange(targetUserId, "DNI", dni);
  if (iban) await applySensitiveChange(targetUserId, "IBAN", iban);

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "PROFILE_UPDATED",
    recursoTipo: "user",
    recursoId: targetUserId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { byAdmin: true },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------
// ASIGNAR admin gestor de un cliente.
// ---------------------------------------------------------------------
const assignSchema = z.object({
  clientUserId: z.string().uuid(),
  adminUserId: z.string().uuid().nullable().optional(),
});

export async function assignAdminAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return fail("FORBIDDEN", "Solo administradores");
  }

  const parsed = assignSchema.safeParse({
    clientUserId: formData.get("clientUserId"),
    adminUserId: formData.get("adminUserId") || null,
  });
  if (!parsed.success) return fail("VALIDATION", "Revisa los campos");

  await db
    .update(schema.clientProfiles)
    .set({
      assignedAdminId: parsed.data.adminUserId ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.clientProfiles.userId, parsed.data.clientUserId));

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "ASSIGNED_ADMIN_CHANGED",
    recursoTipo: "user",
    recursoId: parsed.data.clientUserId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { adminUserId: parsed.data.adminUserId ?? null },
  });
  return { ok: true };
}
