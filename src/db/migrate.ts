/**
 * Aplica las migraciones generadas por drizzle-kit (./drizzle).
 * Uso:
 *   npm run db:generate   # genera SQL en ./drizzle
 *   npm run db:migrate    # aplica contra Turso
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@libsql/client";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL no esta definida");
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  console.warn("[migrate] aplicando migraciones contra Turso...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.warn("[migrate] OK");

  client.close();
}

main().catch((err) => {
  console.error("[migrate] error:", err);
  process.exit(1);
});
