import { describe, expect, it } from "vitest";
import { checkFile } from "@/services/file-detect";

const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
const ZIP_HEAD = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const FAKE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // EXE/MZ

describe("checkFile", () => {
  it("rechaza ejecutables", () => {
    expect(checkFile("malware.exe", FAKE, 100, 1024 * 1024).ok).toBe(false);
  });
  it("acepta PDF", () => {
    expect(checkFile("renta.pdf", PDF_HEAD, 100, 1024 * 1024).ok).toBe(true);
  });
  it("acepta PNG", () => {
    expect(checkFile("captura.png", PNG_HEAD, 100, 1024 * 1024).ok).toBe(true);
  });
  it("acepta DOCX (zip container)", () => {
    expect(checkFile("contrato.docx", ZIP_HEAD, 100, 1024 * 1024).ok).toBe(true);
  });
  it("rechaza tamanyo excesivo", () => {
    expect(checkFile("renta.pdf", PDF_HEAD, 60 * 1024 * 1024, 50 * 1024 * 1024).ok).toBe(false);
  });
  it("rechaza magic distinto", () => {
    expect(checkFile("falso.pdf", PNG_HEAD, 100, 1024 * 1024).ok).toBe(false);
  });
});
