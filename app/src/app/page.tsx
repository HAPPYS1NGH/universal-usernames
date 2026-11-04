import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { EthPriceChip } from "@/components/eth-price-chip";
import { getSessionUser } from "@/lib/auth/session";
import { brandName } from "@/lib/config";
import { getEthPrice } from "@/lib/market/eth-price";
import { formatUsd } from "@/lib/money";
import { STARTING_CASH_CENTS } from "@/lib/portfolio/pnl";

export default async function LandingPage() {
  if (await getSessionUser()) redirect("/trade");
  const price = await getEthPrice();

  return (
    <div className="flex flex-col gap-7 pt-4">
      <section>
        <EthPriceChip price={price} />
        <h1 className="mt-5 text-[2.125rem] leading-[1.08] font-[750] tracking-[-0.04em] text-balance">
          Trade ETH with {formatUsd(STARTING_CASH_CENTS, { wholeDollars: true })} of demo cash.
        </h1>
        <p className="mt-3 max-w-[34ch] text-[1.0625rem] leading-normal font-medium text-muted text-pretty">
          Pick a username, get a wallet, and climb the {brandName()} leaderboard. Send cash to any trader by their
          @username.
        </p>
      </section>
      <AuthPanel />
    </div>
  );
}
