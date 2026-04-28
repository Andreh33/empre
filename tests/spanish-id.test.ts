import { describe, expect, it } from "vitest";
import {
  detectAndValidate,
  isValidCIF,
  isValidDNI,
  isValidIBAN_ES,
  isValidNIE,
} from "@/lib/spanish-id";

describe("DNI / NIE / CIF", () => {
  it("DNI valido", () => {
    expect(isValidDNI("12345678Z")).toBe(true);
    expect(isValidDNI("00000000T")).toBe(true);
  });
  it("DNI invalido", () => {
    expect(isValidDNI("12345678A")).toBe(false);
    expect(isValidDNI("1234567")).toBe(false);
  });
  it("NIE valido", () => {
    expect(isValidNIE("X1234567L")).toBe(true);
    expect(isValidNIE("Y0000000Z")).toBe(true);
  });
  it("CIF valido (entidades varias)", () => {
    expect(isValidCIF("A58818501")).toBe(true);
    expect(isValidCIF("B83246314")).toBe(true);
  });
  it("CIF invalido", () => {
    expect(isValidCIF("A11111111")).toBe(false);
  });
  it("IBAN ES valido", () => {
    expect(isValidIBAN_ES("ES7921000813610123456789")).toBe(true);
  });
  it("IBAN ES invalido", () => {
    expect(isValidIBAN_ES("ES0000000000000000000000")).toBe(false);
    expect(isValidIBAN_ES("FR1420041010050500013M02606")).toBe(false);
  });
  it("detectAndValidate", () => {
    expect(detectAndValidate("12345678Z").kind).toBe("DNI");
    expect(detectAndValidate("X1234567L").kind).toBe("NIE");
    expect(detectAndValidate("A58818501").kind).toBe("CIF");
    expect(detectAndValidate("foo").valid).toBe(false);
  });
});
