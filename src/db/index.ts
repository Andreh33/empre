/**
 * Cliente Drizzle conectado a Turso (libSQL).
 * Singleton: en dev evita re-instanciar con HMR.
 */
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __libsqlClient: Client | undefined;
}

const client =
  globalThis.__libsqlClient ??
  createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__libsqlClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
