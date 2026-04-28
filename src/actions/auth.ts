"use server";

/**
 * Server Actions de autenticacion: registro, recuperacion, verificacion email,
 * activacion 2FA, login y logout.
 *
 * Cada accion:
 *   - valida con Zod
 *   - aplica rate-limit (auth o global)
 *   - verifica Turnstile cuando procede
 *   - registra en audit_logs
 *   - devuelve un FormResult para que la UI muestre errores especificos
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
import { checkRateLimit } from "@/services/rate-limit";
import { sendEmail, emailVerificationTemplate, passwordResetTemplate } from "@/services/mail";
import { verifyTurnstile } from "@/services/turnstile";
import { logAudit } from "@/services/audit";
import {
  generateTotpQrDataUrl,
  generateTotpSecret,
  encryptTotpSecret,
  decryptTotpSecret,
  verifyTotpCode,
} from "@/services/two-factor";
import { signIn, signOut, auth } from "@/auth";
import { AuthError as AuthJsError } from "next-auth";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };

// ---------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------
function fail<T = unknown>(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { ok: false, code, message, fieldErrors };
}

async function ensureRateLimit(kind: "auth" | "global"): Promise<ActionResult | null> {
  const { ip } = await getRequestMeta();
  const rl = await checkRateLimit(kind, ip);
  if (!rl.success) {
    return fail(
      "RATE_LIMITED",
      "Demasiadas peticiones. Espera un momento e intentalo de nuevo.",
    );
  }
  return null;
}

// ---------------------------------------------------------------------
// REGISTRO
// ---------------------------------------------------------------------
const registerSchema = z
  .object({
    email: z.string().email("Email invalido").max(254).toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    privacyConsent: z.literal("on", { errorMap: () => ({ message: "Debes aceptar la politica de privacidad" }) }),
    termsConsent: z.literal("on", { errorMap: () => ({ message: "Debes aceptar los terminos" }) }),
    turnstileToken: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenyas no coinciden",
  });

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const rl = await ensureRateLimit("auth");
  if (rl) return rl;

  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos del formulario", parsed.error.flatten().fieldErrors);
  }

  const { ip, userAgent } = await getRequestMeta();
  const captchaOk = await verifyTurnstile(parsed.data.turnstileToken ?? "", ip);
  if (!captchaOk) return fail("CAPTCHA", "Verificacion CAPTCHA fallida");

  const email = parsed.data.email;
  const hash = emailHash(email);

  const [existing] = await db
    .select({ id: schema.users.id, deletedAt: schema.users.deletedAt })
    .from(schema.users)
    .where(eq(schema.users.emailHash, hash))
    .limit(1);

  if (existing && !existing.deletedAt) {
    // No revelamos existencia exacta: respondemos OK como si todo fuera bien
    // y dejamos que el cliente reciba/no reciba email. (Defensa contra enumeracion.)
    return { ok: true };
  }

  const userId = existing?.id ?? randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);

  // Si no hay servicio de email configurado, auto-verificamos para no
  // dejar al usuario atrapado sin posibilidad de recibir el token.
  const autoVerify = !env.RESEND_API_KEY;
  const verifyTimestamp = autoVerify ? new Date().toISOString() : null;

  if (existing) {
    // Reactivar cuenta marcada como borrada (caso reset).
    await db
      .update(schema.users)
      .set({
        passwordHash,
        emailVerified: autoVerify,
        emailVerifiedAt: verifyTimestamp,
        deletedAt: null,
        deletionScheduledFor: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));
  } else {
    await db.insert(schema.users).values({
      id: userId,
      email,
      emailHash: hash,
      passwordHash,
      role: "CLIENT",
      emailVerified: autoVerify,
      emailVerifiedAt: verifyTimestamp,
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

  // Token de verificacion (1 hora) solo si hay servicio de email.
  if (!autoVerify) {
    const token = generateToken();
    await db.insert(schema.emailVerificationTokens).values({
      id: randomUUID(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: isoFromNow(60 * 60 * 1000),
    });
    const verifyUrl = `${env.APP_URL}/verificar?token=${token}`;
    await sendEmail({ to: email, ...emailVerificationTemplate(verifyUrl) });
  }

  await logAudit({
    userId,
    accion: "USER_CREATED",
    ip,
    userAgent,
  });
  await logAudit({
    userId,
    accion: "CONSENT_GIVEN",
    ip,
    userAgent,
    metadata: { types: ["PRIVACIDAD", "TERMINOS"], version: consentVersion },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------
// VERIFICAR EMAIL
// ---------------------------------------------------------------------
const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

export async function verifyEmailAction(formData: FormData): Promise<ActionResult> {
  const rl = await ensureRateLimit("auth");
  if (rl) return rl;

  const parsed = verifyEmailSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return fail("VALIDATION", "Token invalido");

  const tokenHash = hashToken(parsed.data.token);
  const [record] = await db
    .select()
    .from(schema.emailVerificationTokens)
    .where(eq(schema.emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.usedAt || isExpired(record.expiresAt)) {
    return fail("INVALID_TOKEN", "Enlace invalido o caducado. Solicita uno nuevo.");
  }

  await db
    .update(schema.users)
    .set({
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, record.userId));

  await db
    .update(schema.emailVerificationTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(schema.emailVerificationTokens.id, record.id));

  const meta = await getRequestMeta();
  await logAudit({
    userId: record.userId,
    accion: "EMAIL_VERIFIED",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------
// SOLICITAR RECUPERACION
// ---------------------------------------------------------------------
const passwordResetRequestSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  turnstileToken: z.string().optional(),
});

export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const rl = await ensureRateLimit("auth");
  if (rl) return rl;

  const parsed = passwordResetRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("VALIDATION", "Email invalido");

  const { ip, userAgent } = await getRequestMeta();
  const captchaOk = await verifyTurnstile(parsed.data.turnstileToken ?? "", ip);
  if (!captchaOk) return fail("CAPTCHA", "Verificacion CAPTCHA fallida");

  const hash = emailHash(parsed.data.email);
  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.emailHash, hash))
    .limit(1);

  // Anti-enumeracion: respondemos OK siempre.
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
// CONFIRMAR NUEVA CONTRASENYA
// ---------------------------------------------------------------------
const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenyas no coinciden",
  });

export async function confirmPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const rl = await ensureRateLimit("auth");
  if (rl) return rl;

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
// LOGIN (wrapper sobre Auth.js para devolver errores tipados a la UI)
// ---------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  password: z.string().min(1).max(128),
  totpCode: z.string().regex(/^\d{6}$/).optional().or(z.literal("")),
  turnstileToken: z.string().optional(),
});

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const rl = await ensureRateLimit("auth");
  if (rl) return rl;

  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("VALIDATION", "Revisa los campos", parsed.error.flatten().fieldErrors);
  }

  const { ip, userAgent } = await getRequestMeta();

  // Si el usuario tiene >=3 fallos previos exigimos CAPTCHA.
  const hash = emailHash(parsed.data.email);
  const [u] = await db
    .select({ failedLoginAttempts: schema.users.failedLoginAttempts })
    .from(schema.users)
    .where(eq(schema.users.emailHash, hash))
    .limit(1);
  const requireCaptcha = (u?.failedLoginAttempts ?? 0) >= 3;
  if (requireCaptcha) {
    const ok = await verifyTurnstile(parsed.data.turnstileToken ?? "", ip);
    if (!ok) return fail("CAPTCHA", "Verificacion CAPTCHA fallida");
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      totpCode: parsed.data.totpCode ?? "",
      ip,
      userAgent,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthJsError) {
      const cause = err.cause as { err?: { code?: string; message?: string } } | undefined;
      const code = cause?.err?.code ?? "INVALID_CREDENTIALS";
      const message = cause?.err?.message ?? "Credenciales incorrectas";
      return fail(code, message);
    }
    throw err;
  }
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

// ---------------------------------------------------------------------
// 2FA: empezar configuracion (devuelve secret + QR)
// ---------------------------------------------------------------------
export async function startTwoFactorSetupAction(): Promise<
  ActionResult<{ secret: string; qrDataUrl: string }>
> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");

  const secret = generateTotpSecret();
  const qrDataUrl = await generateTotpQrDataUrl(session.user.email, secret);

  // Guardamos el secret cifrado pero todavia con twoFactorEnabled=false hasta
  // que el usuario verifique el primer codigo.
  await db
    .update(schema.users)
    .set({
      twoFactorSecret: encryptTotpSecret(secret),
      twoFactorEnabled: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, session.user.id));

  return { ok: true, data: { secret, qrDataUrl } };
}

const confirmTwoFactorSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Codigo de 6 digitos"),
});

export async function confirmTwoFactorSetupAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");

  const parsed = confirmTwoFactorSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return fail("VALIDATION", "Codigo invalido");

  const [user] = await db
    .select({ twoFactorSecret: schema.users.twoFactorSecret })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);

  if (!user?.twoFactorSecret) return fail("NO_SETUP", "No has iniciado la configuracion");

  const decrypted = decryptTotpSecret(user.twoFactorSecret);
  if (!verifyTotpCode(decrypted, parsed.data.code)) {
    return fail("BAD_CODE", "Codigo incorrecto");
  }

  await db
    .update(schema.users)
    .set({
      twoFactorEnabled: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, session.user.id));

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "TWO_FA_ENABLED",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return { ok: true };
}

const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export async function disableTwoFactorAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "Inicia sesion");

  // Admins no pueden desactivar 2FA.
  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
    return fail("FORBIDDEN", "Los administradores no pueden desactivar 2FA");
  }

  const parsed = disableTwoFactorSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("VALIDATION", "Revisa los campos");

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  if (!user?.twoFactorSecret) return fail("NO_2FA", "2FA no esta activado");

  const passwordOk = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!passwordOk) return fail("INVALID_CREDENTIALS", "Contrasenya incorrecta");

  if (!verifyTotpCode(decryptTotpSecret(user.twoFactorSecret), parsed.data.code)) {
    return fail("BAD_CODE", "Codigo incorrecto");
  }

  await db
    .update(schema.users)
    .set({
      twoFactorSecret: null,
      twoFactorEnabled: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, session.user.id));

  const meta = await getRequestMeta();
  await logAudit({
    userId: session.user.id,
    accion: "TWO_FA_DISABLED",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return { ok: true };
}
