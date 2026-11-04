import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { EthPriceChip } from "@/components/eth-price-chip";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { getSessionUser } from "@/lib/auth/session";
import { getAvatarChoices } from "@/lib/avatars/avatar-store";
import { brandName } from "@/lib/config";
import { getDb } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { getLeaderboard } from "@/lib/portfolio/portfolio-queries";

export const metadata: Metadata = { title: "Leaderboard" };

const REFRESH_MS = 15_000;

export default async function LeaderboardPage() {
  const user = await getSessionUser();
  const price = await getEthPrice();
  const db = getDb();
  const entries = getLeaderboard(db, price.cents);
  const avatars = getAvatarChoices(db, entries.map((entry) => entry.username));

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh intervalMs={REFRESH_MS} />
      <header className="pt-2">
        <h1 className="text-[2rem] leading-tight font-[750] tracking-[-0.035em]">Leaderboard</h1>
        <p className="mt-1 text-[0.9375rem] font-medium text-muted text-pretty">
          Top {brandName()} traders, ranked by PnL excluding transfers.
        </p>
        <div className="mt-4">
          <EthPriceChip price={price} />
        </div>
      </header>
      <LeaderboardTable entries={entries} currentUsername={user?.username ?? null} avatars={avatars} />
    </div>
  );
}
