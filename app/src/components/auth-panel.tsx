"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/auth-actions";
import { IDLE_FORM_STATE } from "@/app/form-state";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type Mode = "sign-up" | "sign-in";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("sign-up");

  return (
    <div className="rounded-3xl bg-surface p-8 shadow-sm ring-1 ring-line sm:p-10">
      <div role="tablist" className="mb-8 grid grid-cols-2 rounded-full bg-canvas p-1">
        {(["sign-up", "sign-in"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => setMode(tab)}
            className={`rounded-full py-3 font-medium transition-colors ${
              mode === tab ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
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
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-medium">Username</span>
        <span className="flex items-center rounded-2xl bg-canvas px-5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
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
            className="w-full bg-transparent py-4 pl-1 text-xl outline-none"
          />
        </span>
        {isSignUp && <span className="text-sm text-muted">3 to 20 characters: a–z, 0–9 and hyphens.</span>}
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={isSignUp ? 8 : undefined}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="rounded-2xl bg-canvas px-5 py-4 text-xl ring-1 ring-line outline-none focus:ring-2 focus:ring-ink"
        />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingLabel={isSignUp ? "Creating account…" : "Signing in…"}>
        {isSignUp ? "Create account" : "Sign in"}
      </SubmitButton>
    </form>
  );
}
