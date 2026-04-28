/**
 * Validacion oficial de DNI / NIE / CIF (BOE).
 * - DNI: 8 cifras + letra de control.
 * - NIE: prefijo X/Y/Z + 7 cifras + letra de control.
 * - CIF: letra entidad + 7 cifras (ultima es digito o letra de control).
 *
 * Algoritmos:
 * - DNI/NIE: letra = "TRWAGMYFPDXBNJZSQVHLCKE"[numero mod 23]
 * - CIF: control segun BOE-A-2008-739 (Real Decreto 1065/2007).
 *
 * Todas las funciones son puras y aceptan formato con o sin guiones/espacios.
 */

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_LETTERS = "JABCDEFGHI";
// Letras CIF que SOLO admiten letra de control (no digito): N, P, Q, R, S, W.
const CIF_LETTER_ONLY = new Set(["N", "P", "Q", "R", "S", "W"]);
// Letras CIF que SOLO admiten digito de control (no letra): A, B, E, H.
const CIF_DIGIT_ONLY = new Set(["A", "B", "E", "H"]);

function clean(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidDNI(input: string): boolean {
  const v = clean(input);
  if (!/^\d{8}[A-Z]$/.test(v)) return false;
  const num = parseInt(v.slice(0, 8), 10);
  const expected = DNI_LETTERS[num % 23];
  return v[8] === expected;
}

export function isValidNIE(input: string): boolean {
  const v = clean(input);
  if (!/^[XYZ]\d{7}[A-Z]$/.test(v)) return false;
  const prefix = v[0] === "X" ? "0" : v[0] === "Y" ? "1" : "2";
  const num = parseInt(prefix + v.slice(1, 8), 10);
  const expected = DNI_LETTERS[num % 23];
  return v[8] === expected;
}

export function isValidCIF(input: string): boolean {
  const v = clean(input);
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return false;

  const orgLetter = v[0]!;
  const digits = v.slice(1, 8);
  const control = v[8]!;

  let sumPares = 0;
  let sumImpares = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseInt(digits[i]!, 10);
    if ((i + 1) % 2 === 0) {
      sumPares += d;
    } else {
      const doubled = d * 2;
      sumImpares += Math.floor(doubled / 10) + (doubled % 10);
    }
  }

  const total = sumPares + sumImpares;
  const unidad = total % 10;
  const controlDigit = unidad === 0 ? 0 : 10 - unidad;
  const controlLetter = CIF_LETTERS[controlDigit];

  if (CIF_LETTER_ONLY.has(orgLetter)) {
    return control === controlLetter;
  }
  if (CIF_DIGIT_ONLY.has(orgLetter)) {
    return control === String(controlDigit);
  }
  return control === String(controlDigit) || control === controlLetter;
}

export type SpanishIdKind = "DNI" | "NIE" | "CIF";

export function detectAndValidate(input: string): { valid: boolean; kind?: SpanishIdKind } {
  const v = clean(input);
  if (/^\d{8}[A-Z]$/.test(v)) return { valid: isValidDNI(v), kind: "DNI" };
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) return { valid: isValidNIE(v), kind: "NIE" };
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return { valid: isValidCIF(v), kind: "CIF" };
  return { valid: false };
}

/** Valida IBAN espanol (24 caracteres) con MOD-97. */
export function isValidIBAN_ES(input: string): boolean {
  const v = clean(input);
  if (!/^ES\d{22}$/.test(v)) return false;
  const rearranged = v.slice(4) + v.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((c) => (c >= "A" && c <= "Z" ? (c.charCodeAt(0) - 55).toString() : c))
    .join("");
  // MOD-97 con BigInt para evitar overflow.
  return BigInt(numeric) % 97n === 1n;
}
