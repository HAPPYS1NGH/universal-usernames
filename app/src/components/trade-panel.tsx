"use client";

import { useActionState, useState } from "react";
import { IDLE_FORM_STATE, type FormState } from "@/app/form-state";
import { placeTrade } from "@/app/trade/actions";
import { ethGweiForCents, ethValueCents, formatEth, formatUsd, parseUsdToCents } from "@/lib/money";
import type { TradeSide } from "@/lib/trading/execute-trade";
import { SEGMENT_TRACK, segmentClasses } from "./control-styles";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type TradePanelProps = {
  cashCents: number;
  ethGwei: number;
  priceCents: number;
};

const QUICK_AMOUNTS_CENTS = [100_00, 500_00, 1_000_00];

const CHIP =
  "h-10 rounded-full text-[0.9375rem] font-semibold tabular-nums transition-[background-color,color,scale] duration-150 ease-ios active:scale-[0.96]";

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
    <div className="flex flex-col gap-5">
      <div className={SEGMENT_TRACK}>
        {(["buy", "sell"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={side === option}
            onClick={() => chooseSide(option)}
            className={`capitalize ${segmentClasses(side === option)}`}
          >
            {option}
          </button>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="side" value={side} />
        <input type="hidden" name="max" value={String(useMax)} />
        <label className="flex flex-col gap-2">
          <span className="px-1 text-[0.9375rem] font-semibold">Amount in USD</span>
          <span className="flex h-[4.5rem] items-center rounded-[1.25rem] bg-fill px-5 transition-colors duration-150 ease-out focus-within:bg-fill-strong has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink">
            <span className="text-[2rem] font-bold text-faint">$</span>
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
              className="h-full w-full min-w-0 bg-transparent pl-1 text-[2rem] font-bold tracking-[-0.03em] tabular-nums outline-none focus-visible:outline-none"
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
              className={`${CHIP} bg-fill hover:bg-fill-strong`}
            >
              {formatUsd(cents, { wholeDollars: true })}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseMax(true)}
            aria-pressed={useMax}
            className={`${CHIP} ${useMax ? "bg-ink text-surface" : "bg-fill hover:bg-fill-strong"}`}
          >
            Max
          </button>
        </div>

        <dl className="flex flex-col gap-1.5 px-1 text-[0.9375rem]">
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-muted">{side === "buy" ? "You get about" : "You sell about"}</dt>
            <dd className="font-semibold tabular-nums">{formatEth(estimateGwei, 6)} ETH</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-muted">Available</dt>
            <dd className="font-semibold tabular-nums">
              {side === "buy" ? formatUsd(cashCents) : `${formatEth(ethGwei, 6)} ETH`}
            </dd>
          </div>
        </dl>

        <FormMessage state={state} />
        <SubmitButton pendingLabel="Placing order…" disabled={!amountCents}>
          {side === "buy" ? "Buy ETH" : "Sell ETH"}
        </SubmitButton>
      </form>
    </div>
  );
}
