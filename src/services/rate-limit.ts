/**
 * Rate limiting con Upstash Redis (sliding window).
 *
 * - Por IP: 100 req/min global.
 * - Por IP: 10 req/min en endpoints sensibles (login, registro, recuperacion).
 *
 * En desarrollo, si UPSTASH_REDIS_REST_URL no esta configurado, el limiter
 * pasa siempre (permite trabajar offline). En produccion la validacion Zod
 * de env.ts ya exige las credenciales.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

let redis: Redis | null = null;
let globalLimiter: Ratelimit | null = null;
let authLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

export function getGlobalLimiter(): Ratelimit | null {
  if (globalLimiter) return globalLimiter;
  const r = getRedis();
  if (!r) return null;
  globalLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "rl:global",
  });
  return globalLimiter;
}

export function getAuthLimiter(): Ratelimit | null {
  if (authLimiter) return authLimiter;
  const r = getRedis();
  if (!r) return null;
  authLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "rl:auth",
  });
  return authLimiter;
}

export type RateLimitKind = "global" | "auth";

/**
 * Helper de uso desde Server Actions / route handlers.
 * @returns objeto con success y limites; success=true si no hay limiter (dev).
 */
export async function checkRateLimit(
  kind: RateLimitKind,
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = kind === "auth" ? getAuthLimiter() : getGlobalLimiter();
  if (!limiter) {
    return { success: true, remaining: 999, reset: 0 };
  }
  const res = await limiter.limit(identifier);
  return { success: res.success, remaining: res.remaining, reset: res.reset };
}
