/**
 * Configuracion de Auth.js v5.
 *
 * Estrategia: JWT (no DB sessions) para mejor latencia y compatibilidad
 * con middleware Edge. Las cookies son httpOnly + secure + sameSite=lax.
 *
 * Login simplificado: solo email + contraseña. Sin 2FA, sin captcha, sin
 * bloqueo por intentos fallidos, sin requerir verificacion de email.
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { emailHash } from "@/lib/crypto";
import { verifyPassword } from "@/services/password";
import { logAudit } from "@/services/audit";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const SESSION_INACTIVITY_SECONDS = env.SESSION_INACTIVITY_MINUTES * 60;
const SESSION_ABSOLUTE_SECONDS = env.SESSION_ABSOLUTE_HOURS * 60 * 60;

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_INACTIVITY_SECONDS,
    updateAge: 60,
  },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name:
        env.NODE_ENV === "production"
          ? "__Secure-asesoria.session-token"
          : "asesoria.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        ip: {},
        userAgent: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new AuthError("INVALID_INPUT", "Datos invalidos");
        }
        const { email, password, ip, userAgent } = parsed.data;
        const normalizedPassword = password.normalize("NFC").replace(/^\s+|\s+$/g, "");

        const hash = emailHash(email);
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.emailHash, hash))
          .limit(1);

        if (!user || user.deletedAt) {
          throw new AuthError("INVALID_CREDENTIALS", "Credenciales incorrectas");
        }

        const passwordOk = await verifyPassword(user.passwordHash, normalizedPassword);
        if (!passwordOk) {
          await logAudit({
            userId: user.id,
            accion: "LOGIN_FAIL",
            ip: ip ?? null,
            userAgent: userAgent ?? null,
            metadata: { reason: "bad_password" },
          });
          throw new AuthError("INVALID_CREDENTIALS", "Credenciales incorrectas");
        }

        await db
          .update(schema.users)
          .set({
            lastLoginIp: ip ?? null,
            lastLoginAt: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockedUntil: null,
          })
          .where(eq(schema.users.id, user.id));
        await logAudit({
          userId: user.id,
          accion: "LOGIN_OK",
          ip: ip ?? null,
          userAgent: userAgent ?? null,
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          twoFactorEnabled: false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id as string;
        token.role = (user as { role: string }).role;
        token.twoFactorEnabled = false;
        token.absExp = Math.floor(Date.now() / 1000) + SESSION_ABSOLUTE_SECONDS;
      }

      const absExp = (token.absExp as number | undefined) ?? 0;
      if (absExp && absExp < Math.floor(Date.now() / 1000)) {
        return { ...token, error: "AbsoluteSessionExpired" };
      }

      if (trigger === "update" && token.userId) {
        const [u] = await db
          .select({ role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, token.userId as string))
          .limit(1);
        if (u) {
          token.role = u.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error) {
        return { ...session, expires: new Date(0).toISOString() };
      }
      session.user = {
        ...session.user,
        id: token.userId as string,
        role: token.role as "SUPER_ADMIN" | "ADMIN" | "CLIENT",
        twoFactorEnabled: false,
      };
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isAuth = Boolean(auth?.user?.id);
      const path = nextUrl.pathname;
      const role = auth?.user?.role;

      const protectedRoutes = ["/admin", "/panel", "/api/protected"];
      const requiresAuth = protectedRoutes.some((p) => path.startsWith(p));
      if (!requiresAuth) return true;
      if (!isAuth) return false;

      if (path.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return Response.redirect(new URL("/panel", nextUrl));
      }
      if (path.startsWith("/panel") && role !== "CLIENT") {
        return Response.redirect(new URL("/admin", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
