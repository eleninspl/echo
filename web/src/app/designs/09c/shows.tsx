"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import type { Featured, Guest, Label } from "@/lib/echo";

import { Cover } from "./cover";
import { useAnalysis } from "./runs";
import { styles } from "./styles";
import { INK, Voiceprint, type Part } from "./wave";

const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

const out100 = (value: number) => String(Math.round(value * 100));

const LAYOUT: Record<number, string> = {
  1: "",
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2",
};

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const wide = featured.length === 1;

  return (
    <section
      id="shows"
      aria-labelledby="v9c-shows"
      className="mx-auto w-full max-w-[1280px] scroll-mt-8 px-4 pt-4 pb-24 sm:px-8"
    >
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <h2
            id="v9c-shows"
            className={`${styles.display} text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-medium tracking-[-0.035em] text-balance`}
          >
            Shows Echo has run
          </h2>
          <p className="max-w-[54ch] text-lg leading-relaxed text-(--v9c-soft)">
            Open one to see every guest Echo found for it, ranked, with what
            drives each score.
          </p>
        </div>
        <span className="w-fit rounded-full bg-(--v9c-paper) px-4 py-1.5 text-[0.95rem] font-semibold text-(--v9c-soft) ring-1 ring-(--v9c-line)">
          {featured.length} ready to open
        </span>
      </div>
      <ul
        className={`grid grid-cols-1 gap-5 ${LAYOUT[Math.min(featured.length, 4)]}`}
      >
        {featured.map((item, index) => (
          <ShowCard
            key={item.analysis_id}
            item={item}
            wide={wide}
            index={index}
          />
        ))}
      </ul>
    </section>
  );
}

function ShowCard({
  item,
  wide,
  index,
}: {
  item: Featured;
  wide: boolean;
  index: number;
}) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const top = guests.slice(0, wide ? 6 : 3);
  const stats = (
    <dl
      className={`grid grid-cols-2 ${wide ? "lg:flex lg:gap-0" : "border-y border-(--v9c-line)"}`}
    >
      <Stat
        term="Guests scored"
        value={done ? guests.length : null}
        wide={wide}
      />
      <Stat
        term={sweet === 1 ? "Sweet spot" : "Sweet spots"}
        value={done ? sweet : null}
        wide={wide}
        glowing
      />
    </dl>
  );

  return (
    <li
      className={`${styles.rise} min-w-0`}
      style={{ "--order": index } as CSSProperties}
    >
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className="group flex h-full flex-col overflow-hidden rounded-[32px] bg-(--v9c-paper) shadow-[0_40px_80px_-56px_rgb(42_16_48/0.5)] ring-1 ring-(--v9c-line) transition-shadow hover:ring-(--v9c-line-strong)"
      >
        <div
          className={`flex min-w-0 flex-col gap-7 p-5 sm:p-8 ${wide ? "lg:flex-row lg:items-center lg:justify-between lg:gap-10" : ""}`}
        >
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <Cover show={show} size={wide ? 88 : 64} />
            <div className="min-w-0">
              <h3
                className={`${styles.display} text-xl leading-tight font-medium tracking-[-0.025em] sm:text-2xl ${wide ? "lg:text-[1.9rem]" : ""}`}
              >
                {show.title}
              </h3>
              {show.description && (
                <p className="mt-1.5 line-clamp-2 text-[1.05rem] text-(--v9c-soft)">
                  {show.description}
                </p>
              )}
            </div>
          </div>

          {wide ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
              {stats}
              <OpenLine />
            </div>
          ) : (
            <>
              {stats}
              <Lineup guests={top} compact />
              <OpenLine />
            </>
          )}
        </div>

        {wide && (
          <div className="flex min-w-0 flex-col gap-2 border-t border-(--v9c-line) bg-(--v9c-ground)/55 px-5 pt-6 pb-3 sm:px-8">
            <h4 className="text-sm font-semibold tracking-wide text-(--v9c-dim) uppercase">
              Top of the lineup
            </h4>
            <Lineup guests={top} columns />
          </div>
        )}
      </Link>
    </li>
  );
}

