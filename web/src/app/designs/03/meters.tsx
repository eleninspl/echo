"use client";

import { useEffect, useState } from "react";

import { useFeatured } from "@/components/featured";
import type { Guest } from "@/lib/echo";

import { guestsOf, useAnalysis } from "./data";
import { s } from "./styles";
import { LABEL_NAME, Led, reading } from "./parts";

const PIVOT_X = 100;
const PIVOT_Y = 132;
const SWING = 50;

function point(value: number, radius: number) {
  const angle = ((-SWING + value * SWING * 2) * Math.PI) / 180;
  return {
    x: (PIVOT_X + radius * Math.sin(angle)).toFixed(2),
    y: (PIVOT_Y - radius * Math.cos(angle)).toFixed(2),
  };
}

function arc(from: number, to: number, radius: number) {
  const start = point(from, radius);
  const end = point(to, radius);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

const TICKS = Array.from({ length: 21 }, (_, index) => {
  const value = index / 20;
  const major = index % 4 === 0;
  const outer = point(value, 100);
  const inner = point(value, major ? 88 : 94);
  const text = point(value, 110);
  return { index, value, major, outer, inner, text };
});

export function VuMeter({ name, value, threshold }: { name: string; value: number | null; threshold: number }) {
  const resting = value === null;
  const angle = resting ? -SWING - 4 : -SWING + Math.min(Math.max(value, 0), 1) * SWING * 2;
  const inZone = !resting && value >= threshold;
  const zone = Math.round(threshold * 100);
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div className="rounded-[12px] bg-(--screen) p-[5px] shadow-[0_1px_0_var(--seam-light)]">
        <svg viewBox="0 0 200 124" className="block w-full rounded-[8px] bg-(--face)" aria-hidden>
          <path d={arc(threshold, 1, 96.5)} fill="none" stroke="var(--orange)" strokeWidth="7" />
          <path d={arc(0, 1, 100)} fill="none" stroke="var(--print)" strokeWidth="1" />
          {TICKS.map((tick) => (
            <line
              key={tick.index}
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
              stroke="var(--print)"
              strokeWidth={tick.major ? 1.6 : 0.9}
            />
          ))}
          {TICKS.filter((tick) => tick.major).map((tick) => (
            <text
              key={tick.index}
              x={tick.text.x}
              y={tick.text.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={s.mono}
              fontSize="9"
              fill="var(--print)"
            >
              {Math.round(tick.value * 100)}
            </text>
          ))}
          <text x="12" y="116" className={s.label} fontSize="12" fill="var(--print)">
            {name}
          </text>
          <text x="188" y="116" textAnchor="end" className={s.mono} fontSize="8" fill="var(--print-soft)">
            {`ZONE ${zone}+`}
          </text>
          {resting && (
            <text x="100" y="80" textAnchor="middle" className={s.mono} fontSize="9" fill="var(--print-soft)">
              NO READING
            </text>
          )}
          <g
            className={s.needle}
            style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${PIVOT_X}px ${PIVOT_Y}px` }}
          >
            <line
              x1={PIVOT_X}
              y1={PIVOT_Y}
              x2={PIVOT_X}
              y2="28"
              stroke="var(--print)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
          <circle cx={PIVOT_X} cy={PIVOT_Y} r="24" fill="var(--screen)" />
          <circle cx={PIVOT_X} cy={PIVOT_Y - 15} r="2.4" fill={inZone ? "var(--orange)" : "#4a4b44"} />
        </svg>
      </div>
      <figcaption className="flex flex-col gap-1.5 px-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <span className={`${s.label} flex items-center gap-1.5 text-[0.6875rem] whitespace-nowrap text-(--print-soft)`}>
          <Led on={inZone} className="size-1.5" />
          {name}
          <span className="sr-only">
            {resting ? ": no reading" : `: ${reading(value)}, ${inZone ? "in" : "below"} the sweet spot zone of ${zone}`}
          </span>
        </span>
        <span
          aria-hidden
          className={`${s.dot} rounded-[5px] bg-(--screen) px-2 py-1 text-right text-2xl leading-none font-black text-(--lcd) sm:min-w-14`}
        >
          {reading(value)}
        </span>
      </figcaption>
    </figure>
  );
}

function leadIndex(guests: Guest[]) {
  const complete = guests.findIndex((guest) => guest.label === "sweet_spot" && guest.scores.reach !== null);
  return Math.max(complete, 0);
}

export function MeterBridge() {
  const featured = useFeatured();
  const first = featured?.[0];
  const loaded = useAnalysis(first?.analysis_id);
  const guests = guestsOf(loaded);
  const lead = leadIndex(guests);
  const [chosen, setChosen] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const index = chosen === null || chosen >= guests.length ? lead : chosen;
  const guest: Guest | undefined = guests[index];
  const count = guests.length;

  useEffect(() => {
    if (!scanning || count < 2) return;
    const timer = setInterval(() => setChosen((current) => ((current ?? lead) + 1) % count), 2400);
    return () => clearInterval(timer);
  }, [scanning, count, lead]);

  function step(by: number) {
    if (count === 0) return;
    setScanning(false);
    setChosen((index + by + count) % count);
  }

  const status =
    featured === null || (first && loaded.state === "loading")
      ? "Tuning"
      : !first || loaded.state === "failed" || count === 0
        ? "Standby"
        : null;

  return (
    <div className={`${s.plate} relative flex flex-col gap-5 rounded-[22px] p-4 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5">
          <Led on={guest !== undefined} />
          <span className={`${s.label} text-[0.75rem]`}>Guest meter</span>
          <span className={`${s.mono} hidden text-[0.6875rem] text-(--print-soft) sm:inline`}>
            {first ? `reading ${first.show.title}` : "no show loaded"}
          </span>
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={scanning}
          disabled={count < 2}
          onClick={() => setScanning(!scanning)}
          className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-2 disabled:opacity-50"
        >
          <span className={`${s.label} text-[0.6875rem] text-(--print-soft)`}>Scan</span>
          <span className={`${s.switchTrack} relative block h-5 w-9 rounded-full p-[3px]`}>
            <span
              className={`${s.switchThumb} block size-3.5 rounded-full`}
              style={{ transform: scanning ? "translateX(16px)" : "none" }}
            />
          </span>
          <Led on={scanning} className="size-1.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <VuMeter name="Fit" value={guest?.scores.fit ?? null} threshold={0.5} />
        <VuMeter name="Love back" value={guest?.scores.love_back ?? null} threshold={0.33} />
        <VuMeter name="Reach" value={guest?.scores.reach ?? null} threshold={0.33} />
      </div>

      <div className="flex items-stretch gap-3">
        <div className={`${s.screen} ${s.dotGrid} relative min-w-0 flex-1 overflow-hidden rounded-[12px] px-4 py-3`}>
          {guest ? (
            <div aria-live="polite" className="flex min-w-0 flex-col gap-1">
              <p className={`${s.mono} flex justify-between gap-3 text-[0.6875rem] text-(--lcd-dim) uppercase`}>
                <span className="truncate">{first?.show.title}</span>
                <span className="shrink-0">
                  Rank {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                </span>
              </p>
              <p className="truncate text-xl leading-tight font-semibold">{guest.name}</p>
              <p className="flex min-w-0 items-center gap-3">
                <span className={`${s.label} flex shrink-0 items-center gap-1.5 text-[0.6875rem]`}>
                  <Led on={guest.label === "sweet_spot"} onScreen className="size-1.5" />
                  {LABEL_NAME[guest.label]}
                </span>
                {guest.description && (
                  <span className={`${s.mono} truncate text-[0.6875rem] text-(--lcd-dim)`}>{guest.description}</span>
                )}
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[4.5rem] flex-col justify-center gap-1">
              <p className={`${s.dot} text-xl font-black uppercase ${status === "Tuning" ? s.blink : ""}`}>{status}</p>
              <p className={`${s.mono} text-[0.6875rem] text-(--lcd-dim)`}>
                {status === "Tuning"
                  ? "Loading a show Echo has run."
                  : "Run Echo on your show and the meters read its guests."}
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={count < 2}
            aria-label="Previous guest"
            className={`${s.key} flex size-10 flex-1 items-center justify-center rounded-[9px] disabled:opacity-50`}
          >
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <path d="M7 1 L2 5 L7 9 Z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={count < 2}
            aria-label="Next guest"
            className={`${s.key} flex size-10 flex-1 items-center justify-center rounded-[9px] disabled:opacity-50`}
          >
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <path d="M3 1 L8 5 L3 9 Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
