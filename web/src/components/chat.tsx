"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { echo, type Analysis, type Idea, type Message } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { useAnalysis } from "@/lib/use-analysis";

import { Lamp } from "./hud";
import { Logo } from "./logo";

// The API takes the last 20 messages (docs/plan.md, API).
const HISTORY = 20;

const SUGGESTIONS = [
  "Younger listeners",
  "Less famous guests",
  "An episode about a film",
  "Make the first idea funnier",
];

// A note is shown in the transcript but never sent: Echo's own word on a run it started.
type Entry = Message & { note?: boolean };

type Props = {
  analysis: Analysis;
  // Called when a run the chat started is done, to show it in place of the current one.
  onRerun: (analysis: Analysis) => void;
  onRewrite: (guestRef: string, idea: Idea) => void;
};

// The agent: the host asks for a change in their own words, and Echo runs again with new filters
// or rewrites one idea (L4). The previous analysis stays on screen until the new one is done. A round
// button at the bottom right on every tab opens the conversation above it; closing it keeps the conversation.
export function Chat({ analysis, onRerun, onRewrite }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<HostError | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const log = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bubble = useRef<HTMLButtonElement>(null);

  const finished = useCallback(
    (next: Analysis) => {
      setRunId(null);
      const phrases = filterPhrases(next.filters);
      const note = `Done. The page shows the new run${phrases.length ? `: ${phrases.join(", ").toLowerCase()}` : ""}.`;
      setEntries((current) => [...current, { role: "assistant", content: note, note: true }]);
      onRerun(next);
    },
    [onRerun],
  );
  const run = useAnalysis(runId, finished);
  const running = runId !== null && run.analysis?.id === runId ? run.analysis : null;

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [entries, running, open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  function toggle() {
    if (open) setSeen(entries.length);
    setOpen(!open);
  }

  function close() {
    setSeen(entries.length);
    setOpen(false);
    bubble.current?.focus();
  }

  async function send(message: string) {
    const content = message.trim();
    if (!content || pending) return;
    const next: Entry[] = [...entries, { role: "user", content }];
    setEntries(next);
    setText("");
    setPending(true);
    setProblem(null);
    setRunId(null);
    try {
      const history = next.filter((entry) => !entry.note).map(({ role, content }) => ({ role, content }));
      const reply = await echo.chat(analysis.id, history.slice(-HISTORY));
      setEntries((current) => [...current, { role: "assistant", content: reply.reply }]);
      if (reply.action === "rerun" && reply.analysis_id && reply.analysis_id !== analysis.id)
        setRunId(reply.analysis_id);
      if (reply.action === "rewrite" && reply.guest_ref && reply.idea) onRewrite(reply.guest_ref, reply.idea);
    } catch (error) {
      setProblem(describe(error));
    }
    setPending(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(text);
  }

  function keys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") close();
  }

  const failed = runId !== null && run.analysis?.id === runId && run.analysis.status === "failed" ? run.analysis : null;
  const step = running?.steps.findIndex((s) => !s.done) ?? -1;
  // The engine answers "not built yet" while the LLM side isn't deployed: say so once, and stop offering asks.
  const offline = problem?.code === "not_implemented";
  const talking =
    entries.length > 0 || pending || running !== null || failed !== null || (run.error !== null && runId !== null);

  const busy = pending || running?.status === "running";
  const unread = !open && entries.length > seen;
  const status = offline
    ? "Offline"
    : pending
      ? "Listening"
      : running?.status === "running"
        ? "Running again"
        : "Ready";

  return (
    <>
      <section
        id="ask-panel"
        role="dialog"
        aria-labelledby="ask"
        onKeyDown={keys}
        className={`zone fixed right-4 bottom-22 z-40 flex max-h-[calc(100dvh-9rem)] w-[calc(100vw-2rem)] max-w-[26rem] origin-bottom-right flex-col shadow-[0_24px_60px_rgb(0_0_0/0.8)] motion-reduce:transition-none sm:right-6 sm:bottom-24 ${
          open
            ? "visible translate-y-0 scale-100 opacity-100 [transition:opacity_220ms_var(--ease-out),translate_220ms_var(--ease-out),scale_220ms_var(--ease-out),visibility_0s]"
            : "invisible translate-y-3 scale-95 opacity-0 [transition:opacity_160ms_ease-in,translate_160ms_ease-in,scale_160ms_ease-in,visibility_0s_160ms]"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-steel py-2 pr-2 pl-4">
          <h2 id="ask" className="flex items-center gap-2.5 font-display text-[0.9375rem] font-semibold text-ink">
            <Logo className="size-5 text-fit" />
            Ask Echo
          </h2>
          <div className="flex items-center gap-2">
            <span className="tag flex items-center gap-1.5 text-ink-dim">
              <Lamp
                color={offline ? "var(--balanced)" : "var(--fit)"}
                on={!offline}
                className={busy ? "blink size-1.5" : "size-1.5"}
              />
              {status}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close Ask Echo"
              className="flex size-8 cursor-pointer items-center justify-center rounded-[2px] text-ink-dim transition-colors hover:bg-deck-hi hover:text-ink"
            >
              <Cross />
            </button>
          </div>
        </div>

        <ol
          ref={log}
          role="log"
          aria-label="Conversation with Echo"
          className="flex min-h-40 flex-1 flex-col gap-3 overflow-y-auto p-4 [scrollbar-width:thin]"
        >
          {!talking && (
            <li className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                Ask for different guests in your own words, or for a new take on one idea. Echo runs again, and these
                guests stay until the new ones are ready.
              </p>
              {!offline && (
                <div className="flex flex-col gap-2">
                  <span id="ask-try" className="tag text-ink-dim">
                    Try
                  </span>
                  <ul aria-labelledby="ask-try" className="flex flex-col gap-1.5">
                    {SUGGESTIONS.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          type="button"
                          onClick={() => send(suggestion)}
                          disabled={pending}
                          className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-[2px] border border-steel px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:border-fit/50 hover:bg-fit/8 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {suggestion}
                          <Arrow className="size-3.5 shrink-0 text-fit opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )}
          {entries.map((entry, index) => (
            <Line key={index} who={entry.role === "user" ? "You" : "Echo"}>
              {entry.content}
            </Line>
          ))}
          {pending && <Line who="Echo">…</Line>}
          {running?.status === "running" && (
            <Line who="Echo">
              Running again: {step >= 0 ? running.steps[step].label.toLowerCase() : "finishing"}
              {step >= 0 && `, step ${step + 1} of ${running.steps.length}`}.
            </Line>
          )}
          {failed && (
            <Line who="Echo">
              <span className="font-semibold text-alert">{describe(failed.error).title}.</span> {failed.error?.message}{" "}
              These guests are still the ones from before.
            </Line>
          )}
          {run.error && runId && (
            <Line who="Echo">
              <span className="font-semibold text-alert">{describe(run.error).title}.</span> {run.error.message}
            </Line>
          )}
        </ol>

        <div className="flex flex-col gap-2 border-t border-steel px-4 py-3">
          {offline ? (
            <p role="status" className="text-sm text-ink-soft">
              Asking Echo isn&apos;t available in this demo yet. Everything else on the page works.
            </p>
          ) : (
            problem && (
              <p role="alert" className="text-sm">
                <span className="font-semibold text-alert">{problem.title}.</span>{" "}
                <span className="text-ink-soft">{problem.message}</span>
              </p>
            )
          )}
          <form onSubmit={submit} className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2 rounded-[2px] border border-steel-hi bg-well py-1.5 pr-1.5 pl-3 shadow-[inset_0_2px_6px_rgb(0_0_0/0.6)] transition-[border-color,box-shadow] duration-150 focus-within:border-fit focus-within:shadow-[inset_0_2px_6px_rgb(0_0_0/0.6),0_0_0_3px_color-mix(in_srgb,var(--fit)_18%,transparent)] hover:not-focus-within:border-ink-dim has-[textarea:disabled]:opacity-50">
              <label htmlFor="ask-input" className="sr-only">
                Ask Echo
              </label>
              <textarea
                ref={input}
                id="ask-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(text);
                  }
                }}
                maxLength={2000}
                rows={1}
                placeholder="Younger listeners, less famous guests…"
                disabled={offline}
                className="max-h-32 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm text-ink [field-sizing:content] placeholder:text-ink-dim focus-visible:outline-none! disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={offline || pending || !text.trim()}
                aria-label={pending ? "Asking" : "Send"}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[2px] bg-fit text-on-hue transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-steel disabled:text-ink-dim"
              >
                <Send />
              </button>
            </div>
            {!offline && <p className="tag text-[0.6875rem] text-ink-dim">Enter to send, Shift+Enter for a new line</p>}
          </form>
        </div>
      </section>

      <button
        ref={bubble}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="ask-panel"
        aria-label={open ? "Close Ask Echo" : `Ask Echo${unread ? ", new reply" : ""}`}
        title={open ? undefined : "Ask Echo"}
        className="fixed right-4 bottom-4 z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-fit text-on-hue shadow-[0_10px_30px_-6px_color-mix(in_srgb,var(--fit)_55%,transparent)] transition hover:brightness-110 sm:right-6 sm:bottom-6"
      >
        {open ? <Cross className="size-4" /> : <Logo className="size-8" />}
        {!open && (busy || unread) && (
          <span
            aria-hidden
            className={`absolute top-0.5 right-0.5 size-3.5 rounded-full border-2 border-void bg-sweet ${busy ? "blink" : ""}`}
          />
        )}
      </button>
    </>
  );
}

function Line({ who, children }: { who: string; children: ReactNode }) {
  const you = who === "You";
  return (
    <li className={`flex max-w-[92%] flex-col gap-1 ${you ? "self-end items-end" : "self-start"}`}>
      <span className={`tag text-[0.625rem] ${you ? "text-ink-soft" : "text-fit"}`}>{who}</span>
      <p
        className={`rounded-[2px] border px-3 py-2 text-sm text-ink ${you ? "border-steel-hi bg-deck-hi" : "border-fit/30 bg-fit/8"}`}
      >
        {children}
      </p>
    </li>
  );
}

function Cross({ className = "size-3" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className={className}>
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Send() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4">
      <path d="M8 13V3.5M3.5 8 8 3.5 12.5 8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
