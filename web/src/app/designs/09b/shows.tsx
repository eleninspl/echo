"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { Featured, Guest } from "@/lib/echo";

import { Cover } from "./cover";
import { finishedGuests, useAnalysis, useFeatured } from "./data";
import { styles } from "./styles";
import { LABEL_NAME, out100 } from "./track";
import { levelsOf, Segment, TONE } from "./wave";

const LAYOUT: Record<number, string> = {
  1: "",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-2",
  4: "lg:grid-cols-2",
};

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const wide = featured.length === 1;

  return (
    <section
      id="shows"
      aria-labelledby="v9b-shows"
      className="mx-auto w-full max-w-[1280px] scroll-mt-8 px-4 pt-6 pb-24 sm:px-8 lg:pb-32"
    >
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <h2
            id="v9b-shows"
            className={`${styles.display} text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance`}
          >
            Shows Echo has run
          </h2>
          <p className="max-w-[54ch] text-lg text-(--v9b-soft)">
            Open one to see every guest Echo found for it, ranked, with what drives each score.
          </p>
        </div>
        <span className="w-fit rounded-full bg-(--v9b-plum) px-4 py-1.5 text-sm font-semibold text-(--v9b-soft) ring-1 ring-(--v9b-line)">
          {featured.length} ready to open
        </span>
      </div>
      <ul className={`grid grid-cols-1 gap-5 ${LAYOUT[Math.min(featured.length, 4)]}`}>
        {featured.map((item, index) => (
          <ShowCard key={item.analysis_id} item={item} wide={wide} index={index} />
        ))}
      </ul>
    </section>
  );
}

function ShowCard({ item, wide, index }: { item: Featured; wide: boolean; index: number }) {
  const { show, analysis_id } = item;
  const loaded = useAnalysis(analysis_id);
  const guests = finishedGuests(loaded);
  const ready = guests.length > 0;
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const top = guests.slice(0, 3);

  return (
    <li className={`${styles.rise} min-w-0`} style={{ "--order": index } as CSSProperties}>
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className={`group grid h-full overflow-hidden rounded-[28px] bg-(--v9b-plum) ring-1 ring-(--v9b-line) transition-shadow hover:ring-(--v9b-dim) ${
          wide ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : ""
        }`}
      >
        <div className="flex min-w-0 flex-col gap-7 p-5 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <Cover show={show} size={wide ? 80 : 64} />
            <div className="min-w-0">
              <h3 className={`${styles.display} text-xl leading-tight font-semibold tracking-[-0.02em] sm:text-2xl`}>
                {show.title}
              </h3>
              {show.description && <p className="mt-1.5 line-clamp-2 text-(--v9b-soft)">{show.description}</p>}
            </div>
          </div>

          <dl className="flex gap-10">
            <Stat term="Guests scored" value={ready ? guests.length : null} />
            <Stat term={sweet === 1 ? "Sweet spot" : "Sweet spots"} value={ready ? sweet : null} glowing />
          </dl>

          <span className="mt-auto inline-flex items-center gap-3 self-start font-semibold text-(--v9b-ink)">
            <span
              aria-hidden
              className={`${styles.gradientFill} flex size-10 items-center justify-center rounded-full text-(--v9b-on-hue) transition-transform group-hover:translate-x-1`}
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
            Open the analysis
          </span>
        </div>

        <div
          className={`flex min-w-0 flex-col gap-3 border-t border-(--v9b-line) p-5 sm:p-8 ${
            wide ? "lg:border-t-0 lg:border-l" : ""
          }`}
        >
          <h4 className="text-sm font-semibold text-(--v9b-soft)">Top of the lineup</h4>
          {ready ? (
            <ol className="flex flex-col">
              {top.map((guest, at) => (
                <GuestRow key={guest.ref} guest={guest} rank={at + 1} />
              ))}
            </ol>
          ) : (
            <ol aria-hidden className="flex flex-col gap-2">
              {Array.from({ length: 3 }, (_, at) => (
                <li key={at} className={`${styles.waiting} h-16 rounded-2xl bg-(--v9b-plum-hi)`} />
              ))}
            </ol>
          )}
        </div>
      </Link>
    </li>
  );
}

function Stat({ term, value, glowing = false }: { term: string; value: number | null; glowing?: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-1.5">
      <dt className="text-sm font-semibold text-(--v9b-soft)">{term}</dt>
      <dd
        className={`${styles.display} text-5xl leading-none font-semibold tracking-[-0.03em] ${
          glowing && value ? styles.gradientText : ""
        } ${value === null ? `${styles.waiting} text-(--v9b-dim)` : ""}`}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

function GuestRow({ guest, rank }: { guest: Guest; rank: number }) {
  const { fit, love_back, reach } = guest.scores;
  const sweet = guest.label === "sweet_spot";
  return (
    <li className="flex items-center gap-4 border-b border-(--v9b-line)/60 py-3 last:border-b-0 sm:gap-5">
      <span
        aria-hidden
        className={`${styles.display} w-4 shrink-0 text-right text-sm font-semibold text-(--v9b-dim) tabular-nums`}
      >
        {rank}
      </span>
      <Segment
        levels={levelsOf(guest)}
        paint={sweet ? "sweet" : "lit"}
        bars={21}
        width={126}
        height={52}
        className="h-11 w-[106px] shrink-0 sm:h-[52px] sm:w-[126px]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className={`${styles.display} text-base leading-tight font-semibold`}>{guest.name}</span>
          <span
            className={`text-xs font-bold tracking-[0.08em] uppercase ${sweet ? styles.gradientText : "text-(--v9b-dim)"}`}
          >
            {LABEL_NAME[guest.label]}
          </span>
        </span>
        <span className="flex flex-wrap gap-x-3.5 text-sm text-(--v9b-soft) tabular-nums">
          <Score color={TONE.fit} name="Fit" value={fit} />
          <Score color={TONE.love} name="Love back" value={love_back} />
          <Score color={TONE.reach} name="Reach" value={reach} />
        </span>
      </span>
    </li>
  );
}

function Score({ color, name, value }: { color: string; name: string; value: number | null }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span style={{ color }}>{name}</span>
      {value === null ? (
        <span>
          <span aria-hidden>–</span>
          <span className="sr-only">not scored</span>
        </span>
      ) : (
        <span className="font-semibold text-(--v9b-ink)">{out100(value)}</span>
      )}
    </span>
  );
}
