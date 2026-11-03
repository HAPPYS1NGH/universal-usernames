"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  tone?: "ink" | "up" | "down";
  disabled?: boolean;
};

const TONE_CLASSES = {
  ink: "bg-ink hover:bg-ink/85",
  up: "bg-up hover:bg-up/90",
  down: "bg-down hover:bg-down/90",
};

export function SubmitButton({ children, pendingLabel, tone = "ink", disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`rounded-2xl px-6 py-4 text-xl font-semibold text-surface transition-[background-color,transform] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${TONE_CLASSES[tone]}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
