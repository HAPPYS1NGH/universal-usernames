import type { Db } from "@/lib/db/connection";
import { ethGweiForCents, ethValueCents } from "@/lib/money";

export type TradeSide = "buy" | "sell";

// "max" spends all cash (buy) or sells all ETH (sell) at the execution price.
export type TradeAmount = { usdCents: number } | "max";

export type TradeRequest = {
  userId: number;
  side: TradeSide;
  amount: TradeAmount;
  priceCents: number;
  executedAt?: number;
};

export type Fill = { usdCents: number; ethGwei: number };

export type TradeResult =
  | { ok: true; side: TradeSide; fill: Fill; priceCents: number }
  | { ok: false; reason: "insufficient_cash" | "insufficient_eth" | "amount_too_small" };

type Holdings = { cashCents: number; ethGwei: number };

type Quote = { ok: true; fill: Fill } | Extract<TradeResult, { ok: false }>;

function quoteBuy(holdings: Holdings, amount: TradeAmount, priceCents: number): Quote {
  const usdCents = amount === "max" ? holdings.cashCents : amount.usdCents;
  if (usdCents > holdings.cashCents) return { ok: false, reason: "insufficient_cash" };
  const ethGwei = ethGweiForCents(usdCents, priceCents, "down");
  if (usdCents <= 0 || ethGwei <= 0) return { ok: false, reason: "amount_too_small" };
  return { ok: true, fill: { usdCents, ethGwei } };
}

function quoteSell(holdings: Holdings, amount: TradeAmount, priceCents: number): Quote {
  if (amount === "max") {
    if (holdings.ethGwei <= 0) return { ok: false, reason: "insufficient_eth" };
    const usdCents = ethValueCents(holdings.ethGwei, priceCents, "down");
    if (usdCents <= 0) return { ok: false, reason: "amount_too_small" };
    return { ok: true, fill: { usdCents, ethGwei: holdings.ethGwei } };
  }
  // Round the ETH sold up so the user never receives more USD than the ETH is worth.
  const ethGwei = ethGweiForCents(amount.usdCents, priceCents, "up");
  if (amount.usdCents <= 0 || ethGwei <= 0) return { ok: false, reason: "amount_too_small" };
  if (ethGwei > holdings.ethGwei) return { ok: false, reason: "insufficient_eth" };
  return { ok: true, fill: { usdCents: amount.usdCents, ethGwei } };
}

export function executeTrade(db: Db, request: TradeRequest): TradeResult {
  const { userId, side, amount, priceCents } = request;
  return db
    .transaction((): TradeResult => {
      const holdings = db
        .prepare<[number], Holdings>("SELECT cash_cents AS cashCents, eth_gwei AS ethGwei FROM users WHERE id = ?")
        .get(userId);
      if (!holdings) throw new Error(`User ${userId} not found`);

      const quote = side === "buy" ? quoteBuy(holdings, amount, priceCents) : quoteSell(holdings, amount, priceCents);
      if (!quote.ok) return quote;

      const { usdCents, ethGwei } = quote.fill;
      const cashDelta = side === "buy" ? -usdCents : usdCents;
      const ethDelta = side === "buy" ? ethGwei : -ethGwei;
      db.prepare("UPDATE users SET cash_cents = cash_cents + ?, eth_gwei = eth_gwei + ? WHERE id = ?").run(
        cashDelta,
        ethDelta,
        userId,
      );
      db.prepare(
        `INSERT INTO trades (user_id, side, usd_cents, eth_gwei, price_cents, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(userId, side, usdCents, ethGwei, priceCents, request.executedAt ?? Date.now());

      return { ok: true, side, fill: quote.fill, priceCents };
    })
    .immediate();
}
