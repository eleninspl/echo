import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { styles } from "./styles";

export type Part = "fit" | "love" | "reach";

export const PARTS: Part[] = ["fit", "love", "reach"];

export const TONE: Record<Part, string> = { fit: "#ff9a52", love: "#ff5c93", reach: "#b48aff" };

export const PART_NAME: Record<Part, string> = { fit: "Fit", love: "Love back", reach: "Reach" };

export const MUTED = "#4f3a55";

export type Wave = { fit: number; love: number; reach: number | null };

export const waveOf = (guest: Guest): Wave => ({
  fit: guest.scores.fit,
  love: guest.scores.love_back,
  reach: guest.scores.reach,
});

export const out100 = (value: number) => String(Math.round(value * 100));

export function grain(index: number) {
  const value = Math.sin(index * 12.9898 + 4.1) * 43758.5453;
  return value - Math.floor(value);
}

function channel(hex: string, at: number) {
  return parseInt(hex.slice(at, at + 2), 16);
}

function mix(from: string, to: string, amount: number) {
  const blend = (at: number) =>
    Math.round(channel(from, at) + (channel(to, at) - channel(from, at)) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

export function toneAt(position: number) {
  if (position <= 1 / 6) return TONE.fit;
  if (position <= 1 / 2) return mix(TONE.fit, TONE.love, (position - 1 / 6) * 3);
  if (position <= 5 / 6) return mix(TONE.love, TONE.reach, (position - 1 / 2) * 3);
  return TONE.reach;
}

const round = (value: number) => Math.round(value * 100) / 100;

type Bar = { part: Part; level: number; unscored: boolean };

function swells(wave: Wave, perSwell: number, seed: number): Bar[] {
  const half = (perSwell - 1) / 2;
  return PARTS.flatMap((part, at) => {
    const score = wave[part];
    return Array.from({ length: perSwell }, (_, step) => {
      const index = at * perSwell + step;
      const spread = half === 0 ? 0 : (step - half) / (half + 1);
      const shape = Math.exp(-((spread * 1.7) ** 2));
      const texture = step === half ? 1 : 0.78 + 0.22 * grain(index + seed);
      return { part, level: (score ?? 0) * shape * texture, unscored: score === null };
    });
  });
}

type VoiceprintProps = {
  wave: Wave;
  perSwell?: number;
  width?: number;
  height?: number;
  focus?: Part;
  grow?: boolean;
  className?: string;
  seed?: number;
};

export function Voiceprint({
  wave,
  perSwell = 9,
  width = 120,
  height = 44,
  focus,
  grow = false,
  className = "",
  seed = 0,
}: VoiceprintProps) {
  const bars = swells(wave, perSwell, seed);
  const step = width / bars.length;
  const thickness = step * 0.58;
  const middle = height / 2;

  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} className={className} focusable="false">
      {bars.map((bar, index) => {
        const size = bar.unscored ? thickness : Math.max(thickness, bar.level * height);
        const muted = bar.unscored || (focus !== undefined && bar.part !== focus);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(middle - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={muted ? MUTED : TONE[bar.part]}
            className={grow ? styles.grow : undefined}
            style={grow ? ({ "--order": index } as CSSProperties) : undefined}
          />
        );
      })}
    </svg>
  );
}

const PER_GUEST = 1;
const STEP = 9;
const THICK = 6;
const GUEST_GAP = 10;
const MARK = 14;

export function ShowWave({ guests, height = 112, slots = 14 }: { guests: Guest[]; height?: number; slots?: number }) {
  const count = guests.length || slots;
  const group = PER_GUEST * 3 * STEP;
  const width = count * (group + GUEST_GAP) - GUEST_GAP;
  const total = height + MARK;
  const middle = MARK + height / 2;

  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${total}`} className="block h-auto w-full" focusable="false">
      <line x1={0} x2={width} y1={middle} y2={middle} stroke={MUTED} strokeWidth={1} />
      {Array.from({ length: count }, (_, column) => {
        const guest = guests[column];
        const left = column * (group + GUEST_GAP);
        const wave: Wave = guest
          ? waveOf(guest)
          : { fit: 0.3 + 0.5 * grain(column), love: 0.3 + 0.5 * grain(column + 9), reach: 0.3 + 0.5 * grain(column + 17) };
        const sweet = guest?.label === "sweet_spot";
        return (
          <g key={guest?.ref ?? column} opacity={!guest ? 1 : sweet ? 1 : 0.42} className={guest ? undefined : styles.waiting}>
            {sweet && <circle cx={left + group / 2} cy={MARK / 2 - 1} r={3.4} fill="#fff4ec" />}
            {swells(wave, PER_GUEST, column * 7).map((bar, index) => {
              const size = bar.unscored ? THICK : Math.max(THICK, bar.level * height);
              return (
                <rect
                  key={index}
                  x={round(left + index * STEP + (STEP - THICK) / 2)}
                  y={round(middle - size / 2)}
                  width={THICK}
                  height={round(size)}
                  rx={THICK / 2}
                  fill={!guest || bar.unscored ? MUTED : TONE[bar.part]}
                />
              );
            })}
          </g>
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
