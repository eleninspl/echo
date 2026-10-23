"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { echo, type Analysis, type Idea, type Message } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { useAnalysis } from "@/lib/use-analysis";

import { hue, Info, Lamp, PanelHead } from "./gallery";

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
// or rewrites one idea (L4). The previous analysis stays on screen until the new one is done.
export function Chat({ analysis, onRerun, onRewrite }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<HostError | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const log = useRef<HTMLOListElement>(null);

  const finished = useCallback(
    (next: Analysis) => {
      setRunId(null);
      const phrases = filterPhrases(next.filters);
      const note = `Done. The gallery shows the new run${phrases.length ? `: ${phrases.join(", ").toLowerCase()}` : ""}.`;
      setEntries((current) => [...current, { role: "assistant", content: note, note: true }]);
      onRerun(next);
    },
    [onRerun],
  );
  const run = useAnalysis(runId, finished);
  const running = runId !== null && run.analysis?.id === runId ? run.analysis : null;

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [entries, running]);

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

  const failed = runId !== null && run.analysis?.id === runId && run.analysis.status === "failed" ? run.analysis : null;
  const step = running?.steps.findIndex((s) => !s.done) ?? -1;
  // The engine answers "not built yet" while the LLM side isn't deployed: say so once, and stop offering asks.
  const offline = problem?.code === "not_implemented";
  const talking =
    entries.length > 0 || pending || running !== null || failed !== null || (run.error !== null && runId !== null);

  return (
    <section aria-labelledby="ask" className="panel flex flex-col rounded-[4px]">
      <PanelHead id="ask" title="Talkback · ask Echo">
        <span className="flex items-center gap-2">
          <Lamp
            color={offline ? "var(--balanced)" : "var(--amber)"}
            on={pending || running?.status === "running"}
            className={pending || running ? "cue size-2" : "size-2"}
          />
          {offline ? "Offline" : pending ? "Listening" : running?.status === "running" ? "Running again" : "Open"}
        </span>
        <Info>
          Ask for different guests in your own words, or for a new take on one idea. Echo runs again with the change,
          and these guests stay until the new ones are ready.
        </Info>
      </PanelHead>
      {!talking && !offline && (
        <ul aria-label="Suggestions" className="flex flex-wrap gap-1.5 px-2 pt-2">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => send(suggestion)}
                disabled={pending}
                className="key min-h-8 px-2.5 py-1 text-xs"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ol
        ref={log}
        role="log"
        aria-label="Conversation with Echo"
        className={
          talking
            ? "monitor m-2 mb-0 flex max-h-[22rem] min-h-24 flex-col gap-2 overflow-y-auto rounded-[2px] p-3"
            : "sr-only"
        }
      >
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
            <span className="font-semibold text-amber">{describe(failed.error).title}.</span> {failed.error?.message}{" "}
            These guests are still the ones from before.
          </Line>
        )}
        {run.error && runId && (
          <Line who="Echo">
            <span className="font-semibold text-amber">{describe(run.error).title}.</span> {run.error.message}
          </Line>
        )}
      </ol>

      {offline ? (
        <p role="status" className="mx-3 mt-3 text-sm text-ink-soft">
          Asking Echo isn&apos;t available in this demo yet. Everything else in the gallery works.
        </p>
      ) : (
        problem && (
          <p role="alert" className="mx-3 mt-2 text-sm">
            <span className="font-semibold text-amber">{problem.title}.</span>{" "}
            <span className="text-ink-soft">{problem.message}</span>
          </p>
        )
      )}

      <form onSubmit={submit} className="flex gap-2 p-2">
        <label htmlFor="ask-input" className="sr-only">
          Ask Echo
        </label>
        <textarea
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
          className="well min-h-10 min-w-0 flex-1 resize-none px-3 py-2 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={offline || pending || !text.trim()}
          className={`key ${offline ? "" : "key-lit"}`}
          style={hue("var(--amber)")}
        >
          {pending ? "Asking…" : "Talk"}
        </button>
      </form>
    </section>
  );
}

function Line({ who, children }: { who: string; children: ReactNode }) {
  const you = who === "You";
  return (
    <li className={`flex max-w-[92%] flex-col gap-1 ${you ? "self-end items-end" : "self-start"}`}>
      <span className={`silk text-[0.5625rem] ${you ? "text-amber" : "text-fit"}`}>{who}</span>
      <p className={`rounded-[3px] px-3 py-2 text-sm ${you ? "bg-amber/12 text-ink" : "bg-bezel text-ink"}`}>
        {children}
      </p>
    </li>
  );
}
