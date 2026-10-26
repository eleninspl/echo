"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";

import { echo, type Analysis, type Idea, type Message } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { useAnalysis } from "@/lib/use-analysis";

import { SectionHead, SHEET_CLEAR } from "./hud";
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
  beside?: boolean;
  slot?: HTMLElement | null;
};

const LAND = 36;
const FLIGHT = 600;
const REDUCED = "(prefers-reduced-motion: reduce)";

// The agent: the host asks for a change in their own words, and Echo runs again with new filters
// or rewrites one idea (L4). The previous analysis stays on screen until the new one is done. A round
// button at the bottom right on every page, left of an open guest; the panel opens out of it, and closing it keeps the conversation.
// Scrolled down to the page's Ask Echo section, the button flies into it and the conversation opens there.
export function Chat({ analysis, onRerun, onRewrite, beside = false, slot = null }: Props) {
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
  const dock = useRef<HTMLDivElement>(null);
  const docked = useRef<HTMLElement>(null);
  const landedBubble = useRef<HTMLSpanElement>(null);
  const wasLanded = useRef(false);
  const [near, setNear] = useState(false);
  const landed = slot !== null && near;
  if (landed && open) setOpen(false);
  if (landed && seen !== entries.length) setSeen(entries.length);

  useEffect(() => {
    if (!slot) return;
    const seen = new IntersectionObserver(
      ([entry]) => setNear((was) => (was ? entry.intersectionRatio > 0.12 : entry.intersectionRatio > 0.5)),
      { threshold: [0, 0.12, 0.25, 0.5, 0.75, 1] },
    );
    seen.observe(slot);
    return () => seen.disconnect();
  }, [slot]);

  useLayoutEffect(() => {
    const element = dock.current;
    const button = bubble.current;
    const was = wasLanded.current;
    wasLanded.current = landed;
    if (!element || !button) return;
    element.style.opacity = landed ? "0" : "";
    if (landed === was || !slot || matchMedia(REDUCED).matches) return;
    const from = button.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    const dx = to.right - LAND - (from.left + from.width / 2);
    const dy = to.bottom - LAND - (from.top + from.height / 2);
    if (!landed) {
      element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
        duration: 520,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
      return;
    }
    landedBubble.current?.animate([{ transform: `translate(${-dx}px, ${-dy}px)` }, { transform: "none" }], {
      duration: FLIGHT,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
    });
    const at = `calc(100% - ${LAND}px) calc(100% - ${LAND}px)`;
    docked.current?.animate([{ clipPath: `circle(0px at ${at})` }, { clipPath: `circle(150% at ${at})` }], {
      duration: 800,
      delay: FLIGHT - 60,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "backwards",
    });
    docked.current
      ?.querySelector(".dock-body")
      ?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: FLIGHT + 260, fill: "backwards" });
  }, [landed, slot]);

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
  }, [entries, running, open, landed]);

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

  const conversation = (docked: boolean) => (
    <>
      <ol
        ref={log}
        role="log"
        aria-label="Conversation with Echo"
        className={`flex min-h-0 flex-1 flex-col gap-3 px-5 pb-4 [scrollbar-width:thin] ${talking || !docked ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {!talking && (
          <li className="my-auto flex flex-col items-center gap-7 py-2 text-center">
            {docked ? (
              <Logo className="size-11 text-brand" />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Logo className="mb-2 size-14 text-brand" />
                <h2 className="font-display text-2xl leading-tight font-semibold text-ink">What should Echo change?</h2>
                <p className="max-w-[23rem] text-sm leading-relaxed text-balance text-ink-dim">
                  Ask for different guests or a new take on one idea. These guests stay until the new ones are ready.
                </p>
              </div>
            )}
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
    </>
  );

  return (
    <>
      <div
        ref={dock}
        inert={landed}
        data-open={(open && !landed) || undefined}
        className={`ask-dock pointer-events-none fixed right-2 bottom-2 z-40 sm:right-4 sm:bottom-4 ${beside ? SHEET_CLEAR : ""}`}
      >
        <div className="ask-shell pointer-events-auto relative flex h-[min(42rem,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-[28rem] flex-col rounded-[1.75rem] bg-deck shadow-[inset_0_0_0_1px_var(--steel)]">
          {!landed && (
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
              {conversation(false)}
            </section>
          )}

          <button
            ref={bubble}
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="ask-panel"
            aria-label={open ? "Close Ask Echo" : `Ask Echo${unread ? ", new reply" : ""}`}
            title={open ? undefined : "Ask Echo"}
            className="absolute right-2 bottom-2 flex size-14 cursor-pointer items-center justify-center rounded-full bg-accent text-brand transition hover:brightness-110 focus-visible:-outline-offset-4! focus-visible:outline-on-hue!"
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
      {landed &&
        slot &&
        createPortal(
          <div className="absolute inset-0">
            <section
              ref={docked}
              aria-label="Ask Echo"
              className="absolute inset-0 flex flex-col rounded-[1.75rem] bg-deck shadow-[inset_0_0_0_1px_var(--steel)]"
            >
              <div className="dock-body flex min-h-0 flex-1 flex-col pt-5">{conversation(true)}</div>
            </section>
            <span
              ref={landedBubble}
              aria-hidden
              className="absolute right-2 bottom-2 flex size-14 items-center justify-center rounded-full bg-accent text-brand shadow-[0_10px_18px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
            >
              <Logo className="size-8" />
            </span>
          </div>,
          slot,
        )}
    </>
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

const ASKS = [
  { what: "Different guests", how: "Younger listeners, less famous names, guests from one country." },
  { what: "An episode about something", how: "A film, a show, an artist or a brand your listeners love." },
  { what: "A new take on one idea", how: "Echo rewrites a guest's episode idea the way you describe." },
];

export function AskSection({ onSlot }: { onSlot: Dispatch<SetStateAction<HTMLElement | null>> }) {
  return (
    <section
      aria-labelledby="ask-echo"
      className="grid grid-cols-1 gap-x-20 gap-y-8 border-t border-steel pt-14 @4xl:grid-cols-[minmax(0,34rem)_minmax(0,30rem)] @4xl:items-center @4xl:justify-center"
    >
      <div className="flex flex-col gap-5">
        <SectionHead id="ask-echo" title="Not quite right? Ask Echo" />
        <p className="max-w-[56ch] text-lg text-ink-soft">
          Tell Echo what you want in your own words. It runs again with your change and keeps these guests on screen
          until the new ones are ready.
        </p>
        <ul className="flex max-w-xl flex-col border-t border-steel">
          {ASKS.map(({ what, how }) => (
            <li key={what} className="flex flex-col gap-0.5 border-b border-steel py-3">
              <span className="font-display font-semibold">{what}</span>
              <span className="text-sm text-ink-dim">{how}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        ref={(element) => {
          if (element) onSlot(element);
          return () => onSlot((current) => (current === element ? null : current));
        }}
        className="relative h-[30rem]"
      >
        <span
          aria-hidden
          className="absolute right-2 bottom-2 size-14 rounded-full border-2 border-dashed border-steel-hi"
        />
      </div>
    </section>
  );
}
