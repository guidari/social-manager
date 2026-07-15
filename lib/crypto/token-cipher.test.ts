import { randomBytes } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./token-cipher";

const TEST_KEY = randomBytes(32).toString("base64");

describe("encryptToken / decryptToken", () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  });

  it("round-trips a plaintext token", () => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    const plaintext = "ya29.a0AfH6SMC-example-access-token";
    const encrypted = encryptToken(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("never stores the plaintext inside the ciphertext payload", () => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    const plaintext = "super-secret-refresh-token";
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted).not.toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    const plaintext = "same-token-value";
    const first = encryptToken(plaintext);
    const second = encryptToken(plaintext);
    expect(first).not.toBe(second);
    expect(decryptToken(first)).toBe(plaintext);
    expect(decryptToken(second)).toBe(plaintext);
  });

  it("throws when decrypting with the wrong key", () => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    const encrypted = encryptToken("token-value");

    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptToken(encrypted)).toThrow();
  });

  it("throws when the ciphertext has been tampered with", () => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    const encrypted = encryptToken("token-value");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tamperedBuf = Buffer.from(ciphertext, "base64");
    tamperedBuf[0] ^= 0xff;
    const tampered = [iv, authTag, tamperedBuf.toString("base64")].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws on a malformed payload", () => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
    expect(() => decryptToken("not-a-valid-payload")).toThrow("Malformed encrypted token payload");
  });

  it("throws when TOKEN_ENCRYPTION_KEY is not set", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("token-value")).toThrow("TOKEN_ENCRYPTION_KEY is not set");
  });

  it("throws when TOKEN_ENCRYPTION_KEY does not decode to 32 bytes", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptToken("token-value")).toThrow(/must decode to 32 bytes/);
  });
});
