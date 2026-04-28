/**
 * Singleton de Auth.js. Exporta:
 *   - auth(): obtener sesion en server components / route handlers.
 *   - signIn / signOut: helpers de Auth.js.
 *   - GET / POST: handlers para /api/auth/[...nextauth].
 */
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
