"use server";

/**
 * Server Actions de autenticacion: registro (con login automatico),
 * recuperacion de contraseña, login y logout.
 *
 * Cada accion valida con Zod y registra en audit_logs.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { emailHash } from "@/lib/crypto";
import { env } from "@/lib/env";
import { getRequestMeta } from "@/lib/request-context";
import { hashPassword, passwordSchema, verifyPassword } from "@/services/password";
import { generateToken, hashToken, isExpired, isoFromNow } from "@/services/tokens";
import { sendEmail, passwordResetTemplate } from "@/services/mail";
import { logAudit } from "@/services/audit";
import { signIn, signOut, auth } from "@/auth";
import { AuthError as AuthJsError } from "next-auth";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };

function fail<T = unknown>(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, code, message, fieldErrors };
}

// Normalizamos siempre antes de comparar contraseñas. Esto evita los
// "Las contraseñas no coinciden" cuando el usuario pega texto con espacios
// invisibles o caracteres en formas Unicode distintas.
function normalizePassword(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/^\s+|\s+$/g, "");
}

// ---------------------------------------------------------------------
// REGISTRO
// ---------------------------------------------------------------------
const registerSchema = z
  .object({
    email: z.string().email("Email invalido").max(254).toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string().transform((v) => v.normalize("NFC").replace(/^\s+|\s+$/g, "")),
    privacyConsent: z.literal("on", { errorMap: () => ({ message: "Debes aceptar la politica de privacidad" }) }),
    termsConsent: z.literal("on", { errorMap: () => ({ message: "Debes aceptar los terminos" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export async function registerAction(
  formData: FormData,
): Promise<ActionResult<{ role: "SUPER_ADMIN" | "ADMIN" | "CLIENT" }>> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos del formulario", parsed.error.flatten().fieldErrors);
  }

  const { ip, userAgent } = await getRequestMeta();
  const email = parsed.data.email;
  const hash = emailHash(email);

  const [existing] = await db
    .select({ id: schema.users.id, deletedAt: schema.users.deletedAt })
    .from(schema.users)
    .where(eq(schema.users.emailHash, hash))
    .limit(1);

  if (existing && !existing.deletedAt) {
    return fail("EMAIL_TAKEN", "Ya existe una cuenta con ese email. Inicia sesion.");
  }

  const userId = existing?.id ?? randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);
  const nowIso = new Date().toISOString();

  if (existing) {
    await db
      .update(schema.users)
      .set({
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: nowIso,
        deletedAt: null,
        deletionScheduledFor: null,
        updatedAt: nowIso,
      })
      .where(eq(schema.users.id, userId));
  } else {
    await db.insert(schema.users).values({
      id: userId,
      email,
      emailHash: hash,
      passwordHash,
      role: "CLIENT",
      emailVerified: true,
      emailVerifiedAt: nowIso,
    });
  }

  // Consentimientos.
  const consentVersion = "1.0";
  await db.insert(schema.consents).values([
    {
      id: randomUUID(),
      userId,
      tipoConsentimiento: "PRIVACIDAD",
      versionDocumento: consentVersion,
      aceptado: true,
      ip,
      userAgent,
    },
    {
      id: randomUUID(),
      userId,
      tipoConsentimiento: "TERMINOS",
      versionDocumento: consentVersion,
      aceptado: true,
      ip,
      userAgent,
    },
  ]);

  await logAudit({ userId, accion: "USER_CREATED", ip, userAgent });
  await logAudit({
    userId,
    accion: "CONSENT_GIVEN",
    ip,
    userAgent,
    metadata: { types: ["PRIVACIDAD", "TERMINOS"], version: consentVersion },
  });

  // Login automatico tras registrar.
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      ip,
      userAgent,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthJsError) {
      return fail("AUTO_LOGIN_FAILED", "Cuenta creada. Inicia sesion para continuar.");
    }
    throw err;
  }

  return { ok: true, data: { role: "CLIENT" } };
}

// ---------------------------------------------------------------------
// SOLICITAR RECUPERACION
// ---------------------------------------------------------------------
const passwordResetRequestSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
});

export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const parsed = passwordResetRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("VALIDATION", "Email invalido");

  const { ip, userAgent } = await getRequestMeta();
  const hash = emailHash(parsed.data.email);
  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.emailHash, hash))
    .limit(1);

  if (!user) return { ok: true };

  const token = generateToken();
  await db.insert(schema.passwordResetTokens).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: isoFromNow(30 * 60 * 1000),
  });

  const url = `${env.APP_URL}/recuperar/confirmar?token=${token}`;
  await sendEmail({ to: user.email, ...passwordResetTemplate(url) });

  await logAudit({
    userId: user.id,
    accion: "PASSWORD_RESET_REQUEST",
    ip,
    userAgent,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------
// CONFIRMAR NUEVA CONTRASEÑA
// ---------------------------------------------------------------------
const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirmPassword: z.string().transform((v) => v.normalize("NFC").replace(/^\s+|\s+$/g, "")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export async function confirmPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const parsed = passwordResetConfirmSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }

  const tokenHash = hashToken(parsed.data.token);
  const [record] = await db
    .select()
    .from(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.usedAt || isExpired(record.expiresAt)) {
    return fail("INVALID_TOKEN", "Enlace invalido o caducado. Solicita uno nuevo.");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db
    .update(schema.users)
    .set({
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, record.userId));

  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(schema.passwordResetTokens.id, record.id));

  const meta = await getRequestMeta();
  await logAudit({
    userId: record.userId,
    accion: "PASSWORD_RESET_OK",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  password: z.string().min(1).max(128),
});

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<{ role: "SUPER_ADMIN" | "ADMIN" | "CLIENT" }>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }

  const password = normalizePassword(parsed.data.password);
  const { ip, userAgent } = await getRequestMeta();

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password,
      ip,
      userAgent,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthJsError) {
      const cause = err.cause as { err?: { code?: string; message?: string } } | undefined;
      const code = cause?.err?.code ?? "INVALID_CREDENTIALS";
      const message = cause?.err?.message ?? "Credenciales incorrectas";
      return fail(code, message);
    }
    throw err;
  }

  // Recuperamos el rol para que el cliente sepa a donde redirigir.
  const hash = emailHash(parsed.data.email);
  const [user] = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.emailHash, hash))
    .limit(1);

  return { ok: true, data: { role: (user?.role ?? "CLIENT") as "SUPER_ADMIN" | "ADMIN" | "CLIENT" } };
}

// ---------------------------------------------------------------------
// CAMBIAR CONTRASEÑA (usuario autenticado, sin email).
// ---------------------------------------------------------------------
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indica tu contraseña actual"),
    newPassword: passwordSchema,
    confirmNewPassword: z
      .string()
      .transform((v) => v.normalize("NFC").replace(/^\s+|\s+$/g, "")),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Las contraseñas no coinciden",
  });

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Inicia sesión");

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }

  const [user] = await db
    .select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  if (!user) return fail("UNAUTHORIZED", "Sesión no válida");

  const ok = await verifyPassword(user.passwordHash, normalizePassword(parsed.data.currentPassword));
  if (!ok) {
    return fail("INVALID_CREDENTIALS", "La contraseña actual no es correcta", {
      currentPassword: ["Contraseña incorrecta"],
    });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(schema.users)
    .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, session.user.id));

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "PASSWORD_RESET_OK",
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { source: "self_change" },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  const session = await auth();
  const { ip, userAgent } = await getRequestMeta();
  if (session?.user?.id) {
    await logAudit({
      userId: session.user.id,
      accion: "LOGOUT",
      ip,
      userAgent,
    });
  }
  await signOut({ redirectTo: "/" });
}
