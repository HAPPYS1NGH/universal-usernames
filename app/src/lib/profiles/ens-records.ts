import type { Address } from "viem";
import { formatPercent } from "@/lib/money";
import type { PublicProfile } from "./public-profile";

// Response body of GET /api/ens/{label}. The CCIP-Read gateway depends on
// this exact shape, so change it only together with the gateway.
export type EnsRecords = {
  name: string;
  address: Address;
  texts: {
    description: string;
    url: string;
    avatar: string;
  };
};

export function buildEnsRecords(profile: PublicProfile, site: { brand: string; appUrl: string }): EnsRecords {
  const rank = `Rank #${profile.rank} on ${site.brand}`;
  const description = profile.pnlPercent === null ? rank : `${rank} · ${formatPercent(profile.pnlPercent)} PnL`;
  return {
    name: profile.username,
    address: profile.address,
    texts: {
      description,
      url: `${site.appUrl}/u/${profile.username}`,
      avatar: `${site.appUrl}/api/avatar/${profile.username}`,
    },
  };
}
