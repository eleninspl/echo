"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { Featured, Guest, Label } from "@/lib/echo";

import { Cover } from "./cover";
import { useRun, useRuns } from "./runs";
import { styles } from "./styles";
import { out100, PART_NAME, PARTS, ShowWave, TONE, Voiceprint, waveOf, type Part } from "./wave";

const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

const SCORE_OF: Record<Part, (guest: Guest) => number | null> = {
  fit: (guest) => guest.scores.fit,
  love: (guest) => guest.scores.love_back,
  reach: (guest) => guest.scores.reach,
};

export function RunShows() {
  const { featured } = useRuns();
  if (!featured?.length) return null;
  const wide = featured.length === 1;

  return (
    <section
      id="shows"
      aria-labelledby="v9a-shows"
      className="mx-auto w-full max-w-[1280px] scroll-mt-8 px-4 pt-4 pb-24 sm:px-8 lg:pb-32"
    >
      <div className="mb-10 grid grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <h2
          id="v9a-shows"
          className={`${styles.headline} text-[clamp(2.6rem,5vw,4.25rem)] leading-[0.95] tracking-[-0.01em] text-balance`}
        >
          Shows Echo has run
        </h2>
        <p className="max-w-[52ch] text-lg leading-relaxed text-(--v9a-soft) lg:justify-self-end">
          Open one to see every guest Echo found for it, ranked, with what drives each score.
        </p>
      </div>
      <ul className={`grid grid-cols-1 gap-5 ${wide ? "" : "md:grid-cols-2"}`}>
        {featured.map((item, index) => (
          <ShowCard key={item.analysis_id} item={item} wide={wide} index={index} />
        ))}
      </ul>
    </section>
  );
}

