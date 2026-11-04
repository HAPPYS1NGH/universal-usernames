"use client";

import { useState } from "react";
import { QUIET_BUTTON } from "./control-styles";
import { CheckIcon, CopyIcon } from "./icons";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      // Clipboard access can be denied (permissions, insecure origin). Tell the
      // user so they can select the text by hand.
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" onClick={copy} className={`${QUIET_BUTTON} pr-5 pl-4`}>
      {state === "copied" ? <CheckIcon className="size-5 text-up" /> : <CopyIcon className="size-5" />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}</span>
    </button>
  );
}
