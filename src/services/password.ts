/**
 * Hash y verificacion de contrasenyas con Argon2id.
 *
 * Parametros: el preset de la libreria por defecto (Argon2id, t=3, m=64MB, p=4)
 * cumple OWASP 2023. Si el servidor de produccion tiene <= 1 vCPU, considerar
 * bajar memoryCost a 32 MB. Los binarios nativos requieren bindings C/C++.
 */
import argon2 from "argon2";
import { z } from "zod";

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Politica de contrasenyas: minimo 12 caracteres, mayusculas, minusculas,
 * numeros y simbolos. Aplica en cliente y servidor (Zod compartido).
 */
export const passwordSchema = z
  .string()
  .min(12, "Minimo 12 caracteres")
  .max(128, "Maximo 128 caracteres")
  .refine((v) => /[a-z]/.test(v), "Debe contener al menos una minuscula")
  .refine((v) => /[A-Z]/.test(v), "Debe contener al menos una mayuscula")
  .refine((v) => /\d/.test(v), "Debe contener al menos un numero")
  .refine(
    (v) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(v),
    "Debe contener al menos un simbolo",
  );
