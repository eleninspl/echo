"use client";

import { useEffect, useState } from "react";

import { echo, type Episode, type GuestDetails as Details, type MapRow } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { category } from "@/lib/format";

import { Briefing } from "./briefing";

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
      <p aria-busy className="min-h-40 text-ink-soft">
        Writing the episode and mapping their audience…
      </p>
    );
  }

  if (load.state === "failed") {
    const { problem } = load;
    return (
      <div role="alert" className="flex min-h-40 flex-col items-start gap-2">
        <p className="font-semibold">{problem.title}</p>
        <p className="text-ink-soft">{problem.message}</p>
        {problem.next === "retry" && (
          <button
            type="button"
            onClick={() => {
              setLoad({ state: "loading" });
              setAttempt((n) => n + 1);
            }}
            className="border-2 border-current px-3 py-1.5 text-sm font-semibold"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const { details } = load;
  return (
    <div className="grid gap-10 md:grid-cols-11 md:gap-x-8">
      <section aria-label="The episode" className="md:col-span-6">
        {details.episode ? (
          <EpisodePlan episode={details.episode} />
        ) : (
          <p className="text-ink-soft">Echo hasn&apos;t written this episode yet.</p>
        )}
      </section>
      <section aria-labelledby={`meet-${guestRef}`} className="md:col-span-5">
        <h4 id={`meet-${guestRef}`} className="font-display text-2xl leading-none font-extrabold uppercase">
          Their fans next to yours
        </h4>
        <p className="mt-2 text-sm text-ink-soft">
          What each audience over-indexes on, strongest first. <span className="font-semibold text-ink">New</span>{" "}
          marks what their fans bring that isn&apos;t on your map.
        </p>
        <Compare showMap={showMap} guestMap={details.audience_map} adds={details.adds} />
      </section>
      <section aria-labelledby={`brief-${guestRef}`} className="border-t border-rule pt-6 md:col-span-11">
        <h4 id={`brief-${guestRef}`} className="mb-3 font-display text-2xl leading-none font-extrabold uppercase">
          Before you record
        </h4>
        <Briefing id={id} guestRef={guestRef} guestName={guestName} />
      </section>
    </div>
  );
}

function EpisodePlan({ episode }: { episode: Episode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h4 className="font-display text-3xl leading-none font-extrabold text-balance uppercase">{episode.title}</h4>
        <p className="mt-3 max-w-prose">{episode.summary}</p>
      </div>
      <ol className="flex flex-col border-t border-rule">
        {episode.segments.map((segment, index) => (
          <li key={`${segment.title}-${index}`} className="border-b border-rule py-3">
            <p className="font-semibold">{segment.title}</p>
            <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-ink-soft marker:text-rule">
              {segment.points.map((point, index) => (
                <li key={`${point}-${index}`}>{point}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {episode.questions.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Questions to ask</p>
          <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5">
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
  if (!rows.length) return <p className="mt-4 text-ink-soft">Qloo has no map for their fans.</p>;
  return (
    <table className="mt-4 w-full border-t-2 border-ink text-left text-sm">
      <thead>
        <tr className="border-b border-rule">
          <th scope="col" className="py-2 pr-3 font-semibold">
            <span className="sr-only">Category</span>
          </th>
          <th scope="col" className="py-2 pr-3 font-semibold">
            Your listeners
          </th>
          <th scope="col" className="py-2 font-semibold">
            Their fans
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.category} className="border-b border-rule align-top">
            <th scope="row" className="py-2 pr-3 font-display text-base font-extrabold uppercase">
              {category(row.category)}
            </th>
            <td className="py-2 pr-3 text-ink-soft">
              <ul>
                {(ours.get(row.category) ?? []).slice(0, row.items.length).map((item, index) => (
                  <li key={`${item.name}-${index}`}>{item.name}</li>
                ))}
              </ul>
            </td>
            <td className="py-2">
              <ul>
                {row.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name}
                    {added.has(`${row.category}/${item.name}`) && (
                      <span className="ml-1.5 text-xs font-bold tracking-wide text-link uppercase">New</span>
                    )}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
