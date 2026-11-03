import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
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
    <div className="flex flex-col gap-10">
      <AutoRefresh intervalMs={REFRESH_MS} />
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xl font-medium text-muted">{brandName()}</p>
          <h1 className="mt-1 text-5xl font-semibold tracking-tight">Leaderboard</h1>
        </div>
        <p className="text-lg text-muted">
          Ranked by PnL, excluding transfers. ETH at{" "}
          <span className="font-medium text-ink tabular-nums">{formatUsd(price.cents)}</span>
        </p>
      </header>
      <LeaderboardTable entries={entries} currentUsername={user?.username ?? null} />
    </div>
  );
}
