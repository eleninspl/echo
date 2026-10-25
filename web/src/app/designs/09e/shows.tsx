"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";
import type { Featured, Guest, Label } from "@/lib/echo";

import { Cover } from "./cover";
import { styles } from "./styles";
import { useAnalysis } from "./use-analysis";
import { TONE, Voiceprint } from "./wave";

const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

const out100 = (value: number) => String(Math.round(value * 100));

const COLUMNS = "sm:grid-cols-[1.75rem_5.5rem_minmax(0,1fr)_3.25rem_3.25rem_3.25rem] sm:gap-x-5";

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const wide = featured.length === 1;

  return (
    <section id="shows" aria-labelledby="v9e-shows" className="scroll-mt-6 border-t border-(--v9e-line)">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-28 sm:px-10 lg:py-40">
        <div className="mb-14 grid grid-cols-1 gap-6 lg:mb-20 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          <h2
            id="v9e-shows"
            className={`${styles.display} text-[clamp(2.75rem,5.4vw,4.75rem)] leading-[0.98] tracking-[-0.01em] lg:col-span-7`}
          >
            Shows Echo has run
          </h2>
          <p className="max-w-[40ch] text-xl leading-relaxed text-(--v9e-soft) lg:col-span-5">
            Open one to see every guest Echo found for it, ranked, with what drives each score.
          </p>
        </div>
        <ul className={`grid grid-cols-1 gap-6 ${wide ? "" : "lg:grid-cols-2"}`}>
          {featured.map((item) => (
            <ShowCard key={item.analysis_id} item={item} wide={wide} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ShowCard({ item, wide }: { item: Featured; wide: boolean }) {
  const { show, analysis_id } = item;
  const { analysis } = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const top = guests.slice(0, wide ? 5 : 3);

  return (
    <li className="min-w-0">
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className={`group grid h-full overflow-hidden rounded-[28px] bg-(--v9e-plum)/60 ring-1 ring-(--v9e-line) transition-shadow hover:ring-(--v9e-line-hi) ${
          wide ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""
        }`}
      >
        <div className={`flex min-w-0 flex-col gap-10 p-6 sm:p-10 ${wide ? "lg:p-12" : ""}`}>
          <div className="flex flex-col gap-6">
            <Cover show={show} size={wide ? 88 : 64} />
            <div className="min-w-0">
              <h3 className={`${styles.display} text-4xl leading-[1.02] ${wide ? "sm:text-5xl" : ""}`}>
                {show.title}
              </h3>
              {show.description && (
                <p className="mt-3 line-clamp-2 text-lg leading-relaxed text-(--v9e-soft)">{show.description}</p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-6 border-t border-(--v9e-line) pt-8">
            <Stat term="Guests scored" value={done ? guests.length : null} />
            <Stat term={sweet === 1 ? "Sweet spot" : "Sweet spots"} value={done ? sweet : null} highlight />
          </dl>

          {!wide && <Lineup guests={top} compact />}

          <span className="mt-auto inline-flex items-center gap-3 self-start text-base font-semibold text-(--v9e-ink)">
            Open the analysis
            <svg
              aria-hidden
              viewBox="0 0 24 12"
              className="h-3 w-6 transition-transform group-hover:translate-x-1"
              focusable="false"
            >
              <path
                d="M0 6h22m-5-5 5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {wide && (
          <div className="flex min-w-0 flex-col gap-6 border-t border-(--v9e-line) p-6 sm:p-10 lg:border-t-0 lg:border-l lg:p-12">
            <h4 className={styles.overline}>Top of the lineup</h4>
            <Lineup guests={top} />
          </div>
        )}
      </Link>
    </li>
  );
}

function Stat({ term, value, highlight = false }: { term: string; value: number | null; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-base text-(--v9e-dim)">{term}</dt>
      <dd
        className={`${styles.display} w-fit pr-[0.06em] text-7xl leading-[0.9] tabular-nums sm:text-8xl ${
          value === null ? "text-(--v9e-muted)" : highlight && value ? `${styles.gradientText} italic` : ""
        }`}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

function Lineup({ guests, compact = false }: { guests: Guest[]; compact?: boolean }) {
  if (!guests.length) {
    return (
      <ol aria-hidden className="flex flex-col border-t border-(--v9e-line)">
        {Array.from({ length: compact ? 3 : 5 }, (_, index) => (
          <li key={index} className="h-[4.75rem] border-b border-(--v9e-line)" />
        ))}
      </ol>
    );
  }
  return (
    <div className="flex flex-col">
      <div
        aria-hidden
        className={`hidden pb-3 text-sm font-semibold ${COLUMNS} ${compact ? "" : "sm:grid"}`}
      >
        <span />
        <span />
        <span />
        <span className="text-right" style={{ color: TONE.fit }}>
          Fit
        </span>
        <span className="text-right whitespace-nowrap" style={{ color: TONE.love }}>
          Love back
        </span>
        <span className="text-right" style={{ color: TONE.reach }}>
          Reach
        </span>
      </div>
      <ol className="flex flex-col border-t border-(--v9e-line)">
        {guests.map((guest, index) => (
          <GuestRow key={guest.ref} guest={guest} rank={index + 1} compact={compact} />
        ))}
      </ol>
    </div>
  );
}

function GuestRow({ guest, rank, compact }: { guest: Guest; rank: number; compact: boolean }) {
  const { fit, love_back, reach } = guest.scores;
  const sweet = guest.label === "sweet_spot";
  return (
    <li
      className={`grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-(--v9e-line) py-4 ${
        compact ? "sm:grid-cols-[1.75rem_4.5rem_minmax(0,1fr)] sm:gap-x-5" : COLUMNS
      }`}
    >
      <span aria-hidden className={`${styles.display} text-2xl leading-none text-(--v9e-dim) tabular-nums`}>
        {rank}
      </span>
      <Voiceprint
        fit={fit}
        loveBack={love_back}
        reach={reach}
        quiet={!sweet}
        bars={compact ? 21 : 25}
        width={compact ? 72 : 88}
        height={32}
        className={`hidden h-8 shrink-0 sm:block ${compact ? "w-[72px]" : "w-[88px]"}`}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-lg leading-snug font-semibold">{guest.name}</span>
          <span className={`text-sm ${sweet ? `${styles.gradientText} font-semibold` : "text-(--v9e-dim)"}`}>
            {LABEL_NAME[guest.label]}
          </span>
        </span>
        {guest.description && <span className="truncate text-base text-(--v9e-dim)">{guest.description}</span>}
        <span
          className={`mt-1 flex flex-wrap gap-x-4 text-sm text-(--v9e-dim) tabular-nums ${compact ? "" : "sm:hidden"}`}
        >
          <Score color={TONE.fit} name="Fit" value={fit} />
          <Score color={TONE.love} name="Love back" value={love_back} />
          <Score color={TONE.reach} name="Reach" value={reach} />
        </span>
      </span>
      {!compact && (
        <>
          <Cell value={fit} name="Fit" />
          <Cell value={love_back} name="Love back" />
          <Cell value={reach} name="Reach" />
        </>
      )}
    </li>
  );
}

function Cell({ value, name }: { value: number | null; name: string }) {
  return (
    <span className="hidden text-right text-lg text-(--v9e-ink) tabular-nums sm:block">
      <span className="sr-only">{name} </span>
      {value === null ? (
        <>
          <span aria-hidden className="text-(--v9e-dim)">
            –
          </span>
          <span className="sr-only">not scored</span>
        </>
      ) : (
        out100(value)
      )}
    </span>
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
        <span className="font-semibold text-(--v9e-ink)">{out100(value)}</span>
      )}
    </span>
  );
}
