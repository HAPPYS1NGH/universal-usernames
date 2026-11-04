import type { EthPrice } from "@/lib/market/eth-price";
import { AnimatedUsd } from "./animated-number";
import { EthIcon } from "./icons";

export function PriceHeading({ price }: { price: EthPrice }) {
  const live = price.source === "live";
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-fill">
        <EthIcon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.0625rem] font-[650] tracking-[-0.02em]">Ethereum</h2>
        <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted">
          <span className={`size-2 rounded-full ${live ? "animate-pulse bg-up-dot" : "bg-warn"}`} />
          {live ? "Live price" : "Price feed delayed"}
        </p>
      </div>
      <p className="text-[1.375rem] font-bold tracking-[-0.02em] tabular-nums">
        <AnimatedUsd cents={price.cents} />
      </p>
    </div>
  );
}
