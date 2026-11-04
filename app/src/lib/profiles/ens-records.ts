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

// A picked avatar gets ?v=<updatedAt>, so the record itself changes with the
// avatar and ENS apps fetch the new image instead of a cached one.
function avatarUrl(appUrl: string, profile: PublicProfile): string {
  const url = `${appUrl}/api/avatar/${profile.username}`;
  return profile.avatar ? `${url}?v=${profile.avatar.updatedAt}` : url;
}

export function buildEnsRecords(profile: PublicProfile, site: { brand: string; appUrl: string }): EnsRecords {
  const rank = `Rank #${profile.rank} on ${site.brand}`;
  const description = profile.pnlPercent === null ? rank : `${rank} · ${formatPercent(profile.pnlPercent)} PnL`;
  return {
    name: profile.username,
    address: profile.address,
    texts: {
      description,
      url: `${site.appUrl}/u/${profile.username}`,
      avatar: avatarUrl(site.appUrl, profile),
    },
  };
}
