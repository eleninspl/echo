"use client";

import { useState } from "react";

import { s } from "./styles";
import { Led } from "./parts";

type Mode = "fit" | "love" | "reach" | "sweet";

const MODES: { mode: Mode; name: string; short: string; path: string; text: string; angle: number }[] = [
  {
    mode: "fit",
    short: "Fit",
    name: "Fit",
    path: "Show to guest",
    text: "Your listeners over-index on the guest, beyond what the guest's fame alone predicts.",
    angle: -54,
  },
  {
    mode: "love",
    short: "Love",
    name: "Love back",
    path: "Guest to show",
    text: "The guest's fans over-index on your show, so the people they bring are likely to stay.",
    angle: -18,
  },
  {
    mode: "reach",
    short: "Reach",
    name: "Reach",
    path: "New ears",
    text: "The guest's fans are new to you: your listeners barely share the podcasts those fans favour.",
    angle: 18,
  },
  {
    mode: "sweet",
    short: "Sweet",
    name: "Sweet spot",
    path: "All three",
    text: "High on all three. Reach and love back pull against each other, so it is rare: 1 to 4 guests in 20. Echo says so.",
    angle: 54,
  },
];

const SHOW_X = 215;
const GUEST_X = 345;
const CENTER_Y = 178;
const RADIUS = 105;
const CROSS_X = 280;
const CROSS_TOP = 95.54;
const CROSS_BOTTOM = 260.46;

const REACH_AREA = `M ${CROSS_X} ${CROSS_TOP} A ${RADIUS} ${RADIUS} 0 1 1 ${CROSS_X} ${CROSS_BOTTOM} A ${RADIUS} ${RADIUS} 0 0 0 ${CROSS_X} ${CROSS_TOP} Z`;
const SHARED_AREA = `M ${CROSS_X} ${CROSS_TOP} A ${RADIUS} ${RADIUS} 0 0 0 ${CROSS_X} ${CROSS_BOTTOM} A ${RADIUS} ${RADIUS} 0 0 0 ${CROSS_X} ${CROSS_TOP} Z`;

function Overlap({ mode }: { mode: Mode }) {
  const all = mode === "sweet";
  const fit = all || mode === "fit";
  const love = all || mode === "love";
  const reach = all || mode === "reach";
  const lit = "var(--orange)";
  const idle = "#5b5a52";
  return (
    <svg viewBox="0 0 560 360" className="block h-auto w-full" role="img" aria-labelledby="overlap-03-title">
      <title id="overlap-03-title">
        Two overlapping audiences: your show&apos;s listeners and the guest&apos;s fans. Fit runs from the show to the
        guest, love back from the guest to the show, and reach is the part of the guest&apos;s audience your show
        doesn&apos;t have yet.
      </title>
      <defs>
        <pattern id="hatch-03" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={reach ? lit : idle} strokeWidth="2" />
        </pattern>
        <marker id="head-03-lit" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={lit} />
        </marker>
        <marker id="head-03-idle" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={idle} />
        </marker>
      </defs>

      <path d={REACH_AREA} fill="url(#hatch-03)" opacity={reach ? 0.9 : 0.5} />
      <path d={SHARED_AREA} fill={all ? "rgb(255 90 26 / 0.16)" : "rgb(236 230 214 / 0.06)"} />

      <circle
        cx={SHOW_X}
        cy={CENTER_Y}
        r={RADIUS}
        fill="none"
        stroke={fit ? "var(--lcd)" : idle}
        strokeWidth="3.2"
        strokeDasharray="0 9"
        strokeLinecap="round"
      />
      <circle
        cx={GUEST_X}
        cy={CENTER_Y}
        r={RADIUS}
        fill="none"
        stroke={love || reach ? "var(--lcd)" : idle}
        strokeWidth="3.2"
        strokeDasharray="0 9"
        strokeLinecap="round"
      />

      <path
        d="M 168 66 Q 280 0 392 66"
        fill="none"
        stroke={fit ? lit : idle}
        strokeWidth={fit ? 3 : 2}
        markerEnd={`url(#head-03-${fit ? "lit" : "idle"})`}
      />
      <path
        d="M 392 290 Q 280 356 168 290"
        fill="none"
        stroke={love ? lit : idle}
        strokeWidth={love ? 3 : 2}
        markerEnd={`url(#head-03-${love ? "lit" : "idle"})`}
      />

      <g className={s.mono} fontSize="13" fontWeight="700" letterSpacing="1.5" textAnchor="middle">
        <text x="280" y="20" fill={fit ? lit : "var(--lcd-dim)"}>
          FIT
        </text>
        <text x="280" y="348" fill={love ? lit : "var(--lcd-dim)"}>
          LOVE BACK
        </text>
      </g>

      <g className={s.mono} fontSize="12.5" letterSpacing="1" textAnchor="middle" fill="var(--lcd)">
        <text x="165" y="172">
          YOUR
        </text>
        <text x="165" y="189">
          LISTENERS
        </text>
        <text x="280" y="172" fill="var(--lcd-dim)">
          SHARED
        </text>
        <text x="280" y="189" fill="var(--lcd-dim)">
          TASTE
        </text>
      </g>
      <g className={s.mono} fontSize="12.5" letterSpacing="1" textAnchor="middle">
        <rect x="352" y="155" width="96" height="44" rx="4" fill="var(--screen)" />
        <text x="400" y="173" fill={reach ? lit : "var(--lcd)"} fontWeight="700">
          REACH
        </text>
        <text x="400" y="190" fill="var(--lcd)">
          NEW EARS
        </text>
      </g>
      <g className={s.mono} fontSize="12" letterSpacing="1" fill="var(--lcd-dim)" textAnchor="middle">
        <text x="70" y="92">
          YOUR SHOW
        </text>
        <text x="490" y="92">
          THE GUEST
        </text>
      </g>
      {all && (
        <g>
          <circle cx="280" cy="216" r="10" fill={lit} opacity="0.25" />
          <circle cx="280" cy="216" r="5" fill={lit} />
        </g>
      )}
    </svg>
  );
}

