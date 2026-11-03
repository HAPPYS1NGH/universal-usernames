"use client";

import { useState } from "react";
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
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-raised pr-5 pl-4 font-semibold transition-[background-color,transform] duration-150 ease-out hover:bg-line active:scale-[0.96]"
    >
      {state === "copied" ? <CheckIcon className="size-5 text-up" /> : <CopyIcon className="size-5" />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}</span>
    </button>
  );
}
