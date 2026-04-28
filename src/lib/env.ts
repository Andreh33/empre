/**
 * Validacion estricta de variables de entorno con Zod.
 * Si falta una variable critica la app no arranca: fail fast.
 */
import { z } from "zod";

const base64_32Bytes = z
  .string()
  .min(1, "vacio")
  .refine((v) => {
    try {
      return Buffer.from(v, "base64").length === 32;
    } catch {
      return false;
    }
  }, "Debe ser exactamente 32 bytes en base64 (genera con: openssl rand -base64 32)");

/**
 * Cadena opcional: trata "" como undefined para que un .env con clave vacia
 * (caso comun en builds locales y previews) no rompa la validacion.
 */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => !v || /^https?:\/\//.test(v), { message: "URL invalida" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Base de datos (siempre requeridos).
  TURSO_DATABASE_URL: z.string().url().startsWith("libsql://"),
  TURSO_AUTH_TOKEN: z.string().min(1),

  // Cifrado (siempre requeridos).
  ENCRYPTION_KEY: base64_32Bytes,
  SEARCH_HMAC_KEY: base64_32Bytes,

  // Auth (siempre requeridos).
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  AUTH_TRUST_HOST: optionalString,

  // Integraciones: opcionales en build/dev. Cada servicio falla loudly en
  // runtime si se invoca sin sus secretos.
  BLOB_READ_WRITE_TOKEN: optionalString,
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: z.string().email().default("no-reply@asesoria-juangarcia.es"),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  // Antivirus.
  VIRUSTOTAL_API_KEY: optionalString,

  // Sentry.
  SENTRY_DSN: optionalString,

  // App.
  APP_NAME: z.string().default("Asesoria Empresarial Juan Garcia S.L."),
  APP_URL: z.string().url(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(50),
  SESSION_INACTIVITY_MINUTES: z.coerce.number().int().positive().default(15),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().positive().default(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "[env] Variables de entorno invalidas:\n",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error("Configuracion de entorno invalida. Revisa .env.local o las variables en Vercel.");
}

export const env = parsed.data;
export type Env = typeof env;
