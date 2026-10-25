"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";
import { LABELS, score } from "@/lib/format";

import { styles } from "./styles";
import { INK, Overprint, RisoCover } from "./ink";

const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 lg:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 lg:grid-cols-2",
};

export function FeaturedShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return <FeaturedSection featured={featured} />;
}

export function FeaturedSection({ featured }: { featured: Featured[] }) {
  return (
    <section aria-labelledby="d04-featured" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="flex flex-col gap-2">
          <span className={`${styles.mono} text-sm font-bold tracking-wide text-(--blue) uppercase`}>
            Ready to open
          </span>
          <h2 id="d04-featured" className="text-[clamp(2.6rem,6vw,4.75rem)] leading-[0.86] uppercase">
            <Overprint className={styles.display}>Shows Echo has run</Overprint>
          </h2>
        </div>
        <p className="max-w-[44ch] text-[1.05rem] leading-snug text-(--blue)">
          Finished runs, scored the same way. Open one to see every guest and the reasons behind each score.
        </p>
      </div>
      <ul className={`grid gap-8 ${GRID[Math.min(featured.length, 4)]}`}>
        {featured.map((item, index) => (
          <ShowCard key={`${item.analysis_id}-${index}`} item={item} index={index} />
        ))}
      </ul>
    </section>
  );
}

