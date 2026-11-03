import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { getSessionUser } from "@/lib/auth/session";
import { brandName } from "@/lib/config";
import { getEthPrice } from "@/lib/market/eth-price";
import { formatUsd } from "@/lib/money";
import { STARTING_CASH_CENTS } from "@/lib/portfolio/pnl";

export default async function LandingPage() {
  if (await getSessionUser()) redirect("/trade");
  const price = await getEthPrice();

  return (
    <div className="grid items-center gap-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
      <section>
        <p className="mb-6 inline-flex items-center gap-3 rounded-full bg-surface px-4 py-2 text-muted ring-1 ring-line">
          <span className="font-medium text-ink">ETH/USD</span>
          <span className="tabular-nums text-ink">{formatUsd(price.cents)}</span>
        </p>
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-7xl">
          Trade ETH with {formatUsd(STARTING_CASH_CENTS, { wholeDollars: true })} of demo cash.
        </h1>
        <p className="mt-8 max-w-xl text-2xl leading-relaxed text-muted text-pretty">
          Pick a username, get a wallet, and climb the {brandName()} leaderboard. Send cash to any trader by their
          @username.
        </p>
      </section>
      <AuthPanel />
    </div>
  );
}
