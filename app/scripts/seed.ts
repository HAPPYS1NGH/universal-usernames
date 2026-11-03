// Seeds demo traders so the leaderboard has some life before the audience
// joins. Safe to re-run: existing usernames are skipped.
//
// Usage: pnpm --filter app db:seed

import { randomBytes } from "node:crypto";
import { createAccount, usernameExists } from "@/lib/accounts/accounts";
import { hashPassword } from "@/lib/auth/password";
import { databasePath, walletEncryptionKey } from "@/lib/config";
import { openDatabase } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { executeTrade, type TradeAmount, type TradeSide } from "@/lib/trading/execute-trade";
import { sendCash } from "@/lib/transfers/send-cash";

type SeedTrade = { hoursAgo: number; side: TradeSide; usd: number | "max"; priceFactor: number };
type SeedTransfer = { hoursAgo: number; to: string; usd: number };
type SeedTrader = { username: string; trades: SeedTrade[]; transfers?: SeedTransfer[] };

const HOUR_MS = 3_600_000;

// Prices are relative to the current spot price so PnL looks plausible on any day.
const SEED_TRADERS: SeedTrader[] = [
  { username: "hodl-queen", trades: [{ hoursAgo: 150, side: "buy", usd: 9_000, priceFactor: 0.78 }] },
  {
    username: "degen-dan",
    trades: [
      { hoursAgo: 130, side: "buy", usd: "max", priceFactor: 0.92 },
      { hoursAgo: 80, side: "sell", usd: 6_000, priceFactor: 1.06 },
      { hoursAgo: 20, side: "buy", usd: 5_000, priceFactor: 0.97 },
    ],
    transfers: [{ hoursAgo: 10, to: "nora", usd: 250 }],
  },
  {
    username: "gm-anna",
    trades: [
      { hoursAgo: 100, side: "buy", usd: 4_000, priceFactor: 0.95 },
      { hoursAgo: 50, side: "buy", usd: 3_000, priceFactor: 1.02 },
    ],
  },
  {
    username: "paperhands",
    trades: [
      { hoursAgo: 145, side: "buy", usd: 8_000, priceFactor: 1.12 },
      { hoursAgo: 48, side: "sell", usd: "max", priceFactor: 0.94 },
      { hoursAgo: 6, side: "buy", usd: 1_000, priceFactor: 1.0 },
    ],
  },
  {
    username: "ser-kev",
    trades: [{ hoursAgo: 72, side: "buy", usd: 5_000, priceFactor: 1.08 }],
    transfers: [{ hoursAgo: 24, to: "gm-anna", usd: 500 }],
  },
  {
    username: "nora",
    trades: [
      { hoursAgo: 120, side: "buy", usd: 2_500, priceFactor: 0.88 },
      { hoursAgo: 26, side: "sell", usd: 1_000, priceFactor: 0.99 },
    ],
  },
  { username: "whale-watch", trades: [{ hoursAgo: 40, side: "buy", usd: "max", priceFactor: 1.03 }] },
];

function toTradeAmount(usd: number | "max"): TradeAmount {
  return usd === "max" ? "max" : { usdCents: Math.round(usd * 100) };
}

async function seed(): Promise<void> {
  const db = openDatabase(databasePath());
  const encryptionKey = walletEncryptionKey();
  const price = await getEthPrice();
  const now = Date.now();
  const created = new Map<string, number>();

  for (const trader of SEED_TRADERS) {
    if (usernameExists(db, trader.username)) {
      console.log(`skip    @${trader.username} (already exists)`);
      continue;
    }
    // A random password nobody knows: seed accounts can't be signed into.
    const account = createAccount(db, {
      username: trader.username,
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      walletEncryptionKey: encryptionKey,
      createdAt: now - 168 * HOUR_MS,
    });
    if (!account.ok) throw new Error(`Could not create @${trader.username}: ${account.reason}`);
    created.set(trader.username, account.userId);

    for (const trade of trader.trades) {
      const result = executeTrade(db, {
        userId: account.userId,
        side: trade.side,
        amount: toTradeAmount(trade.usd),
        priceCents: Math.round(price.cents * trade.priceFactor),
        executedAt: now - trade.hoursAgo * HOUR_MS,
      });
      if (!result.ok) throw new Error(`Seed trade failed for @${trader.username}: ${result.reason}`);
    }
    console.log(`create  @${trader.username}`);
  }

  for (const trader of SEED_TRADERS) {
    const fromUserId = created.get(trader.username);
    if (fromUserId === undefined) continue;
    for (const transfer of trader.transfers ?? []) {
      const result = sendCash(db, {
        fromUserId,
        toUsername: transfer.to,
        amountCents: Math.round(transfer.usd * 100),
        sentAt: now - transfer.hoursAgo * HOUR_MS,
      });
      if (!result.ok) throw new Error(`Seed transfer @${trader.username} -> @${transfer.to} failed: ${result.reason}`);
    }
  }

  db.close();
  console.log(`Seeded ${created.size} traders at ETH $${(price.cents / 100).toFixed(2)} (${price.source} price).`);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
