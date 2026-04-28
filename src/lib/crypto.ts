/**
 * Cifrado simetrico de campos sensibles (DNI, IBAN, NSS, CIF, secretos 2FA).
 *
 * - Algoritmo: AES-256-GCM (autenticado, sin padding).
 * - Clave: ENCRYPTION_KEY (32 bytes base64).
 * - Nonce: 12 bytes aleatorios por cifrado, prependido al ciphertext.
 * - Formato persistido (base64): nonce(12) || ciphertext || tag(16).
 *
 * Para busqueda determinista (DNI, email) usamos HMAC-SHA256 con SEARCH_HMAC_KEY.
 * Asi evitamos cifrado determinista (vulnerable a analisis de frecuencia)
 * y mantenemos lookups O(log n) por indice.
 *
 * Rotacion: si en el futuro hace falta rotar ENCRYPTION_KEY, el formato
 * deberia añadir un byte de "key version" delante. Por ahora 1 sola clave.
 */
import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { env } from "./env";

const NONCE_BYTES = 12;

let cachedEncKey: Uint8Array | null = null;
let cachedHmacKey: Uint8Array | null = null;

function getEncKey(): Uint8Array {
  if (!cachedEncKey) {
    const buf = Buffer.from(env.ENCRYPTION_KEY, "base64");
    if (buf.length !== 32) {
      throw new Error("ENCRYPTION_KEY debe ser 32 bytes en base64");
    }
    cachedEncKey = new Uint8Array(buf);
  }
  return cachedEncKey;
}

function getHmacKey(): Uint8Array {
  if (!cachedHmacKey) {
    const buf = Buffer.from(env.SEARCH_HMAC_KEY, "base64");
    if (buf.length !== 32) {
      throw new Error("SEARCH_HMAC_KEY debe ser 32 bytes en base64");
    }
    cachedHmacKey = new Uint8Array(buf);
  }
  return cachedHmacKey;
}

/**
 * Cifra una cadena en texto plano y devuelve base64 (nonce || ciphertext+tag).
 */
export function encryptField(plaintext: string): string {
  if (plaintext.length === 0) {
    throw new Error("encryptField: plaintext vacio");
  }
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = gcm(getEncKey(), nonce);
  const ct = cipher.encrypt(new TextEncoder().encode(plaintext));
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce, 0);
  out.set(ct, nonce.length);
  return Buffer.from(out).toString("base64");
}

/**
 * Descifra el formato producido por encryptField. Lanza si el tag no valida.
 */
export function decryptField(encoded: string): string {
  const buf = new Uint8Array(Buffer.from(encoded, "base64"));
  if (buf.length < NONCE_BYTES + 16) {
    throw new Error("decryptField: payload demasiado corto");
  }
  const nonce = buf.slice(0, NONCE_BYTES);
  const ct = buf.slice(NONCE_BYTES);
  const cipher = gcm(getEncKey(), nonce);
  const pt = cipher.decrypt(ct);
  return new TextDecoder().decode(pt);
}

/**
 * Hash determinista para busqueda (DNI, email...).
 * Normaliza a mayusculas y trim antes de hashear: "12345678z" == "12345678Z ".
 */
export function searchHash(input: string): string {
  const normalized = input.trim().toUpperCase();
  const mac = hmac(sha256, getHmacKey(), new TextEncoder().encode(normalized));
  return bytesToHex(mac);
}

/**
 * Hash de email: misma logica, pero forzando lowercase (RFC 5321).
 */
export function emailHash(email: string): string {
  const normalized = email.trim().toLowerCase();
  const mac = hmac(sha256, getHmacKey(), new TextEncoder().encode(normalized));
  return bytesToHex(mac);
}
