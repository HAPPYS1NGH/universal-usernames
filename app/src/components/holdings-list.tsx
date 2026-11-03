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
      icon: <span className="text-xl font-semibold">$</span>,
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
      <h2 id="holdings-heading" className="text-xl font-semibold tracking-tight">
        Holdings
      </h2>
      <ul className="mt-2">
        {holdings.map((holding) => (
          <li key={holding.name} className="flex items-center gap-3 py-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface">{holding.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{holding.name}</p>
              <p className="text-muted tabular-nums">{holding.amount}</p>
            </div>
            <p className="text-lg font-semibold tabular-nums">{holding.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
