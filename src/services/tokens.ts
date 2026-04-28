/**
 * Generacion y verificacion de tokens unicos (verificacion email,
 * reset password). El token plano se envia al usuario por email; en BBDD
 * solo guardamos un hash SHA-256 para que un dump de DB no permita usarlos.
 */
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { randomBytes } from "@noble/ciphers/webcrypto";

/**
 * Token aleatorio criptograficamente seguro (URL-safe).
 * 32 bytes = 256 bits de entropia.
 */
export function generateToken(): string {
  const bytes = randomBytes(32);
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function hashToken(plain: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(plain)));
}

export function isExpired(expiresAtIso: string): boolean {
  return new Date(expiresAtIso).getTime() < Date.now();
}

export function isoFromNow(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}
