"use client";

import { useFeatured } from "@/components/featured";
import type { Guest, Label } from "@/lib/echo";

import { useAnalysis } from "./runs";
import { styles } from "./styles";
import {
  HUE,
  levelsOf,
  out100,
  PART_NAME,
  PARTS,
  Voiceprint,
  type Levels,
  type Part,
} from "./wave";

const MEANING: Record<Part, string> = {
  fit: "Your listeners over-index on the guest, more than the guest’s fame alone explains.",
  love: "The guest’s fans over-index on your show, so the people they bring have a reason to stay.",
  reach: "How much of the guest’s audience is new to you: they play podcasts your listeners don’t.",
};

const DIAGRAM: Levels = { fit: 0.9, love: 0.8, reach: 0.85 };

const SHAPES: { label: Label; name: string; meaning: string; diagram: Levels }[] =
  [
    {
      label: "sweet_spot",
      name: "Sweet spot",
      meaning: "High on all three.",
      diagram: { fit: 0.85, love: 0.8, reach: 0.8 },
    },
    {
      label: "safe",
      name: "Safe",
      meaning: "Loved both ways, but few new ears.",
      diagram: { fit: 0.95, love: 0.88, reach: 0.12 },
    },
    {
      label: "far",
      name: "Far",
      meaning: "New ears that may not stay.",
      diagram: { fit: 0.6, love: 0.14, reach: 0.95 },
    },
  ];

function useExampleRun() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  const guests = analysis?.status === "done" ? analysis.guests : null;
  const loading = featured === null || (first !== null && analysis === null);
  return { show: first?.show ?? null, guests, loading };
}

function firstScored(guests: Guest[] | null, label: Label) {
  return (
    guests?.find(
      (guest) => guest.label === label && guest.scores.reach !== null,
    ) ?? null
  );
}

export function ScoreFigure() {
  const { show, guests, loading } = useExampleRun();
  const lead = firstScored(guests, "sweet_spot");
  const levels = lead ? levelsOf(lead) : DIAGRAM;

  return (
    <figure>
      <figcaption className="mb-4 text-[0.9rem] text-(--w1-dim)">
        {lead && show
          ? `Drawn from ${lead.name}, a sweet spot in Echo’s run for ${show.title}.`
          : loading
            ? "Loading a guest from a show Echo has run."
            : "A diagram of a guest who scores high on all three."}
      </figcaption>
      <Voiceprint
        levels={levels}
        muted={loading}
        bars={84}
        width={1008}
        height={128}
        className={`block h-auto w-full ${loading ? styles.waiting : ""}`}
      />
      <ol className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-3">
        {PARTS.map((part) => (
          <li
            key={part}
            className="border-t-2 pt-3"
            style={{ borderColor: HUE[part] }}
          >
            <h3 className="flex items-baseline justify-between gap-3">
              <span
                className={`${styles.wide} text-[1.5rem] leading-tight font-semibold tracking-[-0.015em]`}
                style={{ color: HUE[part] }}
              >
                {PART_NAME[part]}
              </span>
              {lead && (
                <span
                  className={`${styles.num} text-[1.5rem] leading-tight font-medium`}
                >
                  <span className="sr-only">{lead.name} scores </span>
                  {out100(levels[part] ?? 0)}
                </span>
              )}
            </h3>
            <p
              className={`${styles.serif} mt-3 max-w-[34ch] text-[1.0625rem] leading-[1.45] text-(--w1-soft)`}
            >
              {MEANING[part]}
            </p>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function SweetSpot() {
  const { show, guests, loading } = useExampleRun();
  const sweet =
    guests?.filter((guest) => guest.label === "sweet_spot").length ?? 0;
  const rows = SHAPES.map((shape) => ({
    ...shape,
    guest: firstScored(guests, shape.label),
  })).filter((row) => !guests || row.guest);

  return (
    <div className="mt-20 grid grid-cols-1 gap-x-6 gap-y-6 border-t-[1.5px] border-(--w1-ink) pt-4 md:grid-cols-3">
      <div>
        <h3
          className={`${styles.wide} text-[1.5rem] leading-tight font-semibold tracking-[-0.015em]`}
        >
          Sweet spot
        </h3>
        <p
          className={`${styles.serif} mt-3 max-w-[34ch] text-[1.0625rem] leading-[1.45] text-(--w1-soft)`}
        >
          High on all three at once. It’s rare, usually 1 to 4 guests in
          20, and Echo says how many it found.
          {show && guests && (
            <>
              {" "}
              For {show.title} it found{" "}
              <span className={`${styles.num} font-semibold text-(--w1-ink)`}>
                {sweet} in {guests.length}
              </span>
              .
            </>
          )}
        </p>
      </div>

      <div className="md:col-span-2">
        <div
          aria-hidden
          className="hidden grid-cols-[112px_minmax(0,1fr)_3.5rem_4.5rem_3.5rem] gap-x-4 pb-2 text-[0.85rem] leading-tight font-medium text-(--w1-dim) sm:grid"
        >
          <span>Shape</span>
          <span>{guests ? "Guest in this run" : "Label"}</span>
          {guests &&
            PARTS.map((part) => (
              <span
                key={part}
                className="text-right font-semibold"
                style={{ color: HUE[part] }}
              >
                {PART_NAME[part]}
              </span>
            ))}
        </div>
        <ul className="border-t border-(--w1-line)">
          {rows.map((row) => {
            const levels = row.guest ? levelsOf(row.guest) : row.diagram;
            return (
              <li
                key={row.label}
                className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-b border-(--w1-line) py-3 sm:grid-cols-[112px_minmax(0,1fr)_3.5rem_4.5rem_3.5rem]"
              >
                <Voiceprint
                  levels={levels}
                  muted={loading}
                  bars={28}
                  width={112}
                  height={36}
                  className="row-span-2 h-auto w-full sm:row-span-1"
                />
                <p className="min-w-0 leading-snug">
                  <span className="font-semibold">{row.name}.</span>{" "}
                  <span className={`${styles.serif} text-(--w1-soft)`}>
                    {row.meaning}
                  </span>
                  {row.guest && (
                    <span className="block truncate text-[0.9rem] text-(--w1-dim)">
                      {row.guest.name}
                      {row.guest.description
                        ? `, ${row.guest.description.toLowerCase()}`
                        : ""}
                    </span>
                  )}
                </p>
                {row.guest ? (
                  <Numbers levels={levels} />
                ) : (
                  <span className="hidden sm:col-span-3 sm:block" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Numbers({ levels }: { levels: Levels }) {
  return (
    <>
      <span className="col-start-2 flex gap-4 sm:hidden">
        {PARTS.map((part) => (
          <span
            key={part}
            className={`${styles.num} text-[0.95rem] font-semibold`}
            style={{ color: HUE[part] }}
          >
            <span className="font-normal">{PART_NAME[part]} </span>
            {levels[part] === null ? "–" : out100(levels[part] ?? 0)}
          </span>
        ))}
      </span>
      {PARTS.map((part) => (
        <span
          key={part}
          className={`${styles.num} hidden text-right text-[1.0625rem] font-medium sm:block`}
        >
          <span className="sr-only">{PART_NAME[part]} </span>
          {levels[part] === null ? "–" : out100(levels[part] ?? 0)}
        </span>
      ))}
    </>
  );
}
