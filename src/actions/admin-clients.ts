"use server";

/**
 * Server Actions del admin sobre clientes:
 *   - createClientAction: alta de cliente con contraseña directa elegida por
 *     el admin. El cliente puede entrar inmediatamente con esas credenciales.
 *   - adminUpdateProfileAction: edita perfil completo de un cliente
 *     (incluye DNI/IBAN: el admin puede corregir sin flujo email).
 *   - assignAdminAction: cambia el admin gestor de un cliente.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { emailHash, encryptField, searchHash } from "@/lib/crypto";
import { getRequestMeta } from "@/lib/request-context";
import { hashPassword, passwordSchema } from "@/services/password";
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
// CREAR CLIENTE con contraseña directa (sin email de invitacion).
// El admin elige email + contraseña + perfil; el cliente puede entrar ya.
// ---------------------------------------------------------------------
const createSchema = z
  .object({
    email: z.string().email("Email invalido").toLowerCase(),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .transform((v) => v.normalize("NFC").replace(/^\s+|\s+$/g, "")),
  })
  .and(profileSchema)
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return fail("FORBIDDEN", "Solo administradores");
  }

  const obj: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) obj[k] = typeof v === "string" ? v : undefined;

  const parsed = createSchema.safeParse(obj);
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }

  const { email, password, ...profile } = parsed.data;
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
  const passwordHash = await hashPassword(password);

  await db.insert(schema.users).values({
    id: userId,
    email,
    emailHash: eHash,
    passwordHash,
    role: "CLIENT",
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
    onboardingCompleted: true,
  });

  await db.insert(schema.clientProfiles).values({
    id: randomUUID(),
    userId,
    nombre: profile.nombre,
    apellidos: profile.apellidos ?? "",
    telefono: profile.telefono,
    fechaNacimiento: profile.fechaNacimiento ?? "",
    dniEncrypted: encryptField(profile.dni),
    dniHash: searchHash(profile.dni),
    calle: profile.calle ?? "",
    numero: profile.numero ?? "",
    piso: profile.piso ?? null,
    codigoPostal: profile.codigoPostal ?? "",
    ciudad: profile.ciudad ?? "",
    provincia: profile.provincia ?? "",
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

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "USER_CREATED",
    recursoTipo: "user",
    recursoId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { createdEmail: email, byAdmin: true },
  });
  await logAudit({
    userId: session.user.id,
    accion: "PROFILE_CREATED",
    recursoTipo: "user",
    recursoId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  revalidatePath("/admin/clientes");
  return { ok: true };
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
