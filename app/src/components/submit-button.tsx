"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  tone?: "ink" | "up" | "down";
  disabled?: boolean;
};

const TONE_CLASSES = {
  ink: "bg-ink enabled:hover:bg-ink/90",
  up: "bg-up enabled:hover:bg-up/90",
  down: "bg-down enabled:hover:bg-down/90",
};

export function SubmitButton({ children, pendingLabel, tone = "ink", disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`h-14 rounded-xl px-6 text-lg font-semibold text-canvas transition-[background-color,color,transform] duration-150 ease-out enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted ${TONE_CLASSES[tone]}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
