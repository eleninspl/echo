"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { echo, type Analysis, type Idea, type Message } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { useAnalysis } from "@/lib/use-analysis";

import { Logo } from "./logo";

// The API takes the last 20 messages (docs/plan.md, API).
const HISTORY = 20;

const SUGGESTIONS: { ask: string; note: string; icon: ReactNode }[] = [
  {
    ask: "Younger listeners",
    note: "Guests for a younger slice of the audience",
    icon: (
      <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    ),
  },
  {
    ask: "Less famous guests",
    note: "Rising names over the obvious picks",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </>
    ),
  },
  {
    ask: "An episode about a film",
    note: "An episode built around one film",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4" />
      </>
    ),
  },
  {
    ask: "Make the first idea funnier",
    note: "A lighter take on the first idea",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01" />
      </>
    ),
  },
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
// button at the bottom right on every tab; the panel opens out of it, and closing it keeps the conversation.
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
      if (reply.action === "rewrite" && reply.guest_ref && reply.idea) {
        onRewrite(reply.guest_ref, reply.idea);
        close();
      }
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

  return (
    <div
      data-open={open || undefined}
      className="ask-dock pointer-events-none fixed right-2 bottom-2 z-40 sm:right-4 sm:bottom-4"
    >
      <div className="ask-shell pointer-events-auto relative flex h-[min(42rem,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-[28rem] flex-col rounded-[1.75rem] bg-deck shadow-[inset_0_0_0_1px_var(--steel)]">
        <section
          id="ask-panel"
          role="dialog"
          aria-label="Ask Echo"
          onKeyDown={keys}
          className="ask-body flex min-h-0 flex-1 flex-col"
        >
          <div className="flex justify-end p-3">
            <button
              type="button"
              onClick={close}
              aria-label="Close Ask Echo"
              title="Close"
              className="flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-deck-hi hover:text-ink"
            >
              <Collapse />
            </button>
          </div>

          <ol
            ref={log}
            role="log"
            aria-label="Conversation with Echo"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4 [scrollbar-width:thin]"
          >
            {!talking && (
              <li className="my-auto flex flex-col items-center gap-7 py-2 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Logo className="mb-2 size-14 text-ink" />
                  <h2 className="font-display text-2xl leading-tight font-semibold text-ink">
                    What should Echo change?
                  </h2>
                  <p className="max-w-[23rem] text-sm leading-relaxed text-balance text-ink-dim">
                    Ask for different guests or a new take on one idea. These guests stay until the new ones are ready.
                  </p>
                </div>
                {!offline && (
                  <ul aria-label="Suggestions" className="grid w-full grid-cols-2 gap-1">
                    {SUGGESTIONS.map(({ ask, note, icon }) => (
                      <li key={ask}>
                        <button
                          type="button"
                          onClick={() => {
                            send(ask);
                            input.current?.focus();
                          }}
                          disabled={pending}
                          className="group flex size-full cursor-pointer flex-col items-center gap-1 rounded-2xl px-3 py-4 transition-colors hover:bg-deck-hi disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            aria-hidden
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mb-2 size-6 text-ink-soft transition-colors group-hover:text-accent"
                          >
                            {icon}
                          </svg>
                          <span className="font-display text-[0.9375rem] font-semibold text-ink">{ask}</span>
                          <span className="text-xs leading-snug text-balance text-ink-dim">{note}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
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
                <span className="font-semibold text-alert">{describe(failed.error).title}.</span>{" "}
                {failed.error?.message} These guests are still the ones from before.
              </Line>
            )}
            {run.error && runId && (
              <Line who="Echo">
                <span className="font-semibold text-alert">{describe(run.error).title}.</span> {run.error.message}
              </Line>
            )}
          </ol>

          {offline ? (
            <p role="status" className="px-6 pb-1 text-sm text-ink-soft">
              Asking Echo isn&apos;t available in this demo yet. Everything else on the page works.
            </p>
          ) : (
            problem && (
              <p role="alert" className="px-6 pb-1 text-sm">
                <span className="font-semibold text-alert">{problem.title}.</span>{" "}
                <span className="text-ink-soft">{problem.message}</span>
              </p>
            )
          )}

          <form onSubmit={submit} className="flex py-2 pr-[4.5rem] pl-2">
            <div className="flex min-h-14 flex-1 items-end gap-2 rounded-[1.75rem] bg-deck-hi py-2 pr-2 pl-5 shadow-[inset_0_0_0_1px_var(--steel)] transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)] has-[textarea:disabled]:opacity-50">
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
                placeholder="Ask Echo something…"
                disabled={offline}
                className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-[0.9375rem] text-ink [field-sizing:content] placeholder:text-ink-dim focus-visible:outline-none! disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={offline || pending || !text.trim()}
                aria-label={pending ? "Asking" : "Send"}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-on-hue transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-steel disabled:text-ink-dim"
              >
                <Send />
              </button>
            </div>
          </form>
        </section>

        <button
          ref={bubble}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="ask-panel"
          aria-label={open ? "Close Ask Echo" : `Ask Echo${unread ? ", new reply" : ""}`}
          title={open ? undefined : "Ask Echo"}
          className="absolute right-2 bottom-2 flex size-14 cursor-pointer items-center justify-center rounded-full bg-accent text-on-hue transition hover:brightness-110 focus-visible:-outline-offset-4! focus-visible:outline-on-hue!"
        >
          <Logo className="size-8" />
          {!open && (busy || unread) && (
            <span
              aria-hidden
              className={`absolute top-2 right-2 size-3 rounded-full border-2 border-void bg-sweet ${busy ? "pulse" : ""}`}
            />
          )}
        </button>
      </div>
    </div>
  );
}

function Line({ who, children }: { who: string; children: ReactNode }) {
  const you = who === "You";
  return (
    <li className={`flex max-w-[85%] flex-col gap-1 ${you ? "self-end items-end" : "self-start"}`}>
      <span className={`tag px-1 text-[0.625rem] ${you ? "text-ink-dim" : "text-accent"}`}>{who}</span>
      <p
        className={`rounded-[1.25rem] border px-4 py-2.5 text-sm leading-relaxed text-ink ${you ? "rounded-br-md border-steel-hi bg-deck-hi" : "rounded-bl-md border-accent/25 bg-accent/8"}`}
      >
        {children}
      </p>
    </li>
  );
}

function Collapse() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
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
