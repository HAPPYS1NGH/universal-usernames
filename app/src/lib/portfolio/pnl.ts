import { ethValueCents } from "@/lib/money";

export const STARTING_CASH_CENTS = 10_000_00;

// Net money put into the account from outside: the starting grant plus
// transfers received, minus transfers sent. PnL is measured against this,
// so sending or receiving cash never counts as trading profit or loss.
export function netContributionCents(receivedCents: number, sentCents: number): number {
  return STARTING_CASH_CENTS + receivedCents - sentCents;
}

export type PortfolioInput = {
  cashCents: number;
  ethGwei: number;
  netContributionCents: number;
  priceCents: number;
};

export type PortfolioValuation = {
  valueCents: number;
  pnlCents: number;
  // null when nothing net was contributed (everything was sent away), where a
  // percentage has no meaningful base.
  pnlPercent: number | null;
};

export function valuePortfolio(input: PortfolioInput): PortfolioValuation {
  const valueCents = input.cashCents + ethValueCents(input.ethGwei, input.priceCents, "nearest");
  const pnlCents = valueCents - input.netContributionCents;
  const pnlPercent = input.netContributionCents > 0 ? (pnlCents / input.netContributionCents) * 100 : null;
  return { valueCents, pnlCents, pnlPercent };
}
