import type { FormState } from "@/app/form-state";

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`rounded-2xl px-5 py-3 font-medium ${isError ? "bg-down-soft text-down" : "bg-up-soft text-up"}`}
    >
      {state.message}
    </p>
  );
}
