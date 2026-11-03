"use client";

import { useActionState, useState } from "react";
import { IDLE_FORM_STATE, type FormState } from "@/app/form-state";
import { placeTrade } from "@/app/trade/actions";
import { ethGweiForCents, ethValueCents, formatEth, formatUsd, parseUsdToCents } from "@/lib/money";
import type { TradeSide } from "@/lib/trading/execute-trade";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type TradePanelProps = {
  cashCents: number;
  ethGwei: number;
  priceCents: number;
};

const QUICK_AMOUNTS_CENTS = [100_00, 500_00, 1_000_00];

export function TradePanel({ cashCents, ethGwei, priceCents }: TradePanelProps) {
  const [side, setSide] = useState<TradeSide>("buy");
  const [amount, setAmount] = useState("");
  const [useMax, setUseMax] = useState(false);

  const [state, formAction] = useActionState(async (previous: FormState, formData: FormData) => {
    const next = await placeTrade(previous, formData);
    if (next.status === "success") {
      setAmount("");
      setUseMax(false);
    }
    return next;
  }, IDLE_FORM_STATE);

  const holdingsValueCents = ethValueCents(ethGwei, priceCents, "down");
  const maxCents = side === "buy" ? cashCents : holdingsValueCents;
  const amountCents = useMax ? maxCents : parseUsdToCents(amount);
  const estimateGwei = amountCents ? ethGweiForCents(amountCents, priceCents, side === "buy" ? "down" : "up") : 0;
  const displayAmount = useMax ? (maxCents / 100).toFixed(2) : amount;

  function chooseSide(next: TradeSide) {
    setSide(next);
    setUseMax(false);
  }

  return (
    <section className="rounded-3xl bg-surface p-8 ring-1 ring-line">
      <div className="mb-8 grid grid-cols-2 rounded-full bg-canvas p-1">
        {(["buy", "sell"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={side === option}
            onClick={() => chooseSide(option)}
            className={`rounded-full py-3 text-lg font-semibold capitalize transition-colors ${
              side === option
                ? option === "buy"
                  ? "bg-up text-surface"
                  : "bg-down text-surface"
                : "text-muted hover:text-ink"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="side" value={side} />
        <input type="hidden" name="max" value={String(useMax)} />
        <label className="flex flex-col gap-2">
          <span className="font-medium">Amount in USD</span>
          <span className="flex items-center rounded-2xl bg-canvas px-5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
            <span className="text-3xl text-muted">$</span>
            <input
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={displayAmount}
              onChange={(event) => {
                setUseMax(false);
                setAmount(event.target.value);
              }}
              className="w-full bg-transparent py-4 pl-2 text-3xl tabular-nums outline-none"
            />
          </span>
        </label>

        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => {
                setUseMax(false);
                setAmount(String(cents / 100));
              }}
              className="rounded-xl bg-canvas py-2.5 font-medium ring-1 ring-line transition-colors hover:bg-line"
            >
              {formatUsd(cents, { wholeDollars: true })}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseMax(true)}
            aria-pressed={useMax}
            className={`rounded-xl py-2.5 font-medium ring-1 transition-colors ${
              useMax ? "bg-ink text-surface ring-ink" : "bg-canvas ring-line hover:bg-line"
            }`}
          >
            Max
          </button>
        </div>

        <dl className="flex flex-col gap-2 text-lg">
          <div className="flex justify-between">
            <dt className="text-muted">{side === "buy" ? "You get about" : "You sell about"}</dt>
            <dd className="tabular-nums">{formatEth(estimateGwei, 6)} ETH</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Available</dt>
            <dd className="tabular-nums">
              {side === "buy" ? formatUsd(cashCents) : `${formatEth(ethGwei, 6)} ETH`}
            </dd>
          </div>
        </dl>

        <FormMessage state={state} />
        <SubmitButton tone={side === "buy" ? "up" : "down"} pendingLabel="Placing order…" disabled={!amountCents}>
          {side === "buy" ? "Buy ETH" : "Sell ETH"}
        </SubmitButton>
      </form>
    </section>
  );
}
