import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { INK, LABEL_NAME, MUTED, PARTS, PART_NAME, TONE, barFor, clears, out100, scoreOf } from "./palette";

const WIDTH = 180;
const HEIGHT = 58;
const BASE = 54;
const RISE = 48;
const THIRD = WIDTH / 3;

function swell(value: number, index: number) {
  const steps = 18;
  const start = index * THIRD;
  const points = Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const lift = value * RISE * (0.5 - 0.5 * Math.cos(Math.PI * 2 * t));
    return `${(start + t * THIRD).toFixed(2)} ${(BASE - lift).toFixed(2)}`;
  });
  return `M ${points.join(" L ")}`;
}

export function Lineup({ guests }: { guests: Guest[] }) {
  return (
    <ol className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-7">
      {guests.map((guest, index) => (
        <GuestWave key={guest.ref} guest={guest} rank={index + 1} />
      ))}
    </ol>
  );
}

function GuestWave({ guest, rank }: { guest: Guest; rank: number }) {
  const sweet = guest.label === "sweet_spot";
  return (
    <li
      className={`w5-rise min-w-0 pt-2 ${sweet ? "border-t-2 border-(--w5-ink)" : "border-t border-(--w5-line-strong)"}`}
      style={{ "--order": rank } as CSSProperties}
    >
      <div className="flex items-baseline gap-2">
        <span className="w5-numbers w-5 shrink-0 text-[0.85rem] font-semibold text-(--w5-muted)">{rank}</span>
        <span className="min-w-0 truncate text-[0.98rem] font-bold">{guest.name}</span>
        <span
          className={`ml-auto shrink-0 text-[0.78rem] ${sweet ? "font-bold text-(--w5-ink)" : "text-(--w5-muted)"}`}
        >
          {LABEL_NAME[guest.label]}
        </span>
      </div>
      {guest.description && (
        <p className="mt-0.5 truncate pl-7 text-[0.82rem] text-(--w5-soft)">{guest.description}</p>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2.5 block h-auto w-full"
        role="img"
        aria-label={PARTS.map((part) => {
          const value = scoreOf(guest, part);
          return `${PART_NAME[part]} ${value === null ? "not scored" : out100(value)}`;
        }).join(", ")}
      >
        {PARTS.map((part, index) => {
          const value = scoreOf(guest, part);
          const bar = barFor(guest, part);
          const path = value === null ? null : swell(value, index);
          return (
            <g key={part}>
              {path && (
                <>
                  <path d={`${path} Z`} fill={TONE[part]} fillOpacity={sweet ? 0.26 : 0.14} />
                  <path
                    d={path}
                    fill="none"
                    stroke={TONE[part]}
                    strokeOpacity={sweet ? 1 : 0.7}
                    strokeWidth={1.75}
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
              {bar !== null && (
                <line
                  x1={index * THIRD + 6}
                  y1={BASE - bar * RISE}
                  x2={(index + 1) * THIRD - 6}
                  y2={BASE - bar * RISE}
                  stroke={INK}
                  strokeOpacity={0.75}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {value === null && (
                <text
                  x={index * THIRD + THIRD / 2}
                  y={BASE - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill={MUTED}
                >
                  not scored
                </text>
              )}
            </g>
          );
        })}
        <line
          x1={0}
          y1={BASE}
          x2={WIDTH}
          y2={BASE}
          stroke={INK}
          strokeOpacity={0.45}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="w5-numbers mt-1 grid grid-cols-3 text-center text-[0.84rem]">
        {PARTS.map((part) => {
          const value = scoreOf(guest, part);
          return (
            <span
              key={part}
              className={clears(guest, part) ? "font-bold text-(--w5-ink)" : "text-(--w5-muted)"}
            >
              {value === null ? "–" : out100(value)}
            </span>
          );
        })}
      </div>
    </li>
  );
}
