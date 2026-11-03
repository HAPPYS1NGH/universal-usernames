import { randomBytes } from "node:crypto";
import { createAccount } from "@/lib/accounts/accounts";
import { openDatabase, type Db } from "@/lib/db/connection";

export const TEST_ENCRYPTION_KEY = randomBytes(32);

export function createTestDb(): Db {
  return openDatabase(":memory:");
}

export function createTestUser(db: Db, username: string): number {
  const result = createAccount(db, {
    username,
    passwordHash: "test-only-hash",
    walletEncryptionKey: TEST_ENCRYPTION_KEY,
  });
  if (!result.ok) throw new Error(`Could not create test user ${username}`);
  return result.userId;
}

export function cashOf(db: Db, userId: number): number {
  const row = db.prepare<[number], { cash: number }>("SELECT cash_cents AS cash FROM users WHERE id = ?").get(userId);
  if (!row) throw new Error(`No user ${userId}`);
  return row.cash;
}
