import { describe, expect, it, beforeAll } from "vitest";

describe("crypto.encryptField/decryptField", () => {
  beforeAll(() => {
    // claves dummy para los tests (32 bytes en base64)
    process.env.TURSO_DATABASE_URL = "libsql://test.example.com";
    process.env.TURSO_AUTH_TOKEN = "test";
    process.env.ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    process.env.SEARCH_HMAC_KEY = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
    process.env.NEXTAUTH_SECRET = "0123456789abcdef0123456789abcdef0123456789ab";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.APP_URL = "http://localhost:3000";
  });

  it("roundtrip", async () => {
    const { encryptField, decryptField, searchHash, emailHash } = await import("@/lib/crypto");
    const value = "12345678Z";
    const enc = encryptField(value);
    expect(enc).not.toBe(value);
    expect(decryptField(enc)).toBe(value);
  });

  it("hash determinista", async () => {
    const { searchHash } = await import("@/lib/crypto");
    expect(searchHash("12345678z")).toBe(searchHash("12345678Z "));
    expect(searchHash("ABC")).not.toBe(searchHash("XYZ"));
  });

  it("emailHash insensible a mayusculas", async () => {
    const { emailHash } = await import("@/lib/crypto");
    expect(emailHash("Foo@bar.com")).toBe(emailHash("foo@bar.com"));
  });
});
