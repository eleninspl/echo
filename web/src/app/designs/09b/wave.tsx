import { useId } from "react";

import type { Guest } from "@/lib/echo";

import { styles } from "./styles";

export type Part = "fit" | "love" | "reach";

export const PARTS: Part[] = ["fit", "love", "reach"];

export const TONE: Record<Part, string> = { fit: "#ff9a52", love: "#ff5c93", reach: "#b48aff" };

export const PART_NAME: Record<Part, string> = { fit: "Fit", love: "Love back", reach: "Reach" };

export const CENTERS = [1 / 6, 1 / 2, 5 / 6];

const SWELL_HALF_WIDTH = 0.24;
const FLOOR = 0.045;
const UNLIT_GROUND = "#2c1a33";
export const QUIET = "#3d2944";

function channel(hex: string, at: number) {
  return parseInt(hex.slice(at, at + 2), 16);
}

export function mix(from: string, to: string, amount: number) {
  const blend = (at: number) =>
    Math.round(channel(from, at) + (channel(to, at) - channel(from, at)) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

export const UNLIT: Record<Part, string> = {
  fit: mix(TONE.fit, UNLIT_GROUND, 0.64),
  love: mix(TONE.love, UNLIT_GROUND, 0.64),
  reach: mix(TONE.reach, UNLIT_GROUND, 0.64),
};

export function toneAt(position: number) {
  if (position <= CENTERS[0]) return TONE.fit;
  if (position <= CENTERS[1]) return mix(TONE.fit, TONE.love, (position - CENTERS[0]) * 3);
  if (position <= CENTERS[2]) return mix(TONE.love, TONE.reach, (position - CENTERS[1]) * 3);
  return TONE.reach;
}

export function grain(index: number) {
  const value = Math.sin(index * 12.9898 + 4.1) * 43758.5453;
  return value - Math.floor(value);
}

export function partAt(position: number): Part {
  if (position < 1 / 3) return "fit";
  if (position < 2 / 3) return "love";
  return "reach";
}

export const round = (value: number) => Math.round(value * 100) / 100;

export type Levels = [number, number, number | null];

export function levelsOf(guest: Guest): Levels {
  return [guest.scores.fit, guest.scores.love_back, guest.scores.reach];
}

export function swell(levels: Levels, position: number, seed: number) {
  const own = levels[PARTS.indexOf(partAt(position))];
  if (own === null) return null;
  let top = 0;
  let onCenter = false;
  levels.forEach((level, at) => {
    if (level === null) return;
    const distance = Math.abs(position - CENTERS[at]) / SWELL_HALF_WIDTH;
    if (distance < 1e-6) onCenter = true;
    if (distance >= 1) return;
    top = Math.max(top, level * Math.cos((distance * Math.PI) / 2) ** 1.4);
  });
  const texture = onCenter ? 1 : 0.93 + 0.07 * grain(seed);
  return Math.max(FLOOR, Math.min(1, top * texture));
}

export type Bar = {
  key: string;
  x: number;
  width: number;
  level: number | null;
  position: number;
  part: Part;
};

export function segmentBars(levels: Levels, left: number, width: number, bars: number, seed = 0): Bar[] {
  const step = width / bars;
  const thickness = Math.max(1.4, step * (step < 4 ? 0.68 : 0.58));
  return Array.from({ length: bars }, (_, index) => {
    const position = (index + 0.5) / bars;
    return {
      key: `${seed}-${index}`,
      x: round(left + index * step + (step - thickness) / 2),
      width: round(thickness),
      level: swell(levels, position, seed * 97 + index),
      position,
      part: partAt(position),
    };
  });
}

export function barsFor(segmentWidth: number, minimumStep: number) {
  return [21, 15, 9, 3].find((count) => segmentWidth / count >= minimumStep) ?? 3;
}

export type Paint = "lit" | "unlit" | "sweet" | "quiet";

export function fillFor(bar: Bar, paint: Paint) {
  if (bar.level === null) return QUIET;
  if (paint === "sweet") return toneAt(bar.position);
  if (paint === "lit") return TONE[bar.part];
  if (paint === "quiet") return QUIET;
  return UNLIT[bar.part];
}

export function BarRects({
  bars,
  paint,
  baseline,
  room,
  below = false,
}: {
  bars: Bar[];
  paint: Paint;
  baseline: number;
  room: number;
  below?: boolean;
}) {
  return bars.map((bar) => {
    const size = bar.level === null ? bar.width : Math.max(bar.width, bar.level * room);
    return (
      <rect
        key={bar.key}
        x={bar.x}
        y={round(below ? baseline + 1.5 : baseline - 1.5 - size)}
        width={bar.width}
        height={round(size)}
        rx={round(bar.width / 2)}
        fill={fillFor(bar, paint)}
      />
    );
  });
}

export function Reflection({
  id,
  width,
  baseline,
  height,
  strength = 0.42,
}: {
  id: string;
  width: number;
  baseline: number;
  height: number;
  strength?: number;
}) {
  return (
    <>
      <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1={0} y1={baseline} x2={0} y2={height}>
        <stop offset="0" stopColor="#fff" stopOpacity={strength} />
        <stop offset="1" stopColor="#fff" stopOpacity={0} />
      </linearGradient>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
        <rect x={0} y={baseline} width={width} height={height - baseline} fill={`url(#${id}-fade)`} />
      </mask>
    </>
  );
}

type SegmentProps = {
  levels: Levels;
  paint?: Paint;
  bars?: number;
  width?: number;
  height?: number;
  className?: string;
};

export function Segment({ levels, paint = "lit", bars = 21, width = 168, height = 64, className = "" }: SegmentProps) {
  const id = `v9b-seg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const baseline = height * 0.72;
  const room = baseline - 2;
  const items = segmentBars(levels, 0, width, bars, 3);
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} className={className} focusable="false">
      <defs>
        <Reflection id={id} width={width} baseline={baseline} height={height} />
      </defs>
      <BarRects bars={items} paint={paint} baseline={baseline} room={room} />
      <g mask={`url(#${id}-mask)`}>
        <BarRects bars={items} paint={paint} baseline={baseline} room={room} below />
      </g>
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
