import type { Db } from "@/lib/db/connection";
import { netContributionCents, valuePortfolio, type PortfolioValuation } from "./pnl";

type PortfolioRow = {
  userId: number;
  username: string;
  cashCents: number;
  ethGwei: number;
  receivedCents: number;
  sentCents: number;
};

export type Portfolio = PortfolioValuation & {
  userId: number;
  username: string;
  cashCents: number;
  ethGwei: number;
  netContributionCents: number;
};

export type LeaderboardEntry = Portfolio & { rank: number };

const PORTFOLIO_SELECT = `
  SELECT
    u.id AS userId,
    u.username AS username,
    u.cash_cents AS cashCents,
    u.eth_gwei AS ethGwei,
    COALESCE((SELECT SUM(amount_cents) FROM transfers WHERE to_user_id = u.id), 0) AS receivedCents,
    COALESCE((SELECT SUM(amount_cents) FROM transfers WHERE from_user_id = u.id), 0) AS sentCents
  FROM users u
`;

function toPortfolio(row: PortfolioRow, priceCents: number): Portfolio {
  const contributed = netContributionCents(row.receivedCents, row.sentCents);
  return {
    userId: row.userId,
    username: row.username,
    cashCents: row.cashCents,
    ethGwei: row.ethGwei,
    netContributionCents: contributed,
    ...valuePortfolio({
      cashCents: row.cashCents,
      ethGwei: row.ethGwei,
      netContributionCents: contributed,
      priceCents,
    }),
  };
}

export function getPortfolio(db: Db, userId: number, priceCents: number): Portfolio | null {
  const row = db.prepare<[number], PortfolioRow>(`${PORTFOLIO_SELECT} WHERE u.id = ?`).get(userId);
  return row ? toPortfolio(row, priceCents) : null;
}

// Ranked by PnL %, so transfers can't buy a better rank. Accounts without a
// PnL % (nothing net contributed) go last.
export function getLeaderboard(db: Db, priceCents: number): LeaderboardEntry[] {
  const rows = db.prepare<[], PortfolioRow>(PORTFOLIO_SELECT).all();
  return rows
    .map((row) => toPortfolio(row, priceCents))
    .sort(
      (a, b) =>
        (b.pnlPercent ?? -Infinity) - (a.pnlPercent ?? -Infinity) ||
        b.valueCents - a.valueCents ||
        a.username.localeCompare(b.username),
    )
    .map((portfolio, index) => ({ ...portfolio, rank: index + 1 }));
}
