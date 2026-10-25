"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest, type Label } from "@/lib/echo";

import { Cover } from "./cover";
import { styles } from "./styles";
import { ShowWave, TONE, Voiceprint } from "./wave";

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
      aria-labelledby="e9-shows"
      className="mx-auto w-full max-w-[1280px] scroll-mt-8 px-4 pt-8 pb-24 sm:px-8"
    >
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <h2
            id="e9-shows"
            className={`${styles.display} text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance`}
          >
            Shows Echo has run
          </h2>
          <p className="max-w-[54ch] text-lg text-(--e9-soft)">
            Open one to see every guest Echo found for it, ranked, with what drives each score.
          </p>
        </div>
        <span className="w-fit rounded-full bg-(--e9-plum) px-4 py-1.5 text-sm font-semibold text-(--e9-soft) ring-1 ring-(--e9-line)">
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

function useAnalysis(id: string) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(id, controller.signal)
      .then(setAnalysis)
      .catch(() => {});
    return () => controller.abort();
  }, [id]);
  return analysis;
}

function ShowCard({ item, wide, index }: { item: Featured; wide: boolean; index: number }) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const top = guests.slice(0, wide ? 5 : 3);

  return (
    <li className={`${styles.rise} min-w-0`} style={{ "--order": index } as CSSProperties}>
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className={`group grid h-full overflow-hidden rounded-[32px] bg-(--e9-plum) ring-1 ring-(--e9-line) transition-shadow hover:ring-(--e9-dim) ${
          wide ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" : ""
        }`}
      >
        <div className="flex min-w-0 flex-col gap-7 p-5 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <Cover show={show} size={wide ? 84 : 64} />
            <div className="min-w-0">
              <h3
                className={`${styles.display} text-xl leading-tight font-semibold tracking-[-0.02em] sm:text-2xl ${wide ? "lg:text-[1.9rem]" : ""}`}
              >
                {show.title}
              </h3>
              {show.description && <p className="mt-1.5 line-clamp-2 text-(--e9-soft)">{show.description}</p>}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <Stat term="Guests scored" value={done ? guests.length : null} />
            <Stat term={sweet === 1 ? "Sweet spot" : "Sweet spots"} value={done ? sweet : null} glowing />
          </dl>

          <figure className="flex flex-col gap-3">
            <ShowWave guests={guests} />
            <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-(--e9-dim)">
              <span className="text-(--e9-soft)">Every guest, best first:</span>
              <Key color={TONE.fit}>Fit</Key>
              <Key color={TONE.love}>Love back</Key>
              <Key color={TONE.reach}>Reach</Key>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-(--e9-ink)" />
                Sweet spot
              </span>
            </figcaption>
          </figure>

          {!wide && <Lineup guests={top} compact />}

          <OpenLine />
        </div>

        {wide && (
          <div className="flex min-w-0 flex-col gap-4 border-t border-(--e9-line) bg-(--e9-ground)/45 p-5 sm:p-8 lg:border-t-0 lg:border-l">
            <h4 className="text-sm font-semibold tracking-wide text-(--e9-soft)">Top of the lineup</h4>
            <Lineup guests={top} />
          </div>
        )}
      </Link>
    </li>
  );
}

function OpenLine() {
  return (
    <span className="mt-auto inline-flex items-center gap-3 self-start font-semibold text-(--e9-ink)">
      <span
        aria-hidden
        className={`${styles.gradientFill} flex size-10 items-center justify-center rounded-full text-(--e9-on-hue) transition-transform group-hover:translate-x-1`}
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

function Stat({ term, value, glowing = false }: { term: string; value: number | null; glowing?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl bg-(--e9-ground)/55 px-5 py-4">
      <dt className="text-sm text-(--e9-soft)">{term}</dt>
      <dd
        className={`${styles.display} text-4xl leading-none font-semibold tracking-[-0.03em] sm:text-5xl ${
          glowing && value ? styles.gradientText : ""
        } ${value === null ? `${styles.waiting} text-(--e9-dim)` : ""}`}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

function Key({ color, children }: { color: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="h-2.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function Lineup({ guests, compact = false }: { guests: Guest[]; compact?: boolean }) {
  if (!guests.length) {
    return (
      <ol aria-hidden className="flex flex-col gap-2">
        {Array.from({ length: compact ? 3 : 5 }, (_, index) => (
          <li key={index} className={`${styles.waiting} h-16 rounded-2xl bg-(--e9-plum-hi)`} />
        ))}
      </ol>
    );
  }
  return (
    <ol className="flex flex-col gap-1.5">
      {guests.map((guest, index) => (
        <GuestRow key={guest.ref} guest={guest} rank={index + 1} compact={compact} />
      ))}
    </ol>
  );
}

function GuestRow({ guest, rank, compact }: { guest: Guest; rank: number; compact: boolean }) {
  const { fit, love_back, reach } = guest.scores;
  const sweet = guest.label === "sweet_spot";
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3 py-3 sm:gap-5 ${sweet ? "bg-(--e9-plum-hi)/70" : ""}`}
    >
      <span
        aria-hidden
        className={`${styles.display} w-5 shrink-0 text-right text-sm font-semibold text-(--e9-dim) tabular-nums`}
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
        className={`shrink-0 ${compact ? "h-8 w-[72px]" : "h-8 w-[72px] sm:h-11 sm:w-[112px]"}`}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className={`${styles.display} text-base leading-tight font-semibold`}>{guest.name}</span>
          <span
            className={`text-xs font-semibold tracking-wide uppercase ${sweet ? styles.gradientText : "text-(--e9-dim)"}`}
          >
            {LABEL_NAME[guest.label]}
          </span>
        </span>
        {!compact && guest.description && (
          <span className="truncate text-sm text-(--e9-soft)">{guest.description}</span>
        )}
        <span className="flex flex-wrap gap-x-3 text-xs text-(--e9-soft) tabular-nums">
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
    <span className="inline-flex items-baseline gap-1">
      <span style={{ color }}>{name}</span>
      {value === null ? (
        <span>
          <span aria-hidden>–</span>
          <span className="sr-only">not scored</span>
        </span>
      ) : (
        <span className="font-semibold text-(--e9-ink)">{out100(value)}</span>
      )}
    </span>
  );
}
