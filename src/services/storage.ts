/**
 * Almacenamiento de archivos en Vercel Blob (store privado).
 *
 * Modelo de cifrado:
 *   - El archivo se cifra con AES-256-GCM en el servidor antes de subir.
 *   - El blob es binario cifrado opaco; aunque alguien obtuviera la URL,
 *     no podría leer el contenido sin la clave maestra.
 *   - El store es PRIVADO en Vercel Blob: las URLs requieren token para
 *     descargarse. Servimos el binario descifrado desde una route handler
 *     autenticada (`/api/files/[id]`).
 *
 * Formato del blob: nonce(12) || ciphertext || tag(16). Mismo formato que
 * src/lib/crypto.ts pero a nivel de fichero (Uint8Array directo).
 */
import { put, del, head } from "@vercel/blob";
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

  // El store es privado: las URLs requieren autenticacion para descargarse.
  const result = await put(pathname, Buffer.from(out), {
    access: "private",
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

/**
 * En stores privados la URL devuelta por put() requiere autenticacion, asi
 * que pedimos primero un downloadUrl firmado via head() y descargamos eso.
 */
export async function downloadAndDecrypt(url: string): Promise<Uint8Array> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN no configurado");
  }
  let fetchUrl = url;
  try {
    const meta = await head(url, { token: env.BLOB_READ_WRITE_TOKEN });
    if (meta?.downloadUrl) fetchUrl = meta.downloadUrl;
  } catch {
    // Si head() falla (blob legacy o mismatched store), intentamos con
    // Authorization: Bearer ... directo sobre la URL original.
  }

  const res = await fetch(fetchUrl, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${env.BLOB_READ_WRITE_TOKEN}` },
  });
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
