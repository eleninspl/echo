"use client";

import { useState } from "react";

import { hue } from "./hud";

// Copies text and says so; if the browser refuses, says that instead. `of` names what's copied for
// screen readers, where several copy buttons sit on one page.
export function CopyButton({ text, label = "Copy", of }: { text: string; label?: string; of?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className={`btn ${state === "copied" ? "btn-solid" : ""}`}
        style={hue("var(--ink)")}
      >
        {state === "copied" ? "Copied" : label}
        {of && <span className="sr-only">, {of}</span>}
      </button>
      <span aria-live="polite" className="text-sm text-ink-soft">
        {state === "copied" ? (
          <span className="sr-only">Copied</span>
        ) : state === "failed" ? (
          "Your browser blocked it: select the text and copy it"
        ) : (
          ""
        )}
      </span>
    </span>
  );
}
