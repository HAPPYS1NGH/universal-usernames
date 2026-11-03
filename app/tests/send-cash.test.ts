import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/connection";
import { STARTING_CASH_CENTS } from "@/lib/portfolio/pnl";
import { sendCash } from "@/lib/transfers/send-cash";
import { cashOf, createTestDb, createTestUser } from "./helpers/test-db";

describe("sendCash", () => {
  let db: Db;
  let alice: number;
  let bob: number;

  beforeEach(() => {
    db = createTestDb();
    alice = createTestUser(db, "alice");
    bob = createTestUser(db, "bob");
  });

  function transferCount(): number {
    return db.prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM transfers").get()?.n ?? 0;
  }

  it("moves cash between users and records the transfer", () => {
    const result = sendCash(db, { fromUserId: alice, toUsername: "bob", amountCents: 25_00 });

    expect(result).toMatchObject({ ok: true, recipientUsername: "bob" });
    expect(cashOf(db, alice)).toBe(STARTING_CASH_CENTS - 25_00);
    expect(cashOf(db, bob)).toBe(STARTING_CASH_CENTS + 25_00);
    expect(transferCount()).toBe(1);
  });

  it("allows sending the entire balance", () => {
    const result = sendCash(db, { fromUserId: alice, toUsername: "bob", amountCents: STARTING_CASH_CENTS });
    expect(result.ok).toBe(true);
    expect(cashOf(db, alice)).toBe(0);
  });

  it.each([
    ["insufficient funds", { toUsername: "bob", amountCents: STARTING_CASH_CENTS + 1 }, "insufficient_funds"],
    ["a self-send", { toUsername: "alice", amountCents: 1_00 }, "self_send"],
    ["an unknown recipient", { toUsername: "nobody", amountCents: 1_00 }, "unknown_recipient"],
    ["a zero amount", { toUsername: "bob", amountCents: 0 }, "invalid_amount"],
    ["a negative amount", { toUsername: "bob", amountCents: -5_00 }, "invalid_amount"],
    ["a fractional cent", { toUsername: "bob", amountCents: 1.5 }, "invalid_amount"],
  ])("rejects %s without touching balances", (_case, request, reason) => {
    const result = sendCash(db, { fromUserId: alice, ...request });

    expect(result).toEqual({ ok: false, reason });
    expect(cashOf(db, alice)).toBe(STARTING_CASH_CENTS);
    expect(cashOf(db, bob)).toBe(STARTING_CASH_CENTS);
    expect(transferCount()).toBe(0);
  });
});
