import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { styles } from "./styles";

export type Part = "fit" | "love" | "reach";

export const TONE: Record<Part, string> = {
  fit: "#e8621a",
  love: "#db2b6e",
  reach: "#7c4ce6",
};
export const INK: Record<Part, string> = {
  fit: "#b5420b",
  love: "#c01f5c",
  reach: "#6638d4",
};
export const AUBERGINE = "#2a1030";

const MUTED = "#e9cfc9";
const CENTERS = [1 / 6, 1 / 2, 5 / 6];
const SPREAD = 0.13;

function channel(hex: string, at: number) {
  return parseInt(hex.slice(at, at + 2), 16);
}

function mix(from: string, to: string, amount: number) {
  const blend = (at: number) =>
    Math.round(
      channel(from, at) + (channel(to, at) - channel(from, at)) * amount,
    )
      .toString(16)
      .padStart(2, "0");
  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

export function toneAt(position: number) {
  if (position <= CENTERS[0]) return TONE.fit;
  if (position <= CENTERS[1])
    return mix(TONE.fit, TONE.love, (position - CENTERS[0]) * 3);
  if (position <= CENTERS[2])
    return mix(TONE.love, TONE.reach, (position - CENTERS[1]) * 3);
  return TONE.reach;
}

export function grain(index: number) {
  const value = Math.sin(index * 12.9898 + 4.1) * 43758.5453;
  return value - Math.floor(value);
}

function partAt(position: number): Part {
  if (position < 1 / 3) return "fit";
  if (position < 2 / 3) return "love";
  return "reach";
}

const round = (value: number) => Math.round(value * 100) / 100;

type VoiceprintProps = {
  fit: number;
  loveBack: number;
  reach: number | null;
  bars?: number;
  width?: number;
  height?: number;
  focus?: Part;
  className?: string;
};

export function Voiceprint({
  fit,
  loveBack,
  reach,
  bars = 30,
  width = 120,
  height = 44,
  focus,
  className = "",
}: VoiceprintProps) {
  const levels = [fit, loveBack, reach ?? 0];
  const step = width / bars;
  const thickness = step * 0.58;
  const middle = height / 2;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      focusable="false"
    >
      {Array.from({ length: bars }, (_, index) => {
        const position = (index + 0.5) / bars;
        const part = partAt(position);
        const envelope = levels.reduce(
          (sum, level, at) =>
            sum + level * Math.exp(-(((position - CENTERS[at]) / SPREAD) ** 2)),
          0,
        );
        const texture = 0.66 + 0.34 * grain(index);
        const level = Math.max(0.08, Math.min(1, envelope * texture));
        const unscored = reach === null && part === "reach";
        const size = unscored ? thickness : level * (height - 2);
        const muted = unscored || (focus !== undefined && part !== focus);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(middle - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={muted ? MUTED : toneAt(position)}
          />
        );
      })}
    </svg>
  );
}

const DIAL = 640;
const MIDDLE = DIAL / 2;
const BASE = 140;
const REACH_OUT = 142;
const GAP_SLOTS = 1.5;
const PLACEHOLDER_GUESTS = 14;

function polar(radius: number, angle: number) {
  return {
    x: round(MIDDLE + Math.cos(angle) * radius),
    y: round(MIDDLE + Math.sin(angle) * radius),
  };
}

