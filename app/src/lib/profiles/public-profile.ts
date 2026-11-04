import { getAddress, type Address } from "viem";
import { getAvatarChoice, type AvatarChoice } from "@/lib/avatars/avatar-store";
import type { Db } from "@/lib/db/connection";
import { getLeaderboard } from "@/lib/portfolio/portfolio-queries";
import { getWalletAddress } from "@/lib/wallet/embedded-wallet";

// Everything about a user that is safe to publish. ENS makes these values
// public anyway, so nothing private (keys, cash, trades) belongs here.
export type PublicProfile = {
  username: string;
  address: Address;
  rank: number;
  traderCount: number;
  valueCents: number;
  pnlPercent: number | null;
  avatar: AvatarChoice | null;
};

export function getPublicProfile(db: Db, username: string, priceCents: number): PublicProfile | null {
  const leaderboard = getLeaderboard(db, priceCents);
  const entry = leaderboard.find((candidate) => candidate.username === username);
  if (!entry) return null;

  const address = getWalletAddress(db, entry.userId);
  if (!address) throw new Error(`User @${username} has no embedded wallet`);

  return {
    username: entry.username,
    address: getAddress(address),
    rank: entry.rank,
    traderCount: leaderboard.length,
    valueCents: entry.valueCents,
    pnlPercent: entry.pnlPercent,
    avatar: getAvatarChoice(db, entry.username),
  };
}
