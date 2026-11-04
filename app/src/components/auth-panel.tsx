"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/auth-actions";
import { IDLE_FORM_STATE } from "@/app/form-state";
import { FIELD, FIELD_AFFIX, FIELD_INPUT, SEGMENT_TRACK, segmentClasses } from "./control-styles";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type Mode = "sign-up" | "sign-in";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("sign-up");

  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <div role="tablist" aria-label="Account" className={`mb-5 ${SEGMENT_TRACK}`}>
        {(["sign-up", "sign-in"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => setMode(tab)}
            className={segmentClasses(mode === tab)}
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
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="px-1 text-[0.9375rem] font-semibold">Username</span>
        <span className={FIELD}>
          <span className={FIELD_AFFIX}>@</span>
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
            className={FIELD_INPUT}
          />
        </span>
        {isSignUp && (
          <span className="px-1 text-[0.8125rem] font-medium text-muted">3 to 20 characters: a–z, 0–9 and hyphens.</span>
        )}
      </label>
      <label className="flex flex-col gap-2">
        <span className="px-1 text-[0.9375rem] font-semibold">Password</span>
        <span className={FIELD}>
          <input
            name="password"
            type="password"
            required
            minLength={isSignUp ? 8 : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className={FIELD_INPUT}
          />
        </span>
      </label>
      <FormMessage state={state} />
      <div className="pt-1">
        <SubmitButton pendingLabel={isSignUp ? "Creating account…" : "Signing in…"}>
          {isSignUp ? "Create account" : "Sign in"}
        </SubmitButton>
      </div>
    </form>
  );
}
