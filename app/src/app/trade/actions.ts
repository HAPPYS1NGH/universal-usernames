"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/form-state";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { getEthPrice } from "@/lib/market/eth-price";
import { formatEth, formatUsd, parseUsdToCents } from "@/lib/money";
import { executeTrade, type TradeAmount } from "@/lib/trading/execute-trade";

const TRADE_ERRORS = {
  insufficient_cash: "Not enough cash for that buy.",
  insufficient_eth: "Not enough ETH for that sell.",
  amount_too_small: "That amount is too small to trade.",
} as const;

export async function placeTrade(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", message: "Your session expired. Sign in again." };

  const side = formData.get("side");
  if (side !== "buy" && side !== "sell") return { status: "error", message: "Choose buy or sell." };

  let amount: TradeAmount = "max";
  if (formData.get("max") !== "true") {
    const usdCents = parseUsdToCents(String(formData.get("amount") ?? ""));
    if (!usdCents) return { status: "error", message: "Enter a USD amount, like 250 or 99.50." };
    amount = { usdCents };
  }

  const price = await getEthPrice();
  const result = executeTrade(getDb(), { userId: user.id, side, amount, priceCents: price.cents });
  if (!result.ok) return { status: "error", message: TRADE_ERRORS[result.reason] };

  revalidatePath("/trade");
  const verb = result.side === "buy" ? "Bought" : "Sold";
  return {
    status: "success",
    message: `${verb} ${formatEth(result.fill.ethGwei, 6)} ETH for ${formatUsd(result.fill.usdCents)} at ${formatUsd(result.priceCents)}.`,
  };
}
