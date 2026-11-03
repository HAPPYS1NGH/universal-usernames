"use client";

import { useActionState, useState } from "react";
import { IDLE_FORM_STATE, type FormState } from "@/app/form-state";
import { sendToUsername } from "@/app/wallet/actions";
import { formatUsd } from "@/lib/money";
import { FormMessage } from "./form-message";
import { ArrowUpRightIcon } from "./icons";
import { SubmitButton } from "./submit-button";

const FIELD_CLASSES =
  "flex h-14 items-center rounded-xl bg-canvas px-4 ring-1 ring-line transition-shadow duration-150 ease-out focus-within:ring-2 focus-within:ring-ink";

export function SendForm({ cashCents, brand }: { cashCents: number; brand: string }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [state, formAction] = useActionState(async (previous: FormState, formData: FormData) => {
    const next = await sendToUsername(previous, formData);
    if (next.status === "success") {
      setRecipient("");
      setAmount("");
    }
    return next;
  }, IDLE_FORM_STATE);

  return (
    <section aria-labelledby="send-heading" className="rounded-[1.75rem] bg-surface p-4 ring-1 ring-line">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-raised">
          <ArrowUpRightIcon className="size-6" />
        </span>
        <div>
          <h2 id="send-heading" className="text-xl font-semibold tracking-tight">
            Send cash
          </h2>
          <p className="text-muted">Instant and free between {brand} users.</p>
        </div>
      </div>
      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-medium">To</span>
          <span className={FIELD_CLASSES}>
            <span className="text-xl text-muted">@</span>
            <input
              name="recipient"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="username"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className="h-full w-full bg-transparent pl-1 text-xl outline-none placeholder:text-muted/60"
            />
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium">Amount</span>
          <span className={FIELD_CLASSES}>
            <span className="text-xl text-muted">$</span>
            <input
              name="amount"
              required
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-full w-full bg-transparent pl-1.5 text-xl tabular-nums outline-none placeholder:text-muted/60"
            />
          </span>
        </label>
        <p className="flex justify-between gap-4">
          <span className="text-muted">Cash available</span>
          <span className="font-medium tabular-nums">{formatUsd(cashCents)}</span>
        </p>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </form>
    </section>
  );
}
