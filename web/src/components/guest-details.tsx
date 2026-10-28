"use client";

import { useEffect, useState, type ReactNode } from "react";

import { echo, type Episode, type GuestDetails as Details, type Idea, type MapRow } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";

import { FansVenn } from "./fans-venn";
import { Lamp, Part } from "./hud";

type Load = { state: "loading" } | { state: "done"; details: Details } | { state: "failed"; problem: HostError };

const loaded = new Map<string, Details>();

const SETTLE = 600;

// `idea`: the guest's idea when the chat rewrote it, so the episode is written for it.
type Props = {
  id: string;
  guestRef: string;
  idea?: Idea;
  length?: string;
  ideaTitle?: string;
  showMap: MapRow[];
  onShowMap?: () => void;
};

export function GuestDetails({ id, guestRef, idea, length, ideaTitle, showMap, onShowMap }: Props) {
  const key = `${id}/${guestRef}/${idea ? `${idea.title}/${idea.pitch}` : ""}/${length ?? ""}`;
  const [load, setLoad] = useState<Load>(() => {
    const details = loaded.get(key);
    return details ? { state: "done", details } : { state: "loading" };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded.has(key)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      echo
        .guest(id, guestRef, idea, length, controller.signal)
        .then((details) => {
          loaded.set(key, details);
          setLoad({ state: "done", details });
        })
        .catch((error) => {
          if (!controller.signal.aborted) setLoad({ state: "failed", problem: describe(error) });
        });
    }, SETTLE);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [id, guestRef, idea, length, key, attempt]);

  if (load.state === "failed") {
    const { problem } = load;
    return (
      <Part id={`episode-${guestRef}`} title="The episode">
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="font-semibold text-alert">{problem.title}</p>
          <p className="text-ink-soft">{problem.message}</p>
          {problem.next === "retry" && (
            <button
              type="button"
              onClick={() => {
                setLoad({ state: "loading" });
                setAttempt((n) => n + 1);
              }}
              className="btn"
            >
              Try again
            </button>
          )}
        </div>
      </Part>
    );
  }

  const details = load.state === "done" ? load.details : null;
  return (
    <>
      <Part id={`episode-${guestRef}`} title="The episode">
        {!details ? (
          <Waiting>Writing the episode…</Waiting>
        ) : details.episode ? (
          <EpisodePlan episode={details.episode} ideaTitle={ideaTitle} />
        ) : (
          <p className="text-ink-dim">Echo hasn&apos;t written this episode yet.</p>
        )}
      </Part>
      <Part id={`meet-${guestRef}`} title="Their fans next to yours">
        {details ? (
          <FansVenn showMap={showMap} guestMap={details.audience_map} adds={details.adds} />
        ) : (
          <Waiting>Mapping their audience…</Waiting>
        )}
        {onShowMap && (
          <button type="button" onClick={onShowMap} className="btn self-start">
            <svg aria-hidden viewBox="0 0 16 16" className="size-4">
              <g fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="6" cy="8" r="4.5" />
                <circle cx="10" cy="8" r="4.5" />
              </g>
            </svg>
            See both on the taste map
          </button>
        )}
      </Part>
    </>
  );
}

function Waiting({ children }: { children: ReactNode }) {
  return (
    <div aria-busy className="flex min-h-24 items-center gap-3 text-ink-soft">
      <Lamp color="var(--accent)" className="pulse size-2" />
      {children}
    </div>
  );
}

export function EpisodePlan({ episode, ideaTitle }: { episode: Episode; ideaTitle?: string }) {
  const timed = episode.segments.some((segment) => segment.minutes);
  return (
    <div className="flex flex-col gap-6">
      <div>
        {episode.title !== ideaTitle && (
          <p className="mb-3 font-display text-2xl leading-tight font-semibold text-balance">{episode.title}</p>
        )}
        <p className="max-w-prose text-ink-soft">{episode.summary}</p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="tag text-ink-dim">Run of show</p>
        <ol className="flex flex-col">
          {episode.segments.map((segment, index) => (
            <li
              key={`${segment.title}-${index}`}
              className="grid grid-cols-[2rem_1fr] gap-x-3 border-t border-steel py-3.5 last:pb-0"
            >
              <span className="tag pt-1 text-accent">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="flex items-baseline justify-between gap-3 font-semibold">
                  {segment.title}
                  {timed && segment.minutes ? (
                    <span className="readout shrink-0 text-sm font-normal text-ink-dim">{segment.minutes} min</span>
                  ) : null}
                </p>
                <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-sm text-ink-soft marker:text-ink-dim">
                  {segment.points.map((point, i) => (
                    <li key={`${point}-${i}`}>{point}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {episode.questions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="tag text-ink-dim">Questions to ask</p>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm marker:text-accent">
            {episode.questions.map((question, index) => (
              <li key={`${question}-${index}`}>{question}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
