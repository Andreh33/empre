/**
 * 2FA TOTP usando otplib v13 (clase OTP unificada) + qrcode.
 * El secreto se cifra con AES-GCM antes de persistir.
 */
import { OTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { encryptField, decryptField } from "@/lib/crypto";

const otp = new OTP({
  strategy: "totp",
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

export function generateTotpSecret(): string {
  return otp.generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return otp.generateURI({ secret, label: email, issuer: env.APP_NAME });
}

export async function generateTotpQrDataUrl(email: string, secret: string): Promise<string> {
  const uri = buildTotpUri(email, secret);
  return QRCode.toDataURL(uri, { width: 256, margin: 1 });
}

/**
 * Tolerancia +/-1 paso (~30s) para compensar relojes desfasados.
 * verifySync exige el plugin sincrono (NobleCryptoPlugin lo soporta).
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const result = otp.verifySync({ secret, token: code, epochTolerance: 1 });
  return result.valid;
}

export function encryptTotpSecret(secret: string): string {
  return encryptField(secret);
}

export function decryptTotpSecret(encrypted: string): string {
  return decryptField(encrypted);
}