function OpenLine() {
  return (
    <span className="mt-auto inline-flex items-center gap-3 self-start text-[1.05rem] font-semibold text-(--v9c-ink)">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-(--v9c-ink) text-(--v9c-on-ink) transition-transform group-hover:translate-x-1"
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
    <div
      className={`flex flex-col gap-2 py-5 first:pr-5 last:border-l last:border-(--v9c-line) last:pl-5 ${wide ? "lg:py-1 lg:first:pr-8 lg:last:pl-8" : ""}`}
    >
      <dt className="text-[0.95rem] text-(--v9c-soft)">{term}</dt>
      <dd
        className={`${styles.display} text-5xl leading-none font-medium tracking-[-0.04em] sm:text-6xl ${
          glowing && value ? styles.gradientText : ""
        } ${value === null ? `${styles.waiting} text-(--v9c-dim)` : ""}`}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

function Lineup({
  guests,
  compact = false,
  columns = false,
}: {
  guests: Guest[];
  compact?: boolean;
  columns?: boolean;
}) {
  const layout = columns
    ? "grid grid-cols-1 md:grid-flow-col md:grid-rows-3 md:gap-x-12"
    : "flex flex-col";
  if (!guests.length) {
    return (
      <ol aria-hidden className={`${layout} gap-y-2 pb-3`}>
        {Array.from({ length: compact ? 3 : 6 }, (_, index) => (
          <li
            key={index}
            className={`${styles.waiting} h-16 rounded-2xl bg-(--v9c-well)`}
          />
        ))}
      </ol>
    );
  }
  return (
    <ol className={layout}>
      {guests.map((guest, index) => (
        <GuestRow
          key={guest.ref}
          guest={guest}
          rank={index + 1}
          compact={compact}
          columns={columns}
        />
      ))}
    </ol>
  );
}

function GuestRow({
  guest,
  rank,
  compact,
  columns,
}: {
  guest: Guest;
  rank: number;
  compact: boolean;
  columns: boolean;
}) {
  const { fit, love_back, reach } = guest.scores;
  const sweet = guest.label === "sweet_spot";
  return (
    <li
      className={`flex min-w-0 items-center gap-3 border-b border-(--v9c-line) py-3.5 last:border-b-0 sm:gap-5 ${columns ? "md:[&:nth-child(3n)]:border-b-0" : ""}`}
    >
      <span
        aria-hidden
        className={`${styles.display} w-5 shrink-0 text-right text-[0.95rem] font-medium text-(--v9c-dim) tabular-nums`}
      >
        {rank}
      </span>
      <Voiceprint
        fit={fit}
        loveBack={love_back}
        reach={reach}
        bars={compact ? 22 : 30}
        width={compact ? 76 : 112}
        height={compact ? 34 : 44}
        className={`shrink-0 ${compact ? "h-8 w-[72px]" : "h-9 w-[88px] sm:h-11 sm:w-[112px]"}`}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span
            className={`${styles.display} text-[1.05rem] leading-tight font-medium`}
          >
            {guest.name}
          </span>
          <span
            className={`text-xs font-bold tracking-[0.08em] uppercase ${sweet ? styles.gradientText : "text-(--v9c-dim)"}`}
          >
            {LABEL_NAME[guest.label]}
          </span>
        </span>
        {!compact && guest.description && (
          <span className="truncate text-[0.95rem] text-(--v9c-soft)">
            {guest.description}
          </span>
        )}
        <span className="flex flex-wrap gap-x-3.5 text-sm text-(--v9c-soft) tabular-nums">
          <Score part="fit" name="Fit" value={fit} />
          <Score part="love" name="Love back" value={love_back} />
          <Score part="reach" name="Reach" value={reach} />
        </span>
      </span>
    </li>
  );
}

function Score({
  part,
  name,
  value,
}: {
  part: Part;
  name: string;
  value: number | null;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span style={{ color: INK[part] }}>{name}</span>
      {value === null ? (
        <span>
          <span aria-hidden>–</span>
          <span className="sr-only">not scored</span>
        </span>
      ) : (
        <span className="font-semibold text-(--v9c-ink)">{out100(value)}</span>
      )}
    </span>
  );
}
