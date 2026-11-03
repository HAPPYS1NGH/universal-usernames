import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/connection";
import { STARTING_CASH_CENTS } from "@/lib/portfolio/pnl";
import { executeTrade } from "@/lib/trading/execute-trade";
import { cashOf, createTestDb, createTestUser } from "./helpers/test-db";

const PRICE_CENTS = 2_500_00;

describe("executeTrade", () => {
  let db: Db;
  let userId: number;

  beforeEach(() => {
    db = createTestDb();
    userId = createTestUser(db, "trader");
  });

  function ethOf(): number {
    return db.prepare<[number], { eth: number }>("SELECT eth_gwei AS eth FROM users WHERE id = ?").get(userId)?.eth ?? 0;
  }

  it("buys ETH with a USD amount", () => {
    const result = executeTrade(db, { userId, side: "buy", amount: { usdCents: 1_000_00 }, priceCents: PRICE_CENTS });

    expect(result).toMatchObject({ ok: true, fill: { usdCents: 1_000_00, ethGwei: 400_000_000 } });
    expect(cashOf(db, userId)).toBe(STARTING_CASH_CENTS - 1_000_00);
    expect(ethOf()).toBe(400_000_000);
  });

  it("sells everything with max", () => {
    executeTrade(db, { userId, side: "buy", amount: "max", priceCents: PRICE_CENTS });
    const result = executeTrade(db, { userId, side: "sell", amount: "max", priceCents: 3_000_00 });

    expect(result.ok).toBe(true);
    expect(ethOf()).toBe(0);
    expect(cashOf(db, userId)).toBe(12_000_00);
  });

  it("rejects buys larger than cash and sells larger than holdings", () => {
    const tooMuch = { usdCents: STARTING_CASH_CENTS + 1 };
    expect(executeTrade(db, { userId, side: "buy", amount: tooMuch, priceCents: PRICE_CENTS })).toEqual({
      ok: false,
      reason: "insufficient_cash",
    });
    expect(executeTrade(db, { userId, side: "sell", amount: { usdCents: 1_00 }, priceCents: PRICE_CENTS })).toEqual({
      ok: false,
      reason: "insufficient_eth",
    });
    expect(cashOf(db, userId)).toBe(STARTING_CASH_CENTS);
  });
});
