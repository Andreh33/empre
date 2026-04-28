/**
 * Bloqueo progresivo tras intentos fallidos:
 *   3 intentos -> exigir CAPTCHA (lo aplica la UI; aqui solo contamos)
 *   5 intentos -> bloqueo 15 min
 *  10 intentos -> bloqueo 24 h + email de alerta
 *
 * Las decisiones se toman a partir del campo users.failedLoginAttempts y
 * users.lockedUntil. El reset se realiza tras un login correcto.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendEmail, accountLockedTemplate } from "./mail";

export const CAPTCHA_THRESHOLD = 3;
const LOCK_15MIN_THRESHOLD = 5;
const LOCK_24H_THRESHOLD = 10;

export type LockoutDecision =
  | { kind: "ok" }
  | { kind: "require_captcha" }
  | { kind: "locked"; until: Date };

export function evaluateLockoutState(user: {
  failedLoginAttempts: number;
  lockedUntil: string | null;
}): LockoutDecision {
  if (user.lockedUntil) {
    const until = new Date(user.lockedUntil);
    if (until.getTime() > Date.now()) return { kind: "locked", until };
  }
  if (user.failedLoginAttempts >= CAPTCHA_THRESHOLD) {
    return { kind: "require_captcha" };
  }
  return { kind: "ok" };
}

interface RegisterFailureArgs {
  userId: string;
  email: string;
  failedAttempts: number;
}

export async function registerLoginFailure({
  userId,
  email,
  failedAttempts,
}: RegisterFailureArgs): Promise<{ lockedUntil: Date | null }> {
  const next = failedAttempts + 1;
  let lockedUntil: Date | null = null;

  if (next >= LOCK_24H_THRESHOLD) {
    lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else if (next >= LOCK_15MIN_THRESHOLD) {
    lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: next,
      lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, userId));

  // Email de alerta solo en el bloqueo de 24 h.
  if (next >= LOCK_24H_THRESHOLD && lockedUntil) {
    const tpl = accountLockedTemplate(lockedUntil);
    await sendEmail({ to: email, ...tpl });
  }

  return { lockedUntil };
}

export async function resetLoginFailures(userId: string): Promise<void> {
  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, userId));
}
