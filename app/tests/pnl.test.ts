import { describe, expect, it } from "vitest";
import { netContributionCents, STARTING_CASH_CENTS, valuePortfolio } from "@/lib/portfolio/pnl";
import { getLeaderboard, getPortfolio } from "@/lib/portfolio/portfolio-queries";
import { executeTrade } from "@/lib/trading/execute-trade";
import { sendCash } from "@/lib/transfers/send-cash";
import { createTestDb, createTestUser } from "./helpers/test-db";

const ETH_PRICE_CENTS = 2_000_00;

describe("valuePortfolio", () => {
  it("values cash plus ETH at the current price", () => {
    const valuation = valuePortfolio({
      cashCents: 5_000_00,
      ethGwei: 3_000_000_000, // 3 ETH
      netContributionCents: STARTING_CASH_CENTS,
      priceCents: ETH_PRICE_CENTS,
    });
    expect(valuation).toEqual({ valueCents: 11_000_00, pnlCents: 1_000_00, pnlPercent: 10 });
  });

  it("measures PnL against net contributions, not the starting cash", () => {
    // Received $5,000 and did nothing else: no trading profit.
    const valuation = valuePortfolio({
      cashCents: 15_000_00,
      ethGwei: 0,
      netContributionCents: netContributionCents(5_000_00, 0),
      priceCents: ETH_PRICE_CENTS,
    });
    expect(valuation.pnlPercent).toBe(0);
  });

  it("has no PnL percentage when nothing is net contributed", () => {
    const valuation = valuePortfolio({
      cashCents: 0,
      ethGwei: 0,
      netContributionCents: 0,
      priceCents: ETH_PRICE_CENTS,
    });
    expect(valuation.pnlPercent).toBeNull();
  });
});

describe("netContributionCents", () => {
  it("adds received and subtracts sent transfers", () => {
    expect(netContributionCents(300_00, 100_00)).toBe(STARTING_CASH_CENTS + 200_00);
  });
});

describe("leaderboard PnL", () => {
  it("ignores transfers and ranks by trading performance", () => {
    const db = createTestDb();
    const trader = createTestUser(db, "trader");
    const giver = createTestUser(db, "giver");
    const receiver = createTestUser(db, "receiver");

    // trader buys $1,000 of ETH at $1,600; it is now worth $1,250 (+$250 = +2.5%).
    executeTrade(db, { userId: trader, side: "buy", amount: { usdCents: 1_000_00 }, priceCents: 1_600_00 });
    sendCash(db, { fromUserId: giver, toUsername: "receiver", amountCents: 4_000_00 });

    const receiverPortfolio = getPortfolio(db, receiver, ETH_PRICE_CENTS);
    expect(receiverPortfolio?.valueCents).toBe(14_000_00);
    expect(receiverPortfolio?.pnlPercent).toBe(0);
    expect(getPortfolio(db, giver, ETH_PRICE_CENTS)?.pnlPercent).toBe(0);

    const leaderboard = getLeaderboard(db, ETH_PRICE_CENTS);
    expect(leaderboard[0]).toMatchObject({ rank: 1, username: "trader", pnlCents: 250_00 });
    expect(leaderboard[0].pnlPercent).toBeCloseTo(2.5);
  });
});