function ShowCard({ item, index }: { item: Featured; index: number }) {
  const { show, analysis_id } = item;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(analysis_id, controller.signal)
      .then(setAnalysis)
      .catch(() => !controller.signal.aborted && setUnreachable(true));
    return () => controller.abort();
  }, [analysis_id]);

  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;

  return (
    <li className={`${styles.printIn} @container`} style={{ "--order": index } as CSSProperties}>
      <Link href={`/analyses/${encodeURIComponent(analysis_id)}`} className={`${styles.card} group block`}>
        <span className="grid grid-cols-1 gap-x-8 gap-y-7 @lg:grid-cols-2 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] @3xl:gap-x-10">
          <span className="flex flex-col gap-5 @lg:col-span-2 @3xl:col-span-1">
            <span className="flex items-start gap-4 @md:gap-5">
              <RisoCover
                title={show.title}
                imageUrl={show.image_url}
                duotone
                className="aspect-square w-24 @md:w-32"
              />
              <span className="flex min-w-0 flex-col gap-2 pt-1">
                <span className="text-[clamp(1.9rem,7cqw,2.75rem)] leading-[0.88] uppercase">
                  <Overprint className={styles.display}>{show.title}</Overprint>
                </span>
                {show.description && (
                  <span className="line-clamp-3 text-[0.98rem] leading-snug text-(--blue)">{show.description}</span>
                )}
              </span>
            </span>
            <Tally analysis={analysis} unreachable={unreachable} guests={guests.length} sweet={sweet} />
            <span className={`${styles.display} ${styles.runButton} self-start`}>
              Open the guest list <span aria-hidden>→</span>
            </span>
          </span>
          {done && guests.length > 0 && (
            <>
              <Scatter guests={guests} sweet={sweet} />
              <TopGuests guests={guests.slice(0, 3)} />
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

function Tally({
  analysis,
  unreachable,
  guests,
  sweet,
}: {
  analysis: Analysis | null;
  unreachable: boolean;
  guests: number;
  sweet: number;
}) {
  if (unreachable) {
    return <span className={`${styles.mono} text-sm text-(--blue)`}>The numbers didn&apos;t load. The run is still there.</span>;
  }
  if (!analysis) {
    return (
      <span className={`${styles.mono} flex items-center gap-3 text-sm font-bold text-(--blue)`}>
        <span aria-hidden className={styles.inking}>
          <span />
          <span />
          <span />
        </span>
        Loading the scores
      </span>
    );
  }
  if (analysis.status === "running") {
    return <span className={`${styles.mono} text-sm font-bold text-(--blue)`}>Still running. Open it to watch.</span>;
  }
  if (analysis.status === "failed") {
    return <span className={`${styles.mono} text-sm font-bold text-(--blue)`}>This run didn&apos;t finish.</span>;
  }
  return (
    <span className="flex items-end gap-8">
      <span className="flex flex-col">
        <span className={`${styles.display} text-[3.6rem] leading-[0.8] text-(--blue)`}>{guests}</span>
        <span className={`${styles.mono} mt-1.5 text-sm font-bold text-(--blue) uppercase`}>
          {guests === 1 ? "guest" : "guests"}
        </span>
      </span>
      <span className="flex flex-col">
        <span className="text-[3.6rem] leading-[0.8]">
          <Overprint className={styles.display}>{sweet}</Overprint>
        </span>
        <span className={`${styles.mono} mt-1.5 text-sm font-bold text-(--overprint) uppercase`}>
          {sweet === 1 ? "sweet spot" : "sweet spots"}
        </span>
      </span>
    </span>
  );
}

const PLOT = { width: 300, height: 236, left: 30, bottom: 30, top: 10, right: 12 };

function plotX(value: number) {
  return PLOT.left + value * (PLOT.width - PLOT.left - PLOT.right);
}

function plotY(value: number) {
  return PLOT.height - PLOT.bottom - value * (PLOT.height - PLOT.bottom - PLOT.top);
}

function dotRadius(guest: Guest) {
  return 4.2 + (guest.scores.reach ?? 0) * 7.5;
}

function Scatter({ guests, sweet }: { guests: Guest[]; sweet: number }) {
  const ordered = [...guests].sort(
    (a, b) => Number(a.label === "sweet_spot") - Number(b.label === "sweet_spot"),
  );
  const left = plotX(0);
  const right = plotX(1);
  const top = plotY(1);
  const bottom = plotY(0);
  return (
    <span className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
        className="w-full max-w-[420px] overflow-visible"
        role="img"
        aria-label={`${guests.length} guests placed by fit and love back, sized by reach. ${sweet} in the sweet spot.`}
      >
        <g stroke={INK.blue} fill="none" style={{ mixBlendMode: "multiply" }}>
          <path d={`M${left} ${top} V${bottom} H${right}`} strokeWidth="1.8" />
          <path
            d={`M${plotX(0.5)} ${top} V${bottom} M${left} ${plotY(0.5)} H${right}`}
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.7"
          />
        </g>
        <g className={styles.mono} fontSize="11" fontWeight="700" fill={INK.blue}>
          <text x={right} y={PLOT.height - 8} textAnchor="end">
            fit →
          </text>
          <text x={12} y={top} transform={`rotate(-90 12 ${top})`} textAnchor="end">
            love back →
          </text>
        </g>
        {ordered.map((guest) => {
          const x = plotX(guest.scores.fit);
          const y = plotY(guest.scores.love_back);
          const r = dotRadius(guest);
          if (guest.label === "sweet_spot") {
            return (
              <g key={guest.ref}>
                <circle
                  cx={x + 0.6}
                  cy={y - 0.4}
                  r={r + 5}
                  fill="none"
                  stroke={INK.pink}
                  strokeWidth="2.2"
                  strokeDasharray="5 2.5"
                  style={{ mixBlendMode: "multiply" }}
                />
                <circle cx={x - 1.6} cy={y + 1.3} r={r} fill={INK.pink} style={{ mixBlendMode: "multiply" }} />
                <circle cx={x + 1.3} cy={y - 1.1} r={r} fill={INK.blue} style={{ mixBlendMode: "multiply" }} />
              </g>
            );
          }
          return (
            <circle
              key={guest.ref}
              cx={x}
              cy={y}
              r={r}
              fill="url(#d04-dots-blue-fine)"
              stroke={INK.blue}
              strokeWidth="1.5"
              style={{ mixBlendMode: "multiply" }}
            />
          );
        })}
      </svg>
      <span className={`${styles.mono} max-w-[40ch] text-[0.8rem] leading-snug text-(--blue)`}>
        Each dot is a guest, sized by reach. Circled in pink: a sweet spot.
      </span>
    </span>
  );
}

function TopGuests({ guests }: { guests: Guest[] }) {
  return (
    <span className="flex flex-col">
      <span className={`${styles.mono} border-b-[3px] border-(--blue) pb-1.5 text-sm font-bold text-(--blue) uppercase`}>
        Top guests
      </span>
      <ol className="flex flex-col">
        {guests.map((guest, index) => (
          <li key={guest.ref} className="flex flex-col gap-2 border-b-2 border-dashed border-(--blue)/50 py-3">
            <span className="flex items-baseline justify-between gap-3">
              <span className={`${styles.display} min-w-0 truncate text-[1.45rem] leading-none text-(--overprint) uppercase`}>
                <span className="text-(--blue)">{index + 1}.</span> {guest.name}
              </span>
              <span
                className={`${styles.mono} shrink-0 text-[0.72rem] font-bold uppercase ${guest.label === "sweet_spot" ? styles.labelSweet : "text-(--blue)"}`}
              >
                {LABELS[guest.label].name}
              </span>
            </span>
            <span className="grid grid-cols-3 gap-2">
              <ScoreBar name="fit" value={guest.scores.fit} kind="pink" />
              <ScoreBar name="love back" value={guest.scores.love_back} kind="blue" />
              <ScoreBar name="reach" value={guest.scores.reach} kind="screen" />
            </span>
          </li>
        ))}
      </ol>
    </span>
  );
}

function ScoreBar({ name, value, kind }: { name: string; value: number | null; kind: "pink" | "blue" | "screen" }) {
  return (
    <span className="flex flex-col gap-1">
      <span className={`${styles.mono} flex justify-between gap-1 text-[0.72rem] leading-none font-bold text-(--blue)`}>
        <span>{name}</span>
        <span className="text-(--overprint)">{value === null ? "n/a" : score(value)}</span>
      </span>
      <span className={styles.barTrack}>
        {value !== null && (
          <span className={`${styles.barFill} ${styles[`bar_${kind}`]}`} style={{ width: `${Math.max(value, 0.02) * 100}%` }} />
        )}
      </span>
    </span>
  );
}
