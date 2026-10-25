"use client";

import type { Guest } from "@/lib/echo";

import { finishedGuests, useAnalysis, useFeatured } from "./data";
import { styles } from "./styles";
import { out100 } from "./track";
import {
  BarRects,
  barsFor,
  CENTERS,
  levelsOf,
  PART_NAME,
  PARTS,
  Reflection,
  round,
  segmentBars,
  TONE,
  type Levels,
  type Part,
} from "./wave";

const WIDTH = 1200;
const STRIP = 64;
const ZOOM_TOP = 72;
const ZOOM_BOTTOM = 150;
const BIG = 330;
const BIG_BARS = 51;
const EXAMPLE: Levels = [0.88, 0.74, 0.68];

function pick(guests: Guest[]) {
  const sweet = guests.findIndex((guest) => guest.label === "sweet_spot" && guest.scores.reach !== null);
  if (sweet >= 0) return sweet;
  return guests.findIndex((guest) => guest.scores.reach !== null);
}

export type Reading = { part: Part; path: string; text: string };

export function Anatomy({ readings }: { readings: Reading[] }) {
  const featured = useFeatured();
  const item = featured?.[0] ?? null;
  const guests = finishedGuests(useAnalysis(item?.analysis_id ?? null));
  const index = pick(guests);
  const guest = index >= 0 ? guests[index] : null;
  const levels = guest ? levelsOf(guest) : EXAMPLE;
  const top = 8;
  const height = top + BIG;
  const baseline = round(top + BIG * 0.72);
  const room = BIG * 0.72 - 24;
  const big = segmentBars(levels, 0, WIDTH, BIG_BARS, 5);

  const gap = 8;
  const count = guests.length;
  const segment = count ? (WIDTH - gap * (count - 1)) / count : 0;
  const stripBars = count ? barsFor(segment, 6) : 0;
  const chosenLeft = index * (segment + gap);

  return (
    <figure className="flex flex-col gap-10">
      <div className="relative flex flex-col gap-4 sm:gap-0">
        {guest && (
          <p className="text-base text-(--v9b-soft) sm:absolute sm:top-0 sm:right-0 sm:-translate-y-[calc(100%+12px)] sm:text-sm">
            Zoomed in on <span className="font-semibold text-(--v9b-ink)">{guest.name}</span>, rank {index + 1} of{" "}
            {count} for {item?.show.title}
          </p>
        )}

        {guest && (
          <svg
            aria-hidden
            viewBox={`0 0 ${WIDTH} ${ZOOM_BOTTOM}`}
            className="hidden h-auto w-full sm:block"
            focusable="false"
          >
            <defs>
              <linearGradient id="v9b-zoom" x1={0} y1={0} x2={0} y2={1}>
                <stop offset="0" stopColor="#ff5c93" stopOpacity={0.2} />
                <stop offset="1" stopColor="#ff5c93" stopOpacity={0} />
              </linearGradient>
            </defs>
            <line x1={0} x2={WIDTH} y1={STRIP - 12} y2={STRIP - 12} stroke="#47304d" />
            {guests.map((each, at) => (
              <BarRects
                key={each.ref}
                bars={segmentBars(levelsOf(each), at * (segment + gap), segment, stripBars, at + 1)}
                paint={at === index ? "sweet" : "quiet"}
                baseline={STRIP - 12}
                room={STRIP - 20}
              />
            ))}
            <path
              d={`M${round(chosenLeft)} ${ZOOM_TOP} L${round(chosenLeft + segment)} ${ZOOM_TOP} L${WIDTH} ${ZOOM_BOTTOM} L0 ${ZOOM_BOTTOM} Z`}
              fill="url(#v9b-zoom)"
            />
            <path
              d={`M${round(chosenLeft)} ${ZOOM_TOP} L0 ${ZOOM_BOTTOM} M${round(chosenLeft + segment)} ${ZOOM_TOP} L${WIDTH} ${ZOOM_BOTTOM}`}
              fill="none"
              stroke="#ff5c93"
              strokeOpacity={0.45}
              strokeDasharray="3 6"
            />
            <rect x={round(chosenLeft)} y={ZOOM_TOP - 3} width={round(segment)} height={3} rx={1.5} fill="#ff5c93" />
          </svg>
        )}

        <div className={`${guest ? "pt-16" : "pt-10"} sm:pt-0`}>
          <div className="relative">
            <svg
              viewBox={`0 0 ${WIDTH} ${height}`}
              className="block h-auto w-full overflow-visible"
              role="img"
              aria-label={
                guest
                  ? `${guest.name}'s stretch of the wave, zoomed in: fit ${out100(levels[0])}, love back ${out100(levels[1])}, reach ${out100(levels[2] ?? 0)}.`
                  : "One guest's stretch of the wave, zoomed in: three swells for fit, love back and reach."
              }
              focusable="false"
            >
              <defs>
                <Reflection id="v9b-anatomy" width={WIDTH} baseline={baseline} height={height} strength={0.34} />
              </defs>
              <line x1={0} x2={WIDTH} y1={baseline} y2={baseline} stroke="#47304d" />
              {CENTERS.map((center, at) => (
                <line
                  key={center}
                  x1={center * WIDTH}
                  x2={center * WIDTH}
                  y1={top + 20}
                  y2={baseline}
                  stroke={TONE[PARTS[at]]}
                  strokeOpacity={0.35}
                  strokeDasharray="2 6"
                />
              ))}
              <BarRects bars={big} paint="lit" baseline={baseline} room={room} />
              <g mask="url(#v9b-anatomy-mask)">
                <BarRects bars={big} paint="lit" baseline={baseline} room={room} below />
              </g>
            </svg>

            {PARTS.map((part, at) => {
              const level = levels[at] ?? 0;
              const peak = baseline - 1.5 - level * room;
              return (
                <span
                  key={part}
                  aria-hidden
                  className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center pb-2 sm:pb-3"
                  style={{ left: `${CENTERS[at] * 100}%`, top: `${(peak / height) * 100}%`, color: TONE[part] }}
                >
                  {guest && (
                    <span
                      className={`${styles.display} text-3xl leading-none font-semibold tabular-nums sm:text-4xl lg:text-5xl`}
                    >
                      {out100(level)}
                    </span>
                  )}
                  <span
                    className={`text-[11px] font-bold tracking-[0.08em] whitespace-nowrap uppercase sm:text-sm ${guest ? "mt-1" : ""}`}
                  >
                    {PART_NAME[part]}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <figcaption className="sr-only">Fit, love back and reach, explained one swell at a time.</figcaption>
      <ol className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-0">
        {readings.map((reading, at) => (
          <li
            key={reading.part}
            className={`flex gap-5 lg:flex-col lg:gap-4 lg:px-8 ${at > 0 ? "lg:border-l lg:border-(--v9b-line)" : "lg:pl-0"}`}
          >
            <Overlap part={reading.part} />
            <div className="flex min-w-0 flex-col gap-2">
              <h3
                className={`${styles.display} text-2xl leading-tight font-semibold sm:text-[1.75rem]`}
                style={{ color: TONE[reading.part] }}
              >
                {PART_NAME[reading.part]}
              </h3>
              <p className="text-base font-semibold text-(--v9b-ink) sm:text-lg">{reading.path}</p>
              <p className="text-base leading-relaxed text-(--v9b-soft) sm:text-lg">{reading.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function Overlap({ part }: { part: Part }) {
  const show = { x: 34, y: 34 };
  const guest = { x: 62, y: 34 };
  const radius = 22;
  return (
    <svg aria-hidden viewBox="0 0 96 68" className="h-[60px] w-[86px] shrink-0 lg:h-[68px] lg:w-[96px]" focusable="false">
      <defs>
        <mask id={`v9b-overlap-${part}`}>
          <rect width={96} height={68} fill="#fff" />
          <circle cx={show.x} cy={show.y} r={radius} fill="#000" />
        </mask>
        <marker id={`v9b-head-${part}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0 0 10 5 0 10z" fill={TONE[part]} />
        </marker>
      </defs>
      {part === "reach" && (
        <circle cx={guest.x} cy={guest.y} r={radius} fill={TONE.reach} fillOpacity={0.45} mask={`url(#v9b-overlap-${part})`} />
      )}
      <circle cx={show.x} cy={show.y} r={radius} fill="none" stroke={TONE.fit} strokeOpacity={part === "fit" ? 1 : 0.55} strokeWidth={1.8} />
      <circle cx={guest.x} cy={guest.y} r={radius} fill="none" stroke={TONE.reach} strokeOpacity={part === "reach" ? 1 : 0.55} strokeWidth={1.8} />
      <circle cx={show.x - 8} cy={show.y} r={3.5} fill={TONE.fit} />
      <circle cx={guest.x + 8} cy={guest.y} r={3.5} fill={TONE.reach} />
      {part === "fit" && (
        <path
          d={`M${show.x - 6} ${show.y - 6} Q 48 6 ${guest.x + 4} ${guest.y - 8}`}
          fill="none"
          stroke={TONE.fit}
          strokeWidth={2.4}
          strokeLinecap="round"
          markerEnd={`url(#v9b-head-${part})`}
        />
      )}
      {part === "love" && (
        <path
          d={`M${guest.x + 6} ${guest.y + 6} Q 48 62 ${show.x - 4} ${show.y + 8}`}
          fill="none"
          stroke={TONE.love}
          strokeWidth={2.4}
          strokeLinecap="round"
          markerEnd={`url(#v9b-head-${part})`}
        />
      )}
    </svg>
  );
}