export function Scoring() {
  const [mode, setMode] = useState<Mode>("sweet");
  const current = MODES.find((item) => item.mode === mode) ?? MODES[3];

  function turn() {
    const position = MODES.findIndex((item) => item.mode === mode);
    setMode(MODES[(position + 1) % MODES.length].mode);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      <div className={`${s.screen} ${s.dotGrid} rounded-[18px] p-4 sm:p-6 lg:col-span-6`}>
        <div className={`${s.mono} mb-2 flex justify-between text-[0.6875rem] text-(--lcd-dim) uppercase`}>
          <span>Two audiences</span>
          <span className="text-(--lcd)">{current.name}</span>
        </div>
        <Overlap mode={mode} />
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center lg:col-span-6">
        <div className="relative mx-auto flex size-40 shrink-0 items-center justify-center sm:mr-10 sm:ml-0 lg:size-44">
          {MODES.map((item) => (
            <span
              key={item.mode}
              aria-hidden
              className="absolute top-1/2 left-1/2 h-[2px] w-[49%] origin-left"
              style={{ transform: `rotate(${item.angle}deg)` }}
            >
              <span
                className={`absolute right-0 h-[2px] w-2.5 ${item.mode === mode ? "bg-(--orange)" : "bg-(--print)"}`}
              />
              <span
                className={`${s.label} absolute top-1/2 left-[calc(100%+0.5rem)] text-[0.625rem] whitespace-nowrap ${
                  item.mode === mode ? "text-(--print)" : "text-(--print-soft)"
                }`}
                style={{ transform: `translateY(-50%) rotate(${-item.angle}deg)`, transformOrigin: "left center" }}
              >
                {item.short}
              </span>
            </span>
          ))}
          <button
            type="button"
            onClick={turn}
            aria-label={`Selector on ${current.name}. Turn to the next setting.`}
            className={`${s.knob} relative size-[72%] rounded-full`}
          >
            <span className={`${s.knobCap} absolute inset-[14%] block`} />
            <span
              aria-hidden
              className={`${s.pointer} absolute top-1/2 left-1/2 block h-[3px] w-[44%] origin-left`}
              style={{ transform: `rotate(${current.angle}deg)` }}
            >
              <span className="absolute right-[6%] h-full w-[48%] rounded-full bg-(--orange)" />
            </span>
          </button>
        </div>

        <fieldset className="flex min-w-0 flex-1 flex-col gap-1">
          <legend className="sr-only">Show one part of the score</legend>
          {MODES.map((item) => {
            const selected = item.mode === mode;
            return (
              <label
                key={item.mode}
                className={`flex cursor-pointer gap-3 rounded-[12px] border px-3 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--print) ${
                  selected ? "border-(--seam) bg-(--plate-hi)" : "border-transparent hover:bg-(--plate-hi)/60"
                }`}
              >
                <input
                  type="radio"
                  name="score-part-03"
                  value={item.mode}
                  checked={selected}
                  onChange={() => setMode(item.mode)}
                  className="sr-only"
                />
                <Led on={selected} className="mt-1 size-2" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-lg leading-none font-semibold">{item.name}</span>
                    <span className={`${s.label} text-[0.6875rem] text-(--print-soft)`}>{item.path}</span>
                  </span>
                  <span className="text-[0.9375rem] leading-snug text-(--print-soft)">{item.text}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>
    </div>
  );
}
