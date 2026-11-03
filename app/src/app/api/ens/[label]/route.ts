import { NextResponse } from "next/server";
import { validateUsername } from "@/lib/auth/username";
import { appUrl, brandName } from "@/lib/config";
import { getDb } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { buildEnsRecords } from "@/lib/profiles/ens-records";
import { getPublicProfile } from "@/lib/profiles/public-profile";

// Read-only username adapter for the CCIP-Read gateway. Public and
// unauthenticated: it returns only what ENS will publish for the name.
export async function GET(_request: Request, context: RouteContext<"/api/ens/[label]">) {
  const { label } = await context.params;
  if (!validateUsername(label).ok) {
    return NextResponse.json({ error: "invalid_label" }, { status: 400 });
  }

  const price = await getEthPrice();
  const profile = getPublicProfile(getDb(), label, price.cents);
  if (!profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(buildEnsRecords(profile, { brand: brandName(), appUrl: appUrl() }), {
    headers: { "Cache-Control": "public, max-age=30" },
  });
}
