import Database from "better-sqlite3";
import type { Db } from "@/lib/db/connection";
import { STARTING_CASH_CENTS } from "@/lib/portfolio/pnl";
import { generateEmbeddedWallet, insertEmbeddedWallet } from "@/lib/wallet/embedded-wallet";

export type CreateAccountResult = { ok: true; userId: number } | { ok: false; reason: "username_taken" };

type NewAccount = {
  username: string;
  passwordHash: string;
  walletEncryptionKey: Buffer;
  createdAt?: number;
};

// Creates the user, their starting cash and their embedded wallet in one transaction.
export function createAccount(db: Db, account: NewAccount): CreateAccountResult {
  const wallet = generateEmbeddedWallet(account.walletEncryptionKey);
  try {
    return db
      .transaction((): CreateAccountResult => {
        const { lastInsertRowid } = db
          .prepare("INSERT INTO users (username, password_hash, cash_cents, created_at) VALUES (?, ?, ?, ?)")
          .run(account.username, account.passwordHash, STARTING_CASH_CENTS, account.createdAt ?? Date.now());
        const userId = Number(lastInsertRowid);
        insertEmbeddedWallet(db, userId, wallet);
        return { ok: true, userId };
      })
      .immediate();
  } catch (error) {
    if (error instanceof Database.SqliteError && error.message.includes("users.username")) {
      return { ok: false, reason: "username_taken" };
    }
    throw error;
  }
}

export type AccountCredentials = { userId: number; passwordHash: string };

export function findAccountCredentials(db: Db, username: string): AccountCredentials | null {
  const row = db
    .prepare<[string], AccountCredentials>("SELECT id AS userId, password_hash AS passwordHash FROM users WHERE username = ?")
    .get(username);
  return row ?? null;
}

export function usernameExists(db: Db, username: string): boolean {
  return db.prepare("SELECT 1 FROM users WHERE username = ?").get(username) !== undefined;
}
