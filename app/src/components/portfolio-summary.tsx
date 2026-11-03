import { formatPercent, formatSignedUsd, formatUsd } from "@/lib/money";
import type { Portfolio } from "@/lib/portfolio/portfolio-queries";

export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const pnlTone = portfolio.pnlCents > 0 ? "text-up" : portfolio.pnlCents < 0 ? "text-down" : "text-muted";
  // Cents are dimmed so the dollar figure reads first.
  const [dollars, cents] = formatUsd(portfolio.valueCents).split(".");

  return (
    <section aria-labelledby="portfolio-value-label" className="pt-2">
      <p id="portfolio-value-label" className="font-medium text-muted">
        Portfolio value
      </p>
      <p className="mt-1 text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums">
        {dollars}
        <span className="text-muted">.{cents}</span>
      </p>
      <p className="mt-3 text-lg tabular-nums">
        <span className={`font-semibold ${pnlTone}`}>
          {formatSignedUsd(portfolio.pnlCents)} ({formatPercent(portfolio.pnlPercent)})
        </span>
        <span className="text-muted"> all time, excluding transfers</span>
      </p>
    </section>
  );
}
