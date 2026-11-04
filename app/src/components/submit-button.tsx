"use client";

import { useFormStatus } from "react-dom";
import { PRIMARY_BUTTON } from "./control-styles";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  disabled?: boolean;
};

export function SubmitButton({ children, pendingLabel, disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={`${PRIMARY_BUTTON} w-full`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
