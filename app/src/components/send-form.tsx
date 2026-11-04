"use client";

import { useActionState, useState } from "react";
import { IDLE_FORM_STATE, type FormState } from "@/app/form-state";
import { sendToUsername } from "@/app/wallet/actions";
import { formatUsd } from "@/lib/money";
import { FIELD, FIELD_AFFIX, FIELD_INPUT } from "./control-styles";
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
    <section aria-labelledby="send-heading" className="rounded-card bg-surface p-5 shadow-card">
      <h2 id="send-heading" className="text-[1.0625rem] font-[650] tracking-[-0.02em]">
        Send cash
      </h2>
      <p className="mt-0.5 text-[0.9375rem] font-medium text-muted">Instant and free between {brand} users.</p>
      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="px-1 text-[0.9375rem] font-semibold">To</span>
          <span className={FIELD}>
            <span className={FIELD_AFFIX}>@</span>
            <input
              name="recipient"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="username"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className={FIELD_INPUT}
            />
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="px-1 text-[0.9375rem] font-semibold">Amount</span>
          <span className={FIELD}>
            <span className={FIELD_AFFIX}>$</span>
            <input
              name="amount"
              required
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={`${FIELD_INPUT} tabular-nums`}
            />
          </span>
        </label>
        <p className="flex justify-between gap-4 px-1 text-[0.9375rem]">
          <span className="font-medium text-muted">Cash available</span>
          <span className="font-semibold tabular-nums">{formatUsd(cashCents)}</span>
        </p>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </form>
    </section>
  );
}
