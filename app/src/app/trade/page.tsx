import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { HoldingsList } from "@/components/holdings-list";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { PriceHeading } from "@/components/price-heading";
import { TradePanel } from "@/components/trade-panel";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { getPortfolio } from "@/lib/portfolio/portfolio-queries";

export const metadata: Metadata = { title: "Trade" };

const PRICE_REFRESH_MS = 15_000;

export default async function TradePage() {
  const user = await requireSessionUser();
  const price = await getEthPrice();
  const portfolio = getPortfolio(getDb(), user.id, price.cents);
  if (!portfolio) throw new Error(`Portfolio missing for user ${user.id}`);

  return (
    <div className="flex flex-col gap-7">
      <AutoRefresh intervalMs={PRICE_REFRESH_MS} />
      <h1 className="sr-only">Trade</h1>
      <PortfolioSummary portfolio={portfolio} />
      <section aria-label="Trade ETH" className="flex flex-col gap-5 rounded-[1.75rem] bg-surface p-4 ring-1 ring-line">
        <PriceHeading price={price} />
        <TradePanel cashCents={portfolio.cashCents} ethGwei={portfolio.ethGwei} priceCents={price.cents} />
      </section>
      <HoldingsList portfolio={portfolio} />
    </div>
  );
}
