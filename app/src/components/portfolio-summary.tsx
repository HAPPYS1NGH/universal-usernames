import { formatEth, formatPercent, formatSignedUsd, formatUsd } from "@/lib/money";
import type { Portfolio } from "@/lib/portfolio/portfolio-queries";

export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const ethValueCents = portfolio.valueCents - portfolio.cashCents;
  const pnlTone = portfolio.pnlCents > 0 ? "text-up" : portfolio.pnlCents < 0 ? "text-down" : "text-muted";

  return (
    <section className="rounded-3xl bg-surface p-8 ring-1 ring-line sm:p-10">
      <p className="text-lg font-medium text-muted">Portfolio value</p>
      <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
        {formatUsd(portfolio.valueCents)}
      </p>
      <p className={`mt-3 text-2xl font-medium tabular-nums ${pnlTone}`}>
        {formatSignedUsd(portfolio.pnlCents)} ({formatPercent(portfolio.pnlPercent)})
        <span className="ml-3 text-base font-normal text-muted">all-time PnL, excluding transfers</span>
      </p>
      <dl className="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-2">
        <div>
          <dt className="text-muted">Cash</dt>
          <dd className="mt-1 text-3xl font-medium tabular-nums">{formatUsd(portfolio.cashCents)}</dd>
        </div>
        <div>
          <dt className="text-muted">ETH</dt>
          <dd className="mt-1 text-3xl font-medium tabular-nums">
            {formatEth(portfolio.ethGwei)}
            <span className="ml-3 text-xl text-muted">{formatUsd(ethValueCents)}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
