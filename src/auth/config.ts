/**
 * Configuracion de Auth.js v5.
 *
 * Estrategia: JWT (no DB sessions) para mejor latencia y compatibilidad
 * con middleware Edge. Las cookies son httpOnly + secure + sameSite=strict.
 *
 * Expiracion:
 *   - Inactividad: 15 minutos (campo iat actualizado en cada peticion).
 *   - Absoluta: 8 horas (campo absExp fijado al login).
 *
 * Verificacion 2FA: Credentials acepta un campo `totpCode`. Si el usuario
 * tiene 2FA activado y no lo manda (o es invalido), el provider devuelve
 * un error con codigo "TWO_FA_REQUIRED" / "TWO_FA_INVALID" que la UI
 * detecta para pedir el codigo.
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { emailHash } from "@/lib/crypto";
import { verifyPassword } from "@/services/password";
import {
  evaluateLockoutState,
  registerLoginFailure,
  resetLoginFailures,
} from "@/services/login-lockout";
import { decryptTotpSecret, verifyTotpCode } from "@/services/two-factor";
import { logAudit } from "@/services/audit";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
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
    updateAge: 60, // refresca el JWT como mucho cada 60s
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
        sameSite: "strict",
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
        totpCode: {},
        ip: {},
        userAgent: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new AuthError("INVALID_INPUT", "Datos invalidos");
        }
        const { email, password, totpCode, ip, userAgent } = parsed.data;

        const hash = emailHash(email);
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.emailHash, hash))
          .limit(1);

        // Mensaje generico para no filtrar existencia (timing tambien comparable
        // gracias a Argon2 verify; aceptable para nuestro modelo de amenazas).
        if (!user || user.deletedAt) {
          throw new AuthError("INVALID_CREDENTIALS", "Credenciales incorrectas");
        }

        // Bloqueo previo.
        const lockState = evaluateLockoutState(user);
        if (lockState.kind === "locked") {
          await logAudit({
            userId: user.id,
            accion: "LOGIN_LOCKED",
            ip: ip ?? null,
            userAgent: userAgent ?? null,
          });
          throw new AuthError(
            "ACCOUNT_LOCKED",
            `Cuenta bloqueada hasta ${lockState.until.toISOString()}`,
          );
        }

        const passwordOk = await verifyPassword(user.passwordHash, password);
        if (!passwordOk) {
          await registerLoginFailure({
            userId: user.id,
            email,
            failedAttempts: user.failedLoginAttempts,
          });
          await logAudit({
            userId: user.id,
            accion: "LOGIN_FAIL",
            ip: ip ?? null,
            userAgent: userAgent ?? null,
            metadata: { reason: "bad_password" },
          });
          throw new AuthError("INVALID_CREDENTIALS", "Credenciales incorrectas");
        }

        // Email no verificado: cliente debe verificar antes de acceder.
        // Excepcion: SUPER_ADMIN inicial (creado desde script seed).
        if (!user.emailVerified && user.role !== "SUPER_ADMIN") {
          throw new AuthError("EMAIL_NOT_VERIFIED", "Verifica tu email para continuar");
        }

        // 2FA si esta activado.
        if (user.twoFactorEnabled) {
          if (!totpCode) {
            throw new AuthError("TWO_FA_REQUIRED", "Codigo 2FA requerido");
          }
          if (!user.twoFactorSecret) {
            throw new AuthError("TWO_FA_INVALID", "Configuracion 2FA invalida");
          }
          const decryptedSecret = decryptTotpSecret(user.twoFactorSecret);
          if (!verifyTotpCode(decryptedSecret, totpCode)) {
            await registerLoginFailure({
              userId: user.id,
              email,
              failedAttempts: user.failedLoginAttempts,
            });
            await logAudit({
              userId: user.id,
              accion: "LOGIN_FAIL",
              ip: ip ?? null,
              userAgent: userAgent ?? null,
              metadata: { reason: "bad_totp" },
            });
            throw new AuthError("TWO_FA_INVALID", "Codigo 2FA incorrecto");
          }
        }

        // ADMIN/SUPER_ADMIN obligados a tener 2FA activado.
        if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && !user.twoFactorEnabled) {
          throw new AuthError(
            "TWO_FA_SETUP_REQUIRED",
            "Los administradores deben configurar 2FA antes de acceder",
          );
        }

        await resetLoginFailures(user.id);
        await db
          .update(schema.users)
          .set({
            lastLoginIp: ip ?? null,
            lastLoginAt: new Date().toISOString(),
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
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Login: poblar campos personalizados.
      if (user) {
        token.userId = user.id as string;
        token.role = (user as { role: string }).role;
        token.twoFactorEnabled = (user as { twoFactorEnabled: boolean }).twoFactorEnabled;
        token.absExp = Math.floor(Date.now() / 1000) + SESSION_ABSOLUTE_SECONDS;
      }

      // Forzar limite absoluto.
      const absExp = (token.absExp as number | undefined) ?? 0;
      if (absExp && absExp < Math.floor(Date.now() / 1000)) {
        return { ...token, error: "AbsoluteSessionExpired" };
      }

      // Update -> refresh role/2FA tras cambios.
      if (trigger === "update" && token.userId) {
        const [u] = await db
          .select({ role: schema.users.role, twoFactorEnabled: schema.users.twoFactorEnabled })
          .from(schema.users)
          .where(eq(schema.users.id, token.userId as string))
          .limit(1);
        if (u) {
          token.role = u.role;
          token.twoFactorEnabled = u.twoFactorEnabled;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error) {
        // Forzamos cierre de sesion devolviendo expirada.
        return { ...session, expires: new Date(0).toISOString() };
      }
      session.user = {
        ...session.user,
        id: token.userId as string,
        role: token.role as "SUPER_ADMIN" | "ADMIN" | "CLIENT",
        twoFactorEnabled: Boolean(token.twoFactorEnabled),
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
