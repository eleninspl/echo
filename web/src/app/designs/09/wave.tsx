import type { Guest } from "@/lib/echo";

import { styles } from "./styles";

export type Part = "fit" | "love" | "reach";

export const TONE: Record<Part, string> = { fit: "#ff9a52", love: "#ff5c93", reach: "#b48aff" };

const MUTED = "#4f3a55";
const CENTERS = [1 / 6, 1 / 2, 5 / 6];
const SPREAD = 0.13;

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
  if (position <= CENTERS[0]) return TONE.fit;
  if (position <= CENTERS[1]) return mix(TONE.fit, TONE.love, (position - CENTERS[0]) * 3);
  if (position <= CENTERS[2]) return mix(TONE.love, TONE.reach, (position - CENTERS[1]) * 3);
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
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} className={className} focusable="false">
      {Array.from({ length: bars }, (_, index) => {
        const position = (index + 0.5) / bars;
        const part = partAt(position);
        const envelope = levels.reduce(
          (sum, level, at) => sum + level * Math.exp(-(((position - CENTERS[at]) / SPREAD) ** 2)),
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

const BAR = 6;
const BAR_GAP = 2.5;
const GUEST_GAP = 11;
const MARK = 14;

export function ShowWave({ guests, height = 132, slots = 14 }: { guests: Guest[]; height?: number; slots?: number }) {
  const count = guests.length || slots;
  const group = BAR * 3 + BAR_GAP * 2;
  const width = count * (group + GUEST_GAP) - GUEST_GAP;
  const total = height + MARK;
  const middle = MARK + height / 2;

  if (!guests.length) {
    return (
      <svg aria-hidden viewBox={`0 0 ${width} ${total}`} className="block h-auto w-full" focusable="false">
        {Array.from({ length: count * 3 }, (_, index) => {
          const size = (0.25 + 0.5 * grain(index)) * height;
          const column = Math.floor(index / 3);
          const x = column * (group + GUEST_GAP) + (index % 3) * (BAR + BAR_GAP);
          return (
            <rect
              key={index}
              x={round(x)}
              y={round(middle - size / 2)}
              width={BAR}
              height={round(size)}
              rx={BAR / 2}
              fill={MUTED}
              className={styles.waiting}
            />
          );
        })}
      </svg>
    );
  }

  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${total}`} className="block h-auto w-full" focusable="false">
      <line x1={0} x2={width} y1={middle} y2={middle} stroke={MUTED} strokeWidth={1} />
      {guests.map((guest, column) => {
        const left = column * (group + GUEST_GAP);
        const sweet = guest.label === "sweet_spot";
        const parts: [Part, number | null][] = [
          ["fit", guest.scores.fit],
          ["love", guest.scores.love_back],
          ["reach", guest.scores.reach],
        ];
        return (
          <g key={guest.ref} opacity={sweet ? 1 : 0.5}>
            {sweet && <circle cx={left + group / 2} cy={MARK / 2 - 1} r={3.2} fill="#fff4ec" />}
            {parts.map(([part, score], at) => {
              const size = score === null ? BAR : Math.max(BAR, score * height);
              return (
                <rect
                  key={part}
                  x={round(left + at * (BAR + BAR_GAP))}
                  y={round(middle - size / 2)}
                  width={BAR}
                  height={round(size)}
                  rx={BAR / 2}
                  fill={score === null ? MUTED : TONE[part]}
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
