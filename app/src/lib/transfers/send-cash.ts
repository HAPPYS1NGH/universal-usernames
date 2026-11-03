import type { Db } from "@/lib/db/connection";

export type SendCashRequest = {
  fromUserId: number;
  toUsername: string;
  amountCents: number;
  sentAt?: number;
};

export type SendCashResult =
  | { ok: true; transferId: number; recipientUsername: string }
  | { ok: false; reason: "invalid_amount" | "unknown_recipient" | "self_send" | "insufficient_funds" };

// In-app transfer of demo USD between usernames. Only works inside this app:
// the username lives in this database and nowhere else.
export function sendCash(db: Db, request: SendCashRequest): SendCashResult {
  const { fromUserId, toUsername, amountCents } = request;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  return db
    .transaction((): SendCashResult => {
      const recipient = db
        .prepare<[string], { id: number }>("SELECT id FROM users WHERE username = ?")
        .get(toUsername);
      if (!recipient) return { ok: false, reason: "unknown_recipient" };
      if (recipient.id === fromUserId) return { ok: false, reason: "self_send" };

      const debit = db
        .prepare("UPDATE users SET cash_cents = cash_cents - ? WHERE id = ? AND cash_cents >= ?")
        .run(amountCents, fromUserId, amountCents);
      if (debit.changes === 0) return { ok: false, reason: "insufficient_funds" };

      db.prepare("UPDATE users SET cash_cents = cash_cents + ? WHERE id = ?").run(amountCents, recipient.id);
      const { lastInsertRowid } = db
        .prepare("INSERT INTO transfers (from_user_id, to_user_id, amount_cents, created_at) VALUES (?, ?, ?, ?)")
        .run(fromUserId, recipient.id, amountCents, request.sentAt ?? Date.now());

      return { ok: true, transferId: Number(lastInsertRowid), recipientUsername: toUsername };
    })
    .immediate();
}
