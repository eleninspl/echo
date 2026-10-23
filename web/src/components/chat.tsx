"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { echo, type Analysis, type Idea, type Message } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { useAnalysis } from "@/lib/use-analysis";

// The API takes the last 20 messages (docs/plan.md, API).
const HISTORY = 20;

const SUGGESTIONS = ["Younger listeners", "Less famous guests", "An episode about a film", "Make the first idea funnier"];

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
      const note = `Done. The guests below are the new run${phrases.length ? `: ${phrases.join(", ").toLowerCase()}` : ""}.`;
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
      if (reply.action === "rerun" && reply.analysis_id && reply.analysis_id !== analysis.id) setRunId(reply.analysis_id);
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

  return (
    <section aria-labelledby="ask" className="border-b-2 border-ink">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-4">
          <h2 id="ask" className="font-display text-5xl leading-none font-extrabold uppercase">
            Ask Echo
          </h2>
          <p className="mt-3 text-ink-soft">
            Ask for different guests in your own words, or for a new take on one idea. Echo runs again with the change,
            and these guests stay until the new ones are ready.
          </p>
          <ul aria-label="Try" className="mt-5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={pending}
                  className="border border-ink px-3 py-1 text-sm hover:bg-ink hover:text-stock disabled:opacity-60"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 md:col-span-8">
          <ol
            ref={log}
            role="log"
            aria-label="Conversation with Echo"
            className="flex max-h-[28rem] min-h-32 flex-col overflow-y-auto border-t-2 border-ink"
          >
            {entries.length === 0 && (
              <li className="py-4 text-ink-soft">Echo answers here.</li>
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
                <span className="font-semibold">{describe(failed.error).title}.</span> {failed.error?.message} These guests
                are still the ones from before.
              </Line>
            )}
            {run.error && runId && (
              <Line who="Echo">
                <span className="font-semibold">{describe(run.error).title}.</span> {run.error.message}
              </Line>
            )}
          </ol>

          {problem && (
            <p role="alert" className="text-sm">
              <span className="font-semibold">{problem.title}.</span> {problem.message}
            </p>
          )}

          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
              rows={2}
              placeholder="Younger listeners, an episode about a film, less famous guests…"
              className="min-w-0 flex-1 resize-none border-2 border-ink bg-well px-3 py-2 text-ink placeholder:text-ink-soft"
            />
            <button
              type="submit"
              disabled={pending || !text.trim()}
              className="bg-ink px-5 py-2.5 font-semibold text-stock hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Asking…" : "Ask"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Line({ who, children }: { who: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[4rem_1fr] gap-x-4 border-b border-rule py-3">
      <span className="pt-0.5 font-display text-lg leading-none font-extrabold uppercase">{who}</span>
      <p className="max-w-prose">{children}</p>
    </li>
  );
}
