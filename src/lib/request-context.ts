/**
 * Helpers para extraer IP y User-Agent en Server Actions / route handlers.
 * Tras Vercel + Cloudflare priorizamos x-forwarded-for / cf-connecting-ip.
 */
import { headers } from "next/headers";

export async function getRequestMeta(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "0.0.0.0";
  const userAgent = h.get("user-agent") ?? "";
  return { ip, userAgent };
}
