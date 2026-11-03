import type { EthPrice } from "@/lib/market/eth-price";
import { formatUsd } from "@/lib/money";
import { EthIcon } from "./icons";

export function PriceHeading({ price }: { price: EthPrice }) {
  const live = price.source === "live";
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-raised">
        <EthIcon className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">Ethereum</h2>
        <p className="text-muted">ETH / USD</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatUsd(price.cents)}</p>
        <p className="flex items-center justify-end gap-1.5 text-sm font-medium text-muted">
          <span className={`size-2 rounded-full ${live ? "animate-pulse bg-up" : "bg-warn"}`} />
          {live ? "Live price" : "Price feed delayed"}
        </p>
      </div>
    </div>
  );
}
