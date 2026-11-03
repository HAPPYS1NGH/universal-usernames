"use client";

import { useActionState, useState } from "react";
import { IDLE_FORM_STATE, type FormState } from "@/app/form-state";
import { sendToUsername } from "@/app/wallet/actions";
import { formatUsd } from "@/lib/money";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

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
    <section className="rounded-3xl bg-surface p-8 ring-1 ring-line">
      <h2 className="text-2xl font-semibold tracking-tight">Send cash</h2>
      <p className="mt-2 text-muted">Instant and free between {brand} users.</p>
      <form action={formAction} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="font-medium">To</span>
          <span className="flex items-center rounded-2xl bg-canvas px-5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
            <span className="text-2xl text-muted">@</span>
            <input
              name="recipient"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="username"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className="w-full bg-transparent py-4 pl-1 text-2xl outline-none"
            />
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium">Amount</span>
          <span className="flex items-center rounded-2xl bg-canvas px-5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
            <span className="text-2xl text-muted">$</span>
            <input
              name="amount"
              required
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full bg-transparent py-4 pl-2 text-2xl tabular-nums outline-none"
            />
          </span>
        </label>
        <p className="flex justify-between text-lg">
          <span className="text-muted">Cash available</span>
          <span className="tabular-nums">{formatUsd(cashCents)}</span>
        </p>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </form>
    </section>
  );
}