function ShowCard({ item, wide, index }: { item: Featured; wide: boolean; index: number }) {
  const { show, analysis_id } = item;
  const run = useRun(analysis_id);
  const guests = run.state === "done" ? run.analysis.guests : [];
  const known = run.state === "done";
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const top = guests.slice(0, wide ? 5 : 3);

  return (
    <li className={`${styles.rise} min-w-0`} style={{ "--order": index } as CSSProperties}>
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className={`group grid h-full overflow-hidden rounded-[32px] bg-(--v9a-plum) ring-1 ring-(--v9a-line) transition-shadow hover:ring-(--v9a-dim) ${
          wide ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""
        }`}
      >
        <div className={`flex min-w-0 flex-col p-5 sm:p-8 lg:p-10 ${wide ? "gap-8" : "gap-7"}`}>
          <div className="flex items-center gap-4 sm:gap-5">
            <Cover show={show} size={wide ? 80 : 64} />
            <div className="min-w-0">
              <h3 className={`${styles.title} text-2xl leading-tight sm:text-[2rem]`}>{show.title}</h3>
              {show.description && (
                <p className="mt-1.5 line-clamp-2 text-[17px] text-(--v9a-soft)">{show.description}</p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-6 border-y border-(--v9a-line) py-5">
            <Stat term="Guests scored" value={known ? guests.length : null} wide={wide} />
            <Stat term={sweet === 1 ? "Sweet spot" : "Sweet spots"} value={known ? sweet : null} wide={wide} glowing />
          </dl>

          <figure className="flex flex-col gap-4">
            <ShowWave guests={guests} height={wide ? 112 : 84} />
            <figcaption className="text-[15px] leading-snug text-(--v9a-soft)">
              Every guest, best first. Sweet spots are lit and marked.
            </figcaption>
          </figure>

          {!wide && <Lineup guests={top} known={known} compact />}

          <OpenLine count={known ? guests.length : null} />
        </div>

        {wide && (
          <div className="flex min-w-0 flex-col border-t border-(--v9a-line) bg-(--v9a-ground)/45 p-5 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
            <Lineup guests={top} known={known} />
          </div>
        )}
      </Link>
    </li>
  );
}

function OpenLine({ count }: { count: number | null }) {
  return (
    <span className="mt-auto inline-flex items-center gap-3 self-start text-lg font-semibold text-(--v9a-ink)">
      <span
        aria-hidden
        className={`${styles.gradientFill} flex size-11 items-center justify-center rounded-full text-(--v9a-on-hue) transition-transform group-hover:translate-x-1`}
      >
        <svg viewBox="0 0 20 20" className="size-4" focusable="false">
          <path
            d="M4 10h11m-4-4 4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {count === null ? "Open the analysis" : `Open all ${count} guests`}
    </span>
  );
}

function Stat({
  term,
  value,
  wide,
  glowing = false,
}: {
  term: string;
  value: number | null;
  wide: boolean;
  glowing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-base text-(--v9a-soft)">{term}</dt>
      <dd
        className={`${styles.figure} ${wide ? "text-5xl" : "text-4xl"} leading-none ${glowing && value ? `${styles.gradientText} w-fit` : ""} ${
          value === null ? `${styles.waiting} text-(--v9a-dim)` : ""
        }`}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

const ROW = "grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[1.75rem_minmax(0,1fr)_13.5rem]";

function Lineup({ guests, known, compact = false }: { guests: Guest[]; known: boolean; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`${ROW} border-b border-(--v9a-line) pb-3`}>
        <h4 className={`col-span-2 text-base font-semibold text-(--v9a-ink) sm:col-span-1 sm:col-start-1 sm:col-end-3`}>
          Top of the lineup
        </h4>
        <span aria-hidden className="hidden grid-cols-3 text-center text-sm font-semibold whitespace-nowrap sm:grid">
          {PARTS.map((part) => (
            <span key={part} style={{ color: TONE[part] }}>
              {PART_NAME[part]}
            </span>
          ))}
        </span>
      </div>
      {known ? (
        <ol className="flex flex-col">
          {guests.map((guest, index) => (
            <GuestRow key={guest.ref} guest={guest} rank={index + 1} compact={compact} />
          ))}
        </ol>
      ) : (
        <ol aria-hidden className="flex flex-col gap-2 pt-1">
          {Array.from({ length: compact ? 3 : 5 }, (_, index) => (
            <li key={index} className={`${styles.waiting} h-16 rounded-2xl bg-(--v9a-plum-hi)`} />
          ))}
        </ol>
      )}
    </div>
  );
}

function GuestRow({ guest, rank, compact }: { guest: Guest; rank: number; compact: boolean }) {
  const sweet = guest.label === "sweet_spot";
  return (
    <li className={`${ROW} gap-y-3 border-b border-(--v9a-line)/60 py-4 last:border-b-0`}>
      <span className={`${styles.figure} text-right text-base text-(--v9a-dim)`}>{rank}</span>
      <span className="flex min-w-0 items-center gap-4">
        <Voiceprint
          wave={waveOf(guest)}
          perSwell={5}
          width={80}
          height={36}
          className={`hidden h-9 w-20 shrink-0 ${compact ? "" : "sm:block"}`}
        />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={`${styles.title} text-xl leading-tight`}>{guest.name}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                sweet ? `${styles.gradientFill} text-(--v9a-on-hue)` : "text-(--v9a-soft) ring-1 ring-(--v9a-line)"
              }`}
            >
              {LABEL_NAME[guest.label]}
            </span>
          </span>
          {!compact && guest.description && (
            <span className="truncate text-base text-(--v9a-soft)">{guest.description}</span>
          )}
        </span>
      </span>
      <dl className="col-start-2 grid grid-cols-3 gap-2 sm:col-start-3 sm:gap-0">
        {PARTS.map((part) => {
          const value = SCORE_OF[part](guest);
          return (
            <div key={part} className="flex flex-col items-start gap-0.5 sm:items-center">
              <dt className="text-sm font-semibold sm:sr-only" style={{ color: TONE[part] }}>
                {PART_NAME[part]}
              </dt>
              <dd className={`${styles.figure} text-xl leading-none`}>
                {value === null ? (
                  <>
                    <span aria-hidden className="text-(--v9a-dim)">
                      –
                    </span>
                    <span className="sr-only">not scored</span>
                  </>
                ) : (
                  out100(value)
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </li>
  );
}
