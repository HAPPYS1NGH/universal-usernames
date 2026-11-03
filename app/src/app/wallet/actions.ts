"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/form-state";
import { getSessionUser } from "@/lib/auth/session";
import { parseUsernameInput } from "@/lib/auth/username";
import { getDb } from "@/lib/db/connection";
import { formatUsd, parseUsdToCents } from "@/lib/money";
import { sendCash } from "@/lib/transfers/send-cash";

const SEND_ERRORS = {
  invalid_amount: "Enter an amount greater than zero.",
  unknown_recipient: "No user with that username.",
  self_send: "You can't send to yourself.",
  insufficient_funds: "Not enough cash for that transfer.",
} as const;

export async function sendToUsername(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", message: "Your session expired. Sign in again." };

  const recipient = parseUsernameInput(String(formData.get("recipient") ?? ""));
  if (!recipient.ok) return { status: "error", message: SEND_ERRORS.unknown_recipient };

  const amountCents = parseUsdToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null) return { status: "error", message: "Enter a USD amount, like 25 or 9.99." };

  const result = sendCash(getDb(), { fromUserId: user.id, toUsername: recipient.username, amountCents });
  if (!result.ok) return { status: "error", message: SEND_ERRORS[result.reason] };

  revalidatePath("/wallet");
  return { status: "success", message: `Sent ${formatUsd(amountCents)} to @${result.recipientUsername}.` };
}
