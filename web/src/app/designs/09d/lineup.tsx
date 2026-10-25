"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { useDeck } from "./deck";
import { styles } from "./styles";
import { LABEL_NAME, out100, TONE, Voiceprint } from "./wave";

const pad = (value: number) => String(value).padStart(2, "0");

const ROW =
  "grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 sm:grid-cols-[2.25rem_76px_minmax(0,1fr)_auto] sm:gap-x-4";
const SCORES = "flex gap-2.5 tabular-nums sm:gap-3";
const SCORE_CELL = "flex w-11 justify-end whitespace-nowrap sm:w-12";

export function Lineup() {
  const deck = useDeck();
  if (!deck.current || !deck.guests) return null;
  const { guests, current } = deck;
  const half = Math.ceil(guests.length / 2);
  const columns = guests.length > 6 ? [guests.slice(0, half), guests.slice(half)] : [guests];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;

  return (
    <section
      id="lineup"
      aria-labelledby="v9d-lineup"
      className="mx-auto w-full max-w-[1280px] scroll-mt-6 px-4 sm:px-8"
    >
      <div className="flex flex-col gap-5 border-t border-(--v9d-line) pt-14 pb-6 sm:flex-row sm:items-end sm:justify-between lg:pt-20">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold tracking-[0.18em] text-(--v9d-soft) uppercase">The lineup</p>
          <h2
            id="v9d-lineup"
            className={`${styles.headline} text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[0.95] text-balance`}
          >
            {current.show.title}, guest by guest
          </h2>
          <p className="max-w-[56ch] text-lg text-(--v9d-soft)">
            Every guest Echo found, ranked best first. The waveform in the player is this list: one swell per score, one
            chapter per guest.
            {sweet > 0 && (
              <>
                {" "}
                <span className="font-semibold text-(--v9d-ink)">
                  {sweet} of {guests.length} are sweet spots.
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href={`/analyses/${encodeURIComponent(current.analysis_id)}`}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-3 font-semibold text-(--v9d-ink) ring-1 ring-(--v9d-line) transition hover:ring-(--v9d-fit) sm:self-auto"
        >
          Open the analysis
          <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-(--v9d-fit)" focusable="false">
            <path
              d="M4 10h11m-4-4 4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
        {columns.map((column, at) => (
          <div
            key={at}
            className={`flex min-w-0 flex-col ${at === 1 ? "lg:border-l lg:border-(--v9d-line) lg:pl-8" : ""}`}
          >
            <div
              aria-hidden
              className={`${ROW} border-b border-(--v9d-line) pb-2.5 text-xs font-bold tracking-[0.05em] uppercase sm:tracking-[0.08em] ${at === 1 ? "hidden lg:grid" : ""}`}
            >
              <span className="text-(--v9d-dim)">No.</span>
              <span className="hidden sm:block" />
              <span className="text-(--v9d-dim)">Guest</span>
              <span className={SCORES}>
                <span className={SCORE_CELL} style={{ color: TONE.fit }}>
                  Fit
                </span>
                <span className={SCORE_CELL} style={{ color: TONE.love }}>
                  Love
                </span>
                <span className={SCORE_CELL} style={{ color: TONE.reach }}>
                  Reach
                </span>
              </span>
            </div>
            <ol start={at === 0 ? 1 : half + 1} className="flex flex-col">
              {column.map((guest, index) => {
                const rank = (at === 0 ? 0 : half) + index;
                return <Row key={guest.ref} guest={guest} rank={rank} active={rank === deck.selected} />;
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({ guest, rank, active }: { guest: Guest; rank: number; active: boolean }) {
  const { fit, love_back, reach } = guest.scores;
  const sweet = guest.label === "sweet_spot";
  return (
    <li className={`${styles.rise} border-b border-(--v9d-line)/70`} style={{ "--order": rank } as CSSProperties}>
      <div className={`${ROW} rounded-2xl py-3.5 transition-colors ${active ? "bg-(--v9d-plum-hi)" : ""}`}>
        <span
          className={`${styles.display} text-sm font-semibold tabular-nums ${active ? "text-(--v9d-ink)" : "text-(--v9d-dim)"}`}
        >
          {pad(rank + 1)}
        </span>
        <Voiceprint
          fit={fit}
          loveBack={love_back}
          reach={reach}
          bars={22}
          width={76}
          height={34}
          className="hidden h-[34px] w-[76px] sm:block"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[1.05rem] leading-tight font-semibold">{guest.name}</span>
          <span className="truncate text-sm text-(--v9d-soft)">
            <span className={`font-bold ${sweet ? styles.gradientText : "text-(--v9d-ink)/85"}`}>
              {LABEL_NAME[guest.label]}
            </span>
            {guest.description && ` · ${guest.description}`}
          </span>
        </span>
        <span className={SCORES}>
          <Score name="Fit" value={fit} />
          <Score name="Love back" value={love_back} />
          <Score name="Reach" value={reach} />
        </span>
      </div>
    </li>
  );
}

function Score({ name, value }: { name: string; value: number | null }) {
  return (
    <span className={`${SCORE_CELL} ${styles.display} text-base leading-none font-semibold`}>
      <span className="sr-only">{name} </span>
      {value === null ? (
        <>
          <span aria-hidden className="text-(--v9d-dim)">
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
