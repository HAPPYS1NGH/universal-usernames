import type { EthPrice } from "@/lib/market/eth-price";
import { AnimatedUsd } from "./animated-number";
import { EthIcon } from "./icons";

// Small white pill with the live ETH price, for screens that aren't about trading.
export function EthPriceChip({ price }: { price: EthPrice }) {
  return (
    <p className="inline-flex h-9 items-center gap-2 rounded-full bg-surface pr-3.5 pl-2 text-[0.9375rem] font-semibold shadow-card">
      <span className="grid size-6 place-items-center rounded-full bg-fill">
        <EthIcon className="size-4" />
      </span>
      <span>ETH</span>
      <AnimatedUsd cents={price.cents} className="text-muted tabular-nums" />
    </p>
  );
}
