/**
 * Configuracion minima de Auth.js para usar en middleware (Edge).
 * No incluye providers (que requieren Node nativos como Argon2/libsql).
 * Solo se usa para LEER la cookie JWT y proteger rutas.
 */
import type { NextAuthConfig } from "next-auth";
import { env } from "@/lib/env";

export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
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
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isAuth = Boolean(auth?.user?.id);
      const role = auth?.user?.role;

      const isProtected =
        path.startsWith("/admin") || path.startsWith("/panel") || path.startsWith("/api/protected");
      if (!isProtected) return true;

      // /admin/login es publica para que los administradores accedan.
      if (path === "/admin/login" || path.startsWith("/admin/login/")) return true;

      if (!isAuth) {
        const target = path.startsWith("/admin") ? "/admin/login" : "/login";
        const url = new URL(target, request.nextUrl);
        url.searchParams.set("callbackUrl", request.nextUrl.pathname);
        return Response.redirect(url);
      }

      if (path.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return Response.redirect(new URL("/panel", request.nextUrl));
      }
      if (path.startsWith("/panel") && role !== "CLIENT") {
        return Response.redirect(new URL("/admin", request.nextUrl));
      }
      return true;
    },
  },
};
