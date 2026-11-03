import type { EthPrice } from "@/lib/market/eth-price";
import { formatUsd } from "@/lib/money";

export function PriceHeading({ price }: { price: EthPrice }) {
  const live = price.source === "live";
  return (
    <section className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="text-xl font-medium text-muted">ETH / USD</p>
        <p className="mt-2 text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
          {formatUsd(price.cents)}
        </p>
      </div>
      <p className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 font-medium ring-1 ring-line">
        <span className={`size-2.5 rounded-full ${live ? "animate-pulse bg-up" : "bg-amber-500"}`} />
        {live ? "Live price" : "Price feed delayed"}
      </p>
    </section>
  );
}
