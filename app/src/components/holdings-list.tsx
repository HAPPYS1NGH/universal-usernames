import { formatEth, formatUsd } from "@/lib/money";
import type { Portfolio } from "@/lib/portfolio/portfolio-queries";
import { EthIcon } from "./icons";

export function HoldingsList({ portfolio }: { portfolio: Portfolio }) {
  const ethCents = portfolio.valueCents - portfolio.cashCents;
  const holdings = [
    {
      name: "Cash",
      amount: "USD",
      value: formatUsd(portfolio.cashCents),
      icon: <span className="text-lg font-bold">$</span>,
    },
    {
      name: "Ethereum",
      amount: `${formatEth(portfolio.ethGwei)} ETH`,
      value: formatUsd(ethCents),
      icon: <EthIcon className="size-6" />,
    },
  ];

  return (
    <section aria-labelledby="holdings-heading">
      <h2 id="holdings-heading" className="mb-2 px-1 text-[0.9375rem] font-medium text-muted">
        Holdings
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        {holdings.map((holding) => (
          <li key={holding.name} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill">{holding.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[1.0625rem] font-semibold tracking-[-0.02em]">{holding.name}</p>
              <p className="text-[0.8125rem] font-medium text-muted tabular-nums">{holding.amount}</p>
            </div>
            <p className="text-[1.0625rem] font-semibold tabular-nums">{holding.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
