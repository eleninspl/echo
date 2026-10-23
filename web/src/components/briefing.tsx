"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { echo } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";

import { CopyButton } from "./copy-button";
import { hue } from "./gallery";
import { Markdown } from "./markdown";

type Load =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; markdown: string }
  | { state: "failed"; problem: HostError };

// The page to read before recording with one guest, written on request: it's an LLM call.
export function Briefing({ id, guestRef, guestName }: { id: string; guestRef: string; guestName: string }) {
  const [load, setLoad] = useState<Load>({ state: "idle" });
  const [printing, setPrinting] = useState(false);

  // Printing copies the briefing to the end of body, where the print styles show it alone (globals.css).
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    return () => window.removeEventListener("afterprint", done);
  }, [printing]);

  async function write() {
    setLoad({ state: "loading" });
    try {
      const { markdown } = await echo.briefing(id, guestRef);
      setLoad({ state: "done", markdown });
    } catch (error) {
      setLoad({ state: "failed", problem: describe(error) });
    }
  }

  if (load.state === "done") {
    return (
      <div className="flex flex-col gap-4">
        <div className="monitor max-w-3xl rounded-[2px] p-4 sm:p-6">
          <Markdown text={load.markdown} />
        </div>
        {printing &&
          createPortal(
            <div className="print-only">
              <Markdown text={load.markdown} />
            </div>,
            document.body,
          )}
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={load.markdown} label="Copy the briefing" of={guestName} />
          <button type="button" onClick={() => setPrinting(true)} className="key">
            Print
            <span className="sr-only"> the briefing for {guestName}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-ink-soft">
        One page before you record: who they are, where your audiences meet, what to ask.
      </p>
      <button
        type="button"
        onClick={write}
        disabled={load.state === "loading"}
        className="key key-lit"
        style={hue("var(--ink)")}
      >
        {load.state === "loading" ? "Writing…" : "Write the briefing"}
        <span className="sr-only"> for {guestName}</span>
      </button>
      {load.state === "failed" && (
        <div role="alert" className="text-sm">
          <p className="font-semibold text-amber">{load.problem.title}</p>
          <p className="text-ink-soft">{load.problem.message}</p>
        </div>
      )}
    </div>
  );
}
