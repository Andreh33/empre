/**
 * Middleware Next.js (Edge): valida sesion + rol y aplica rate-limit global
 * por IP (100 req/min). Los limiters de auth se aplican en las Server Actions.
 *
 * Importante: NO importar @/db ni argon2 aqui - son incompatibles con Edge.
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { edgeAuthConfig } from "@/auth/edge";

const { auth: middlewareAuth } = NextAuth(edgeAuthConfig);

export default middlewareAuth(async (req) => {
  // Auth callback ya redirige si la ruta esta protegida y no hay sesion.
  // Añadimos cabeceras de seguridad y exponemos el pathname para layouts.
  const res = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers),
        "x-pathname": req.nextUrl.pathname,
      }),
    },
  });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
});

export const config = {
  matcher: [
    // Excluimos estaticos y assets de Next.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
