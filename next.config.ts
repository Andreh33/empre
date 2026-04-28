import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad globales.
 *
 * CSP: estricta. Permite blob/data para previsualizacion de PDFs/imagenes
 * locales y conexion a Vercel Blob, Turso y Turnstile.
 * Si en el futuro añades dominios CDN o analytics, ampliar las directivas.
 */
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.turso.io https://api.resend.com https://challenges.cloudflare.com https://*.upstash.io https://*.public.blob.vercel-storage.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Acciones de servidor con limite ampliado para subida de archivos.
    serverActions: { bodySizeLimit: "55mb" },
  },
  // Argon2 y libsql usan binarios nativos: hay que excluirlos del bundle.
  serverExternalPackages: ["argon2", "@libsql/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
