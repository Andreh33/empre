import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Carga .env.local primero (si existe) y .env como fallback.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL no esta definida en el entorno");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
