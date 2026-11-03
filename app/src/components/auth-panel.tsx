"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/auth-actions";
import { IDLE_FORM_STATE } from "@/app/form-state";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type Mode = "sign-up" | "sign-in";

const FIELD_CLASSES =
  "flex h-14 items-center rounded-xl bg-canvas px-4 ring-1 ring-line transition-shadow duration-150 ease-out focus-within:ring-2 focus-within:ring-ink";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("sign-up");

  return (
    <div className="rounded-[1.75rem] bg-surface p-4 ring-1 ring-line">
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-xl bg-canvas p-1">
        {(["sign-up", "sign-in"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => setMode(tab)}
            className={`h-11 rounded-lg font-semibold transition-colors duration-150 ease-out focus-visible:-outline-offset-2 ${
              mode === tab ? "bg-raised text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {tab === "sign-up" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>
      {/* Keyed so switching tabs starts with a clean form and no stale error. */}
      <AuthForm key={mode} mode={mode} />
    </div>
  );
}

function AuthForm({ mode }: { mode: Mode }) {
  const [state, formAction] = useActionState(mode === "sign-up" ? signUp : signIn, IDLE_FORM_STATE);
  // Controlled so it survives React's form reset after a failed attempt.
  const [username, setUsername] = useState("");
  const isSignUp = mode === "sign-up";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-medium">Username</span>
        <span className={FIELD_CLASSES}>
          <span className="text-xl text-muted">@</span>
          <input
            name="username"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={20}
            placeholder="happy"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-full w-full bg-transparent pl-1 text-lg outline-none placeholder:text-muted/60"
          />
        </span>
        {isSignUp && <span className="text-sm text-muted">3 to 20 characters: a–z, 0–9 and hyphens.</span>}
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Password</span>
        <span className={FIELD_CLASSES}>
          <input
            name="password"
            type="password"
            required
            minLength={isSignUp ? 8 : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="h-full w-full bg-transparent text-lg outline-none"
          />
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingLabel={isSignUp ? "Creating account…" : "Signing in…"}>
        {isSignUp ? "Create account" : "Sign in"}
      </SubmitButton>
    </form>
  );
}
