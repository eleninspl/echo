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

import {
  echo,
  type Analysis,
  type Idea,
  type LeaveOutWhy,
  type MapFocus,
  type Message,
  type TasteAsk,
} from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { showTastes, type Ask } from "@/lib/pointer";
import { useAnalysis } from "@/lib/use-analysis";

import { Picture } from "./guest-list";
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
    ask: "An episode about road trips",
    note: "New ideas around one theme",
    icon: (
      <>
        <path d="M5 21 9 3M19 21 15 3" />
        <path d="M12 5v2M12 11v2M12 17v2" />
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
type Named = { id: string; name: string };
type Entry = Message & { note?: boolean; guests?: Named[]; map?: MapFocus };

// The conversation per run, so it survives a reload and another page, and goes along to a rerun started from it.
// Kept short.
const KEPT = 60;
const historyKey = (analysisId: string) => `echo.chat.run.${analysisId}`;
// Once the engine says it has no writing model, for the rest of this visit.
const NO_WRITER = "echo.chat.no-writer";

function readHistory(analysisId: string): Entry[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(historyKey(analysisId)) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (entry): entry is Entry =>
        (entry?.role === "user" || entry?.role === "assistant") && typeof entry.content === "string",
    );
  } catch {
    return [];
  }
}

function saveHistory(analysisId: string, entries: Entry[]) {
  try {
    if (entries.length) window.localStorage.setItem(historyKey(analysisId), JSON.stringify(entries.slice(-KEPT)));
    else window.localStorage.removeItem(historyKey(analysisId));
  } catch {
    return;
  }
}

export function carryChat(fromId: string, toId: string, note: string) {
  if (fromId === toId) return;
  const entries = readHistory(fromId);
  if (entries.length) saveHistory(toId, [...entries, { role: "assistant", content: note, note: true }]);
}

function readNoWriter(): boolean {
  try {
    return window.sessionStorage.getItem(NO_WRITER) === "1";
  } catch {
    return false;
  }
}

function saveNoWriter() {
  try {
    window.sessionStorage.setItem(NO_WRITER, "1");
  } catch {
    return;
  }
}

