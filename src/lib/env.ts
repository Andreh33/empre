/**
 * Validacion estricta de variables de entorno con Zod.
 * Si falta una variable critica la app no arranca: fail fast.
 */
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Base de datos.
  TURSO_DATABASE_URL: z.string().url().startsWith("libsql://"),
  TURSO_AUTH_TOKEN: isProd ? z.string().min(1) : z.string().min(1).or(z.literal("")),

  // Cifrado.
  ENCRYPTION_KEY: base64_32Bytes,
  SEARCH_HMAC_KEY: base64_32Bytes,

  // Auth.
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  AUTH_TRUST_HOST: z.string().optional(),

  // Vercel Blob.
  BLOB_READ_WRITE_TOKEN: isProd ? z.string().min(1) : z.string().optional(),

  // Resend.
  RESEND_API_KEY: isProd ? z.string().min(1) : z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().default("no-reply@asesoria-juangarcia.es"),

  // Turnstile.
  TURNSTILE_SITE_KEY: isProd ? z.string().min(1) : z.string().optional(),
  TURNSTILE_SECRET_KEY: isProd ? z.string().min(1) : z.string().optional(),

  // Upstash.
  UPSTASH_REDIS_REST_URL: isProd ? z.string().url() : z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: isProd ? z.string().min(1) : z.string().optional(),

  // Antivirus.
  VIRUSTOTAL_API_KEY: z.string().optional(),

  // Sentry.
  SENTRY_DSN: z.string().optional(),

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
