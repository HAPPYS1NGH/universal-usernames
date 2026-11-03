import { randomBytes } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { decryptPrivateKey, encryptPrivateKey } from "@/lib/wallet/key-encryption";

const key = randomBytes(32);
const privateKey = generatePrivateKey();
const { address } = privateKeyToAccount(privateKey);

describe("wallet key encryption", () => {
  it("round-trips a private key", () => {
    const encrypted = encryptPrivateKey(privateKey, address, key);
    expect(decryptPrivateKey(encrypted, address, key)).toBe(privateKey);
  });

  it("never stores the key in plaintext and uses a fresh IV each time", () => {
    const first = encryptPrivateKey(privateKey, address, key);
    const second = encryptPrivateKey(privateKey, address, key);
    expect(first.ciphertext).not.toContain(privateKey.slice(2));
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("fails with the wrong encryption key", () => {
    const encrypted = encryptPrivateKey(privateKey, address, key);
    expect(() => decryptPrivateKey(encrypted, address, randomBytes(32))).toThrow();
  });

  it("fails when the ciphertext is moved to another address", () => {
    const encrypted = encryptPrivateKey(privateKey, address, key);
    const other = privateKeyToAccount(generatePrivateKey()).address;
    expect(() => decryptPrivateKey(encrypted, other, key)).toThrow();
  });
});