type Props = {
  analysis: Analysis;
  exclude: string[];
  // Called when a run the chat started is done, to show it in place of the current one.
  onRerun: (analysis: Analysis) => void;
  onRewrite: (guestRef: string, idea: Idea) => void;
  onLeaveOut: (guestRef: string, why: LeaveOutWhy) => void;
  onPoint?: (focus: MapFocus) => void;
  onOpenGuest?: (guestRef: string) => void;
  onAsker?: (ask: ((ask: Ask) => void) | null) => void;
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
export function Chat({
  analysis,
  exclude,
  onRerun,
  onRewrite,
  onLeaveOut,
  onPoint,
  onOpenGuest,
  onAsker,
  beside = false,
  slot = null,
}: Props) {
  const runId = analysis.id;
  const [history, setHistory] = useState(() => ({ runId, entries: readHistory(runId) }));
  if (history.runId !== runId) setHistory({ runId, entries: readHistory(runId) });
  const entries = history.entries;
  const setEntries = useCallback(
    (change: (current: Entry[]) => Entry[]) =>
      setHistory((current) => ({ ...current, entries: change(current.entries) })),
    [],
  );
  const [noWriter, setNoWriter] = useState(readNoWriter);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<HostError | null>(null);
  const [rerunId, setRerunId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => entries.length);
  const log = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const bubble = useRef<HTMLButtonElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const docked = useRef<HTMLElement>(null);
  const landedBubble = useRef<HTMLSpanElement>(null);
  const wasLanded = useRef(false);
  const [near, setNear] = useState(false);
  const landed = slot !== null && near;

  useEffect(() => saveHistory(history.runId, history.entries), [history]);
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
      setRerunId(null);
      const phrases = filterPhrases(next.filters);
      const note = `Done. The page shows the new run${phrases.length ? `: ${phrases.map(lowerFirst).join(", ")}` : ""}.`;
      carryChat(runId, next.id, note);
      onRerun(next);
    },
    [onRerun, runId],
  );
  const run = useAnalysis(rerunId, finished);
  const running = rerunId !== null && run.analysis?.id === rerunId ? run.analysis : null;

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

  function restart() {
    setEntries(() => []);
    setProblem(null);
    setRerunId(null);
    setSeen(0);
    input.current?.focus();
  }

  function pointAt(focus: MapFocus) {
    onPoint?.(focus);
    if (!landed) close();
    showTastes();
  }

  function openGuest(guest: Named) {
    const ref = analysis.guests.find((one) => one.id === guest.id)?.ref;
    if (!ref) return;
    if (!landed) close();
    onOpenGuest?.(ref);
  }

  async function send(message: string, taste?: TasteAsk) {
    const content = message.trim();
    if (!content || pending || noWriter) return;
    const next: Entry[] = [...entries, { role: "user", content }];
    setEntries(() => next);
    setText("");
    setPending(true);
    setProblem(null);
    setRerunId(null);
    try {
      const history = next.filter((entry) => !entry.note).map(({ role, content }) => ({ role, content }));
      const reply = await echo.chat(analysis.id, history.slice(-HISTORY), exclude, taste);
      const guests = (reply.guest_refs ?? []).flatMap((ref) => {
        const guest = analysis.guests.find((one) => one.ref === ref);
        return guest ? [{ id: guest.id, name: guest.name }] : [];
      });
      setEntries((current) => [
        ...current,
        {
          role: "assistant",
          content: reply.reply,
          ...(guests.length ? { guests } : {}),
          ...(reply.map ? { map: reply.map } : {}),
        },
      ]);
      if (reply.map) onPoint?.(reply.map);
      if (reply.action === "rerun" && reply.analysis_id && reply.analysis_id !== analysis.id)
        setRerunId(reply.analysis_id);
      if (reply.action === "leave_out" && reply.guest_ref) onLeaveOut(reply.guest_ref, reply.why ?? "not_for_us");
      if (reply.action === "rewrite" && reply.guest_ref && reply.idea) {
        onRewrite(reply.guest_ref, reply.idea);
        close();
      }
    } catch (error) {
      const problem = describe(error);
      if (problem.code === "not_implemented") {
        saveNoWriter();
        setNoWriter(true);
        // Unanswered, so it isn't worth keeping.
        setEntries((current) => current.slice(0, -1));
      } else setProblem(problem);
    }
    setPending(false);
  }

  useEffect(() => {
    if (!onAsker) return;
    onAsker((ask) => {
      if (!landed) {
        setSeen(entries.length);
        setOpen(true);
      }
      send(ask.text, ask.taste);
    });
    return () => onAsker(null);
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(text);
  }

  function keys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") close();
  }

  const failed =
    rerunId !== null && run.analysis?.id === rerunId && run.analysis.status === "failed" ? run.analysis : null;
  const step = running?.steps.findIndex((s) => !s.done) ?? -1;
  // The engine answers "not built yet" when the server has no writing model: say so, and stop offering asks.
  const offline = noWriter;
  const talking =
    entries.length > 0 || pending || running !== null || failed !== null || (run.error !== null && rerunId !== null);

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
            {docked || offline ? (
              <Logo className={`size-11 ${offline ? "text-ink-dim" : "text-brand"}`} />
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
          <Line
            key={index}
            who={entry.role === "user" ? "You" : "Echo"}
            after={
              (entry.guests?.length || entry.map) && (
                <span className="flex flex-wrap gap-1.5 px-1">
                  {entry.guests?.map((guest) => {
                    const here = analysis.guests.find((one) => one.id === guest.id);
                    return (
                      <button
                        key={guest.id}
                        type="button"
                        disabled={!here}
                        onClick={() => openGuest(guest)}
                        title={here ? `Open ${guest.name}` : `${guest.name} isn't in this run`}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-deck-hi py-1 pr-3 pl-1 text-xs font-semibold text-ink transition-colors enabled:hover:bg-steel disabled:opacity-50"
                      >
                        <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-well">
                          {here && <Picture guest={here} sizes="24px" small />}
                        </span>
                        {guest.name}
                      </button>
                    );
                  })}
                  {entry.map && (
                    <button
                      type="button"
                      onClick={() => entry.map && pointAt(entry.map)}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-brand/25"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
                        <g fill="none" stroke="currentColor" strokeWidth="1.4">
                          <circle cx="8" cy="8" r="2" />
                          <circle cx="8" cy="8" r="5.5" />
                        </g>
                      </svg>
                      See it on the taste map
                    </button>
                  )}
                </span>
              )
            }
          >
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
        {run.error && rerunId && (
          <Line who="Echo">
            <span className="font-semibold text-alert">{describe(run.error).title}.</span> {run.error.message}
          </Line>
        )}
      </ol>

      {problem && !offline && (
        <p role="alert" className="px-6 pb-1 text-sm">
          <span className="font-semibold text-alert">{problem.title}.</span>{" "}
          <span className="text-ink-soft">{problem.message}</span>
        </p>
      )}

      {offline ? (
        <div className="py-2 pr-[4.5rem] pl-2">
          <p
            role="status"
            className="flex min-h-14 items-center gap-3 rounded-[1.75rem] border border-dashed border-steel-hi px-5 py-3 text-sm leading-snug text-ink-soft"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="size-5 shrink-0 text-ink-dim"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M8 16 16 8" />
            </svg>
            <span>
              <span className="font-semibold text-ink">Ask Echo is off on this server.</span> It needs a writing model,
              and none is set up here. Everything else on the page works.
            </span>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex py-2 pr-[4.5rem] pl-2">
          <div className="flex min-h-14 flex-1 items-end gap-2 rounded-[1.75rem] bg-deck-hi py-2 pr-2 pl-5 shadow-[inset_0_0_0_1px_var(--steel)] transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]">
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
              className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-[0.9375rem] text-ink [field-sizing:content] placeholder:text-ink-dim focus-visible:outline-none!"
            />
            <button
              type="submit"
              disabled={pending || !text.trim()}
              aria-label={pending ? "Asking" : "Send"}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-on-hue transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-steel disabled:text-ink-dim"
            >
              <Send />
            </button>
          </div>
        </form>
      )}
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
              <div className="flex justify-end gap-1 p-3">
                {entries.length > 0 && !busy && (
                  <button
                    type="button"
                    onClick={restart}
                    aria-label="Start a new conversation"
                    title="New conversation"
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-deck-hi hover:text-ink"
                  >
                    <Restart />
                  </button>
                )}
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
              <div className="dock-body flex min-h-0 flex-1 flex-col pt-5">
                {entries.length > 0 && !busy && (
                  <div className="-mt-2 flex justify-end px-3">
                    <button
                      type="button"
                      onClick={restart}
                      aria-label="Start a new conversation"
                      title="New conversation"
                      className="flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-deck-hi hover:text-ink"
                    >
                      <Restart />
                    </button>
                  </div>
                )}
                {conversation(true)}
              </div>
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

// "In Canada" reads "in Canada" mid-sentence: only the first letter changes.
function lowerFirst(phrase: string): string {
  return phrase.charAt(0).toLowerCase() + phrase.slice(1);
}

function Line({ who, children, after }: { who: string; children: ReactNode; after?: ReactNode }) {
  const you = who === "You";
  return (
    <li className={`flex max-w-[85%] flex-col gap-1 ${you ? "self-end items-end" : "self-start"}`}>
      <span className={`tag px-1 text-[0.625rem] ${you ? "text-ink-dim" : "text-accent"}`}>{who}</span>
      <p
        className={`rounded-[1.25rem] border px-4 py-2.5 text-sm leading-relaxed text-ink ${you ? "rounded-br-md border-steel-hi bg-deck-hi" : "rounded-bl-md border-accent/25 bg-accent/8"}`}
      >
        {children}
      </p>
      {after}
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

function Restart() {
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
      <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
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
  { what: "An episode about something", how: "A theme like road trips, or a film, show, artist or brand by name." },
  { what: "A new take on one idea", how: "Echo rewrites a guest's episode idea the way you describe." },
  { what: "Leave a guest out", how: "Say who you've had on or who isn't right, and they stay out of every run." },
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
