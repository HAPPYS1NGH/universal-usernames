import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { EthIcon } from "@/components/icons";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { getSessionUser } from "@/lib/auth/session";
import { brandName } from "@/lib/config";
import { getDb } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { formatUsd } from "@/lib/money";
import { getLeaderboard } from "@/lib/portfolio/portfolio-queries";

export const metadata: Metadata = { title: "Leaderboard" };

const REFRESH_MS = 15_000;

export default async function LeaderboardPage() {
  const user = await getSessionUser();
  const price = await getEthPrice();
  const entries = getLeaderboard(getDb(), price.cents);

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh intervalMs={REFRESH_MS} />
      <header className="pt-2">
        <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-muted text-pretty">Top {brandName()} traders, ranked by PnL excluding transfers.</p>
        <p className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-surface pr-4 pl-2.5">
          <EthIcon className="size-5" />
          <span className="font-medium">ETH</span>
          <span className="tabular-nums">{formatUsd(price.cents)}</span>
        </p>
      </header>
      <LeaderboardTable entries={entries} currentUsername={user?.username ?? null} />
    </div>
  );
}
