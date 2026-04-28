/**
 * Verificacion de Cloudflare Turnstile (CAPTCHA invisible/managed).
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * En desarrollo, sin TURNSTILE_SECRET_KEY, devuelve siempre true.
 */
import { env } from "@/lib/env";

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  // Sin secret configurado: CAPTCHA deshabilitado (cualquier entorno).
  // El operador puede activarlo en cualquier momento anyadiendo TURNSTILE_*.
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[turnstile] respuesta HTTP", res.status);
    return false;
  }
  const data = (await res.json()) as TurnstileResponse;
  if (!data.success) {
    console.warn("[turnstile] verificacion fallida:", data["error-codes"]);
  }
  return data.success;
}
