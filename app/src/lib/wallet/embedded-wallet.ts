import type { Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Db } from "@/lib/db/connection";
import { encryptPrivateKey, type EncryptedPrivateKey } from "./key-encryption";

export type NewEmbeddedWallet = {
  address: Address;
  encryptedKey: EncryptedPrivateKey;
};

// The plaintext key exists only inside this function.
export function generateEmbeddedWallet(encryptionKey: Buffer): NewEmbeddedWallet {
  const privateKey = generatePrivateKey();
  const { address } = privateKeyToAccount(privateKey);
  return { address, encryptedKey: encryptPrivateKey(privateKey, address, encryptionKey) };
}

export function insertEmbeddedWallet(db: Db, userId: number, wallet: NewEmbeddedWallet): void {
  db.prepare(
    `INSERT INTO wallets (user_id, address, key_ciphertext, key_iv, key_auth_tag, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    wallet.address,
    wallet.encryptedKey.ciphertext,
    wallet.encryptedKey.iv,
    wallet.encryptedKey.authTag,
    Date.now(),
  );
}

export function getWalletAddress(db: Db, userId: number): Address | null {
  const row = db.prepare<[number], { address: Address }>("SELECT address FROM wallets WHERE user_id = ?").get(userId);
  return row?.address ?? null;
}

export type StoredEmbeddedWallet = { address: Address; encryptedKey: EncryptedPrivateKey };

type StoredWalletRow = { address: Address; ciphertext: string; iv: string; authTag: string };

export function getStoredWalletByUsername(db: Db, username: string): StoredEmbeddedWallet | null {
  const row = db
    .prepare<[string], StoredWalletRow>(
      `SELECT w.address, w.key_ciphertext AS ciphertext, w.key_iv AS iv, w.key_auth_tag AS authTag
       FROM wallets w JOIN users u ON u.id = w.user_id
       WHERE u.username = ?`,
    )
    .get(username);
  if (!row) return null;
  return { address: row.address, encryptedKey: { ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag } };
}
