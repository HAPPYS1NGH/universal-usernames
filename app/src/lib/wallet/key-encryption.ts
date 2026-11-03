import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Address, Hex } from "viem";

// AES-256-GCM. The wallet address is bound as additional authenticated data,
// so a ciphertext copied onto another wallet row fails to decrypt.

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export type EncryptedPrivateKey = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function addressAad(address: Address): Buffer {
  return Buffer.from(address.toLowerCase(), "utf8");
}

export function encryptPrivateKey(privateKey: Hex, address: Address, key: Buffer): EncryptedPrivateKey {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(addressAad(address));
  const ciphertext = Buffer.concat([cipher.update(privateKey.slice(2), "hex"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

// Only the wallet:sweep script calls this, to recover funds. The web app
// never decrypts keys.
export function decryptPrivateKey(encrypted: EncryptedPrivateKey, address: Address, key: Buffer): Hex {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encrypted.iv, "hex"));
  decipher.setAAD(addressAad(address));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, "hex")), decipher.final()]);
  return `0x${plaintext.toString("hex")}`;
}
