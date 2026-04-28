/**
 * Crea el SUPER_ADMIN inicial. Idempotente: si ya existe, actualiza la
 * contrasenya. Uso:
 *
 *   npm run seed:superadmin -- "<email>" "<password>"
 *
 * El primer SUPER_ADMIN se crea con emailVerified=true para que pueda
 * iniciar sesion sin verificacion. Tras el primer login DEBE configurar 2FA
 * en /admin/seguridad antes de seguir entrando (el sistema le obliga).
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

async function main() {
  // Imports dinamicos para que se evaluen DESPUES de cargar dotenv
  // (los imports estaticos se hoistan antes que el codigo del modulo).
  const { randomUUID } = await import("node:crypto");
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("../src/db/index.js");
  const { emailHash } = await import("../src/lib/crypto.js");
  const { hashPassword, passwordSchema } = await import("../src/services/password.js");

  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Uso: npm run seed:superadmin -- "<email>" "<password>"');
    process.exit(1);
  }

  const pwParse = passwordSchema.safeParse(password);
  if (!pwParse.success) {
    console.error("Contrasenya invalida:", pwParse.error.flatten().formErrors);
    process.exit(1);
  }

  const hash = emailHash(email);
  const passwordHash = await hashPassword(password);

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.emailHash, hash))
    .limit(1);

  if (existing) {
    await db
      .update(schema.users)
      .set({
        passwordHash,
        role: "SUPER_ADMIN",
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        deletedAt: null,
        deletionScheduledFor: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, existing.id));
    console.warn("[seed] SUPER_ADMIN existente actualizado:", email);
  } else {
    await db.insert(schema.users).values({
      id: randomUUID(),
      email,
      emailHash: hash,
      passwordHash,
      role: "SUPER_ADMIN",
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
    });
    console.warn("[seed] SUPER_ADMIN creado:", email);
  }

  console.warn("[seed] Recuerda activar 2FA en /admin/seguridad tras el primer login.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] error:", err);
  process.exit(1);
});
