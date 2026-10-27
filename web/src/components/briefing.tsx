"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { echo, type Idea } from "@/lib/echo";
import type { HostError } from "@/lib/errors";
import { writingProblem } from "@/lib/invitations";

import { CopyButton } from "./copy-button";
import { hue } from "./hud";
import { Markdown } from "./markdown";

type Load =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; markdown: string }
  | { state: "failed"; problem: HostError };

// The page to read before recording with one guest, written on request: an LLM call the first time, then kept by
// the engine with the analysis.
// `idea`: the guest's idea when the chat rewrote it.
export function Briefing({
  id,
  guestRef,
  guestName,
  idea,
  length,
}: {
  id: string;
  guestRef: string;
  guestName: string;
  idea?: Idea;
  length?: string;
}) {
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
      const { markdown } = await echo.briefing(id, guestRef, idea, length);
      setLoad({ state: "done", markdown });
    } catch (error) {
      setLoad({ state: "failed", problem: writingProblem(error, "briefings") });
    }
  }

  if (load.state === "done") {
    return (
      <div className="flex flex-col gap-4">
        <div className="screen max-w-3xl p-4 sm:p-6">
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
          <button type="button" onClick={() => setPrinting(true)} className="btn">
            Print
            <span className="sr-only"> the briefing for {guestName}</span>
          </button>
        </div>
      </div>
    );
  }

  const notSetUp = load.state === "failed" && load.problem.code === "not_implemented";
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-ink-soft">
        One page before you record: who they are, where your audiences meet, what to ask.
      </p>
      <button
        type="button"
        onClick={write}
        disabled={load.state === "loading" || notSetUp}
        className="btn btn-solid"
        style={hue("var(--ink)")}
      >
        {load.state === "loading" ? "Writing…" : "Write the briefing"}
        <span className="sr-only"> for {guestName}</span>
      </button>
      {load.state === "failed" && (
        <div role="alert" className="text-sm">
          <p className={`font-semibold ${notSetUp ? "text-ink" : "text-alert"}`}>{load.problem.title}</p>
          <p className="text-ink-soft">{load.problem.message}</p>
        </div>
      )}
    </div>
  );
}
