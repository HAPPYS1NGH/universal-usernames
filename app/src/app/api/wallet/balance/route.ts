import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { getOnchainBalanceWei } from "@/lib/wallet/onchain-balance";
import { getWalletAddress } from "@/lib/wallet/embedded-wallet";

const NO_STORE = { "Cache-Control": "no-store" };

// Onchain ETH balance of the signed-in user's embedded wallet, polled by the wallet page.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  const address = getWalletAddress(getDb(), user.id);
  if (!address) return NextResponse.json({ error: "no_wallet" }, { status: 404, headers: NO_STORE });

  try {
    const balanceWei = await getOnchainBalanceWei(address);
    return NextResponse.json({ address, balanceWei: balanceWei.toString() }, { headers: NO_STORE });
  } catch (error) {
    console.error(`Balance read failed for ${address}:`, error);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 502, headers: NO_STORE });
  }
}
