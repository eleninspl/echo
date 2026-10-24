"use client";

import { useEffect, useState } from "react";

import { echo, type Episode, type GuestDetails as Details, type MapRow } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { category } from "@/lib/format";

import { Briefing } from "./briefing";
import { categoryHue, Lamp } from "./gallery";

type Load = { state: "loading" } | { state: "done"; details: Details } | { state: "failed"; problem: HostError };

// The full episode idea and the guest's audience next to the show's. Loaded once, when first opened:
// on the live engine it costs Qloo calls and an LLM call.
type Props = { id: string; guestRef: string; guestName: string; showMap: MapRow[] };

export function GuestDetails({ id, guestRef, guestName, showMap }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    echo
      .guest(id, guestRef, controller.signal)
      .then((details) => setLoad({ state: "done", details }))
      .catch((error) => {
        if (!controller.signal.aborted) setLoad({ state: "failed", problem: describe(error) });
      });
    return () => controller.abort();
  }, [id, guestRef, attempt]);

  if (load.state === "loading") {
    return (
      <div aria-busy className="flex min-h-40 items-center gap-3 text-ink-soft">
        <Lamp color="var(--amber)" className="cue h-2.5 w-4" />
        Writing the episode and mapping their audience…
      </div>
    );
  }

  if (load.state === "failed") {
    const { problem } = load;
    return (
      <div role="alert" className="flex min-h-40 flex-col items-start gap-2">
        <p className="font-semibold text-amber">{problem.title}</p>
        <p className="text-ink-soft">{problem.message}</p>
        {problem.next === "retry" && (
          <button
            type="button"
            onClick={() => {
              setLoad({ state: "loading" });
              setAttempt((n) => n + 1);
            }}
            className="key"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const { details } = load;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section aria-label="The episode">
        {details.episode ? (
          <EpisodePlan episode={details.episode} />
        ) : (
          <p className="text-ink-dim">Echo hasn&apos;t written this episode yet.</p>
        )}
      </section>
      <section aria-labelledby={`meet-${guestRef}`} className="flex flex-col gap-3">
        <h4 id={`meet-${guestRef}`} className="silk flex items-center gap-3 text-ink-soft">
          Their fans next to yours
          <span className="flex items-center gap-1.5 text-reach">
            <span aria-hidden className="size-2 rounded-[1px] bg-reach" />
            New to you
          </span>
        </h4>
        <Compare showMap={showMap} guestMap={details.audience_map} adds={details.adds} />
      </section>
      <section
        aria-labelledby={`brief-${guestRef}`}
        className="flex flex-col gap-3 border-t border-line pt-5 xl:col-span-2"
      >
        <h4 id={`brief-${guestRef}`} className="silk text-ink-soft">
          Before you record
        </h4>
        <Briefing id={id} guestRef={guestRef} guestName={guestName} />
      </section>
    </div>
  );
}

function EpisodePlan({ episode }: { episode: Episode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="silk text-ink-dim">Episode</p>
        <h4 className="mt-2 font-cond text-3xl leading-none font-semibold text-balance">{episode.title}</h4>
        <p className="mt-3 max-w-prose text-ink-soft">{episode.summary}</p>
      </div>
      <ol className="flex flex-col gap-2">
        {episode.segments.map((segment, index) => (
          <li
            key={`${segment.title}-${index}`}
            className="grid grid-cols-[2rem_1fr] gap-x-3 rounded-[3px] bg-bezel/50 p-3"
          >
            <span className="silk pt-1 text-amber">{String(index + 1).padStart(2, "0")}</span>
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
      {episode.questions.length > 0 && (
        <div>
          <p className="silk text-ink-dim">Questions to ask</p>
          <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm marker:text-amber">
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
  if (!rows.length) return <p className="text-ink-dim">Qloo has no map for their fans.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Category</span>
          </th>
          <th scope="col" className="silk pb-2 text-ink-dim">
            Your listeners
          </th>
          <th scope="col" className="silk pb-2 text-ink-dim">
            Their fans
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.category} className="border-t border-line align-top">
            <th scope="row" className="silk py-2 pr-3" style={{ color: categoryHue(row.category) }}>
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
                        <span
                          aria-hidden
                          className="mr-1.5 inline-block size-1.5 rounded-[1px] bg-reach align-middle"
                        />
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
