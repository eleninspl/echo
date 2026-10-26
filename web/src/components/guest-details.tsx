"use client";

import { useEffect, useState, type ReactNode } from "react";

import { echo, type Episode, type GuestDetails as Details, type MapRow } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { category } from "@/lib/format";

import { categoryHue, Lamp, Part } from "./hud";

type Load = { state: "loading" } | { state: "done"; details: Details } | { state: "failed"; problem: HostError };

const loaded = new Map<string, Details>();

const SETTLE = 600;

type Props = { id: string; guestRef: string; showMap: MapRow[] };

export function GuestDetails({ id, guestRef, showMap }: Props) {
  const key = `${id}/${guestRef}`;
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
        .guest(id, guestRef, controller.signal)
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
  }, [id, guestRef, key, attempt]);

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
          <EpisodePlan episode={details.episode} />
        ) : (
          <p className="text-ink-dim">Echo hasn&apos;t written this episode yet.</p>
        )}
      </Part>
      <Part
        id={`meet-${guestRef}`}
        title="Their fans next to yours"
        aside={
          <span className="flex items-center gap-1.5 text-reach">
            <span aria-hidden className="size-2 rounded-full bg-reach" />
            New to you
          </span>
        }
      >
        {details ? (
          <Compare showMap={showMap} guestMap={details.audience_map} adds={details.adds} />
        ) : (
          <Waiting>Mapping their audience…</Waiting>
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

function EpisodePlan({ episode }: { episode: Episode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-display text-2xl leading-tight font-semibold text-balance">{episode.title}</p>
        <p className="mt-3 max-w-prose text-ink-soft">{episode.summary}</p>
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
                <p className="font-semibold">{segment.title}</p>
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

function Compare({ showMap, guestMap, adds }: { showMap: MapRow[]; guestMap: MapRow[]; adds: MapRow[] }) {
  const added = new Set(adds.flatMap((row) => row.items.map((item) => `${row.category}/${item.name}`)));
  const ours = new Map(showMap.map((row) => [row.category, row.items]));
  const rows = guestMap.filter((row) => row.items.length > 0);
  if (!rows.length) return <p className="text-ink-dim">There&apos;s no map for their fans yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Category</span>
          </th>
          <th scope="col" className="tag pb-2 text-ink-dim">
            Your listeners
          </th>
          <th scope="col" className="tag pb-2 text-ink-dim">
            Their fans
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.category} className="border-t border-steel align-top">
            <th scope="row" className="tag py-2 pr-3" style={{ color: categoryHue(row.category) }}>
              {category(row.category)}
            </th>
            <td className="py-2 pr-3">
              <ul className="flex flex-col gap-1">
                {(ours.get(row.category) ?? []).slice(0, row.items.length).map((item, index) => (
                  <li key={`${item.name}-${index}`} className="text-ink-soft">
                    {item.name}
                  </li>
                ))}
              </ul>
            </td>
            <td className="py-2">
              <ul className="flex flex-col gap-1">
                {row.items.map((item, index) => {
                  const isNew = added.has(`${row.category}/${item.name}`);
                  return (
                    <li key={`${item.name}-${index}`} className={isNew ? "text-reach" : ""}>
                      {isNew && (
                        <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-reach align-middle" />
                      )}
                      {item.name}
                      {isNew && <span className="sr-only"> (new to you)</span>}
                    </li>
                  );
                })}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
