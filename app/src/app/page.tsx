import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { EthIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth/session";
import { brandName } from "@/lib/config";
import { getEthPrice } from "@/lib/market/eth-price";
import { formatUsd } from "@/lib/money";
import { STARTING_CASH_CENTS } from "@/lib/portfolio/pnl";

export default async function LandingPage() {
  if (await getSessionUser()) redirect("/trade");
  const price = await getEthPrice();

  return (
    <div className="flex flex-col gap-8 pt-4">
      <section>
        <p className="mb-5 inline-flex h-9 items-center gap-2 rounded-full bg-surface pr-4 pl-2.5 text-muted">
          <EthIcon className="size-5 text-ink" />
          <span className="font-medium text-ink">ETH</span>
          <span className="tabular-nums text-ink">{formatUsd(price.cents)}</span>
        </p>
        <h1 className="text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance">
          Trade ETH with {formatUsd(STARTING_CASH_CENTS, { wholeDollars: true })} of demo cash.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted text-pretty">
          Pick a username, get a wallet, and climb the {brandName()} leaderboard. Send cash to any trader by their
          @username.
        </p>
      </section>
      <AuthPanel />
    </div>
  );
}
