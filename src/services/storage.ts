/**
 * Almacenamiento de archivos en Vercel Blob.
 *
 * Modelo de cifrado:
 *   - El archivo se cifra con AES-256-GCM en el servidor antes de subir.
 *   - El "blob" en Vercel es texto plano CIFRADO (binario opaco). El nombre
 *     incluye un UUID, no el original.
 *   - Para descargar/previsualizar, este servicio descifra y sirve el binario
 *     desde una route handler privada.
 *
 * Formato del blob: nonce(12) || ciphertext || tag(16). Mismo formato que
 * src/lib/crypto.ts pero a nivel de fichero (Uint8Array directo).
 */
import { put, del } from "@vercel/blob";
import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { env } from "@/lib/env";

function getKey(): Uint8Array {
  const buf = Buffer.from(env.ENCRYPTION_KEY, "base64");
  return new Uint8Array(buf);
}

export interface UploadedBlob {
  pathname: string;
  url: string;
  sha256: string;
  size: number;
}

export async function encryptAndUpload(
  data: ArrayBuffer,
  pathname: string,
): Promise<UploadedBlob> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN no configurado");
  }
  const plain = new Uint8Array(data);
  const hash = bytesToHex(sha256(plain));
  const nonce = randomBytes(12);
  const cipher = gcm(getKey(), nonce);
  const ct = cipher.encrypt(plain);
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce, 0);
  out.set(ct, nonce.length);

  const result = await put(pathname, Buffer.from(out), {
    access: "public", // contenido cifrado: el blob NO sirve plaintext
    addRandomSuffix: false,
    contentType: "application/octet-stream",
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  return {
    pathname: result.pathname,
    url: result.url,
    sha256: hash,
    size: plain.length,
  };
}

export async function downloadAndDecrypt(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Blob fetch failed (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 12 + 16) throw new Error("Blob corrupto");
  const nonce = buf.slice(0, 12);
  const ct = buf.slice(12);
  return gcm(getKey(), nonce).decrypt(ct);
}

export async function deleteBlob(url: string): Promise<void> {
  if (!env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    console.error("[blob] delete fail:", err);
  }
}