export function Dial({
  guests,
  label,
  pending = false,
  className = "",
}: {
  guests: Guest[] | null;
  label?: string;
  pending?: boolean;
  className?: string;
}) {
  const count = guests?.length || PLACEHOLDER_GUESTS;
  const slots = count * (3 + GAP_SLOTS);
  const step = (Math.PI * 2) / slots;
  const thickness = Math.min(10, step * BASE * 0.62);
  const start = -Math.PI / 2;
  const labelRadius = 106;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${DIAL} ${DIAL}`}
      className={`block size-full overflow-visible ${className}`}
      focusable="false"
    >
      <defs>
        <radialGradient id="v9c-dial-glow">
          <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.62" stopColor="#ffe3d3" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe3d3" stopOpacity="0" />
        </radialGradient>
        <path
          id="v9c-dial-label"
          d={`M ${MIDDLE} ${MIDDLE - labelRadius} a ${labelRadius} ${labelRadius} 0 1 1 -0.01 0`}
        />
      </defs>

      <circle cx={MIDDLE} cy={MIDDLE} r={310} fill="url(#v9c-dial-glow)" />

      {[0, 1, 2].map((index) => (
        <circle
          key={`ripple-${index}`}
          cx={MIDDLE}
          cy={MIDDLE}
          r={316}
          fill="none"
          stroke={[TONE.fit, TONE.love, TONE.reach][index]}
          strokeWidth={1.4}
          className={styles.ring}
          style={
            {
              "--ring-duration": "9s",
              "--ring-delay": `${-index * 3}s`,
              "--ring-peak": 0.55,
              "--still-scale": 0.7 + index * 0.13,
              "--still-opacity": 0.18,
            } as CSSProperties
          }
        />
      ))}

      <circle
        cx={MIDDLE}
        cy={MIDDLE}
        r={BASE - 12}
        fill="none"
        stroke="#e7c9bf"
        strokeWidth={1.2}
      />
      <circle
        cx={MIDDLE}
        cy={MIDDLE}
        r={BASE + REACH_OUT + 14}
        fill="none"
        stroke="#ecd3ca"
        strokeWidth={1}
        strokeDasharray="1 7"
        strokeLinecap="round"
      />

      {label && (
        <text
          className={styles.display}
          fontSize={13.5}
          fontWeight={600}
          fill={AUBERGINE}
          fillOpacity={0.8}
        >
          <textPath
            href="#v9c-dial-label"
            textLength={round(Math.PI * 2 * labelRadius - 14)}
            lengthAdjust="spacing"
          >
            {label}
          </textPath>
        </text>
      )}

      {Array.from({ length: count }, (_, column) => {
        const guest = guests?.[column];
        const sweet = guest?.label === "sweet_spot";
        const levels: [Part, number | null][] = guest
          ? [
              ["fit", guest.scores.fit],
              ["love", guest.scores.love_back],
              ["reach", guest.scores.reach],
            ]
          : [
              ["fit", 0.3 + 0.5 * grain(column * 3)],
              ["love", 0.3 + 0.5 * grain(column * 3 + 1)],
              ["reach", 0.3 + 0.5 * grain(column * 3 + 2)],
            ];
        const first = column * (3 + GAP_SLOTS) + GAP_SLOTS / 2;
        const arcFrom = polar(BASE - 12, start + (first + 0.2) * step);
        const arcTo = polar(BASE - 12, start + (first + 2.8) * step);
        return (
          <g
            key={guest?.ref ?? column}
            className={
              guest ? styles.grow : pending ? styles.waiting : undefined
            }
            style={{ "--order": column } as CSSProperties}
          >
            {levels.map(([part, score], at) => {
              const angle = start + (first + at + 0.5) * step;
              const inner = polar(BASE, angle);
              if (score === null) {
                return (
                  <circle
                    key={part}
                    cx={inner.x}
                    cy={inner.y}
                    r={thickness / 2}
                    fill={MUTED}
                  />
                );
              }
              const outer = polar(
                BASE + Math.max(0.04, score) * REACH_OUT,
                angle,
              );
              return (
                <line
                  key={part}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={guest ? TONE[part] : MUTED}
                  strokeOpacity={guest && !sweet ? 0.5 : 1}
                  strokeWidth={guest && !sweet ? thickness * 0.6 : thickness}
                  strokeLinecap="round"
                />
              );
            })}
            {sweet && (
              <path
                d={`M ${arcFrom.x} ${arcFrom.y} A ${BASE - 12} ${BASE - 12} 0 0 1 ${arcTo.x} ${arcTo.y}`}
                fill="none"
                stroke={AUBERGINE}
                strokeWidth={4}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Strip({ bars = 150 }: { bars?: number }) {
  const width = 1440;
  const height = 96;
  const step = width / bars;
  const thickness = step * 0.5;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className="block h-14 w-full sm:h-20"
      focusable="false"
    >
      {Array.from({ length: bars }, (_, index) => {
        const t = (index + 0.5) / bars;
        const phrase = Math.abs(Math.sin(t * Math.PI * 5.2 + 0.6)) * 0.7 + 0.3;
        const fade = Math.sin(Math.PI * t) ** 0.6;
        const level = Math.max(
          0.06,
          phrase * fade * (0.45 + 0.55 * grain(index + 11)),
        );
        const size = level * (height - 4);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(height / 2 - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={toneAt(t)}
            className={styles.bar}
            style={
              {
                "--bar-delay": `${-round(grain(index + 97) * 2.6)}s`,
                "--bar-low": round(0.35 + grain(index + 3) * 0.4),
              } as CSSProperties
            }
          />
        );
      })}
    </svg>
  );
}

export function Bars({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`${styles.eq} ${className}`}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
