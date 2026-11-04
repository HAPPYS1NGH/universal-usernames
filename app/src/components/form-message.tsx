import type { FormState } from "@/app/form-state";
import { AlertIcon, CheckIcon } from "./icons";

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  const Icon = isError ? AlertIcon : CheckIcon;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[0.9375rem] font-semibold text-pretty ${isError ? "bg-down-soft text-down" : "bg-up-soft text-up"}`}
    >
      <Icon className="mt-px size-5" />
      {state.message}
    </p>
  );
}
