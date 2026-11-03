import type { Metadata } from "next";
import { ActivityList } from "@/components/activity-list";
import { DepositCard } from "@/components/deposit-card";
import { SendForm } from "@/components/send-form";
import { requireSessionUser } from "@/lib/auth/session";
import { getRecentActivity } from "@/lib/activity/activity";
import { brandName } from "@/lib/config";
import { getDb } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { getPortfolio } from "@/lib/portfolio/portfolio-queries";
import { getWalletAddress } from "@/lib/wallet/embedded-wallet";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  const user = await requireSessionUser();
  const db = getDb();
  const price = await getEthPrice();
  const portfolio = getPortfolio(db, user.id, price.cents);
  const address = getWalletAddress(db, user.id);
  if (!portfolio || !address) throw new Error(`Wallet missing for user ${user.id}`);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-xl font-medium text-muted">Wallet</p>
        <h1 className="mt-1 text-5xl font-semibold tracking-tight">@{user.username}</h1>
      </header>
      <DepositCard address={address} />
      <div className="grid items-start gap-8 lg:grid-cols-[26rem_1fr]">
        <SendForm cashCents={portfolio.cashCents} brand={brandName()} />
        <ActivityList entries={getRecentActivity(db, user.id)} />
      </div>
    </div>
  );
}
