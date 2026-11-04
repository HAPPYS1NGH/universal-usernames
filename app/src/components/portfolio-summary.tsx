import { formatPercent, formatSignedUsd } from "@/lib/money";
import type { Portfolio } from "@/lib/portfolio/portfolio-queries";
import { AnimatedUsd } from "./animated-number";

const TONES = {
  up: { text: "text-up", dot: "bg-up-dot" },
  down: { text: "text-down", dot: "bg-down" },
  flat: { text: "text-muted", dot: "bg-faint" },
};

// The balance hero, laid out like the Aave app's home: label, big number,
// and a colored dot line for the change.
export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const tone = TONES[portfolio.pnlCents > 0 ? "up" : portfolio.pnlCents < 0 ? "down" : "flat"];

  return (
    <section aria-labelledby="portfolio-value-label" className="pt-3 text-center">
      <p id="portfolio-value-label" className="text-[0.9375rem] font-medium text-muted">
        Portfolio value
      </p>
      <p className="mt-1.5 text-[3.25rem] leading-[1.05] font-bold tracking-[-0.03em] tabular-nums">
        <AnimatedUsd cents={portfolio.valueCents} />
      </p>
      <p className="mt-2.5 inline-flex items-center gap-2 text-[0.9375rem] font-semibold tabular-nums">
        <span aria-hidden className={`size-2.5 rounded-full ${tone.dot}`} />
        <span className={tone.text}>
          {formatSignedUsd(portfolio.pnlCents)} ({formatPercent(portfolio.pnlPercent)})
        </span>
      </p>
      <p className="mt-0.5 text-[0.8125rem] font-medium text-muted">All-time PnL, excluding transfers</p>
    </section>
  );
}
