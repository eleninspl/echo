import type { Guest, Label } from "@/lib/echo";

import { styles } from "./styles";

export type Part = "fit" | "love" | "reach";

export const TONE: Record<Part, string> = {
  fit: "#ff9a52",
  love: "#ff5c93",
  reach: "#b48aff",
};
export const MUTED = "#4f3a55";
export const INK = "#fff4ec";

export const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

export const out100 = (value: number) => String(Math.round(value * 100));

const CENTERS = [1 / 6, 1 / 2, 5 / 6];
const SPREAD = 0.13;

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
  className?: string;
};

export function Voiceprint({
  fit,
  loveBack,
  reach,
  bars = 30,
  width = 120,
  height = 44,
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
        const texture = 0.7 + 0.3 * grain(index);
        const level = Math.max(0.08, Math.min(1, envelope * texture));
        const unscored = reach === null && part === "reach";
        const size = unscored ? thickness : level * (height - 2);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(middle - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={unscored ? MUTED : toneAt(position)}
          />
        );
      })}
    </svg>
  );
}

export const SCRUB = {
  slot: 5,
  bar: 3.4,
  per: 7,
  chapter: 9,
  height: 96,
  mark: 18,
  ticks: 14,
};

export function scrubGeometry(count: number) {
  const segment = SCRUB.per * SCRUB.slot;
  const width = Math.max(1, count) * segment + Math.max(0, count - 1) * SCRUB.chapter;
  const center = (index: number) => index * (segment + SCRUB.chapter) + segment / 2;
  return {
    segment,
    width,
    center,
    total: SCRUB.mark + SCRUB.height + SCRUB.ticks,
  };
}

const CHAPTER_SPREAD = 0.18;

function chapterBars(guest: Guest) {
  const { fit, love_back: love, reach } = guest.scores;
  const levels = [fit, love, reach ?? 0];
  return Array.from({ length: SCRUB.per }, (_, index) => {
    const position = index / (SCRUB.per - 1);
    const unscored = reach === null && position > 0.6;
    const envelope = levels.reduce(
      (sum, level, at) => sum + level * Math.exp(-(((position - CENTERS[at]) / CHAPTER_SPREAD) ** 2)),
      0,
    );
    return {
      level: unscored ? null : Math.min(1, envelope),
      color: toneAt(position),
    };
  });
}

export function GuestWave({ guests, selected }: { guests: Guest[]; selected: number }) {
  const { segment, width, center, total } = scrubGeometry(guests.length);
  const middle = SCRUB.mark + SCRUB.height / 2;
  const tickTop = SCRUB.mark + SCRUB.height + 4;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${total}`}
      className="block h-auto w-full overflow-visible"
      focusable="false"
    >
      <rect
        x={0}
        y={SCRUB.mark - 4}
        width={segment + 8}
        height={SCRUB.height + 8}
        rx={9}
        fill={INK}
        fillOpacity={0.08}
        className={styles.head}
        style={{
          transform: `translateX(${round(center(selected) - segment / 2 - 4)}px)`,
        }}
      />
      {guests.map((guest, column) => {
        const left = column * (segment + SCRUB.chapter);
        const sweet = guest.label === "sweet_spot";
        const active = column === selected;
        return (
          <g key={guest.ref} opacity={active ? 1 : sweet ? 0.95 : 0.6}>
            {sweet && <circle cx={left + segment / 2} cy={5} r={3.4} fill={INK} />}
            {chapterBars(guest).map((bar, at) => {
              const size = bar.level === null ? SCRUB.bar : Math.max(SCRUB.bar, bar.level * SCRUB.height);
              return (
                <rect
                  key={at}
                  x={round(left + at * SCRUB.slot + (SCRUB.slot - SCRUB.bar) / 2)}
                  y={round(middle - size / 2)}
                  width={SCRUB.bar}
                  height={round(size)}
                  rx={SCRUB.bar / 2}
                  fill={bar.level === null ? MUTED : bar.color}
                />
              );
            })}
            <rect
              x={round(left + segment / 2 - 1)}
              y={tickTop}
              width={2}
              height={active ? 10 : 5}
              rx={1}
              fill={active ? INK : MUTED}
            />
          </g>
        );
      })}
      <g className={styles.head} style={{ transform: `translateX(${round(center(selected))}px)` }}>
        <rect x={-1} y={SCRUB.mark - 8} width={2} height={SCRUB.height + 16} rx={1} fill={INK} />
        <circle cx={0} cy={SCRUB.mark + SCRUB.height + 8} r={5.5} fill={INK} />
      </g>
    </svg>
  );
}

export function IdleWave() {
  const count = 14;
  const { segment, width, total } = scrubGeometry(count);
  const middle = SCRUB.mark + SCRUB.height / 2;
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${total}`} className="block h-auto w-full" focusable="false">
      {Array.from({ length: count * SCRUB.per }, (_, index) => {
        const column = Math.floor(index / SCRUB.per);
        const x = column * (segment + SCRUB.chapter) + (index % SCRUB.per) * SCRUB.slot;
        return (
          <rect
            key={index}
            x={round(x + (SCRUB.slot - SCRUB.bar) / 2)}
            y={round(middle - SCRUB.bar / 2)}
            width={SCRUB.bar}
            height={SCRUB.bar}
            rx={SCRUB.bar / 2}
            fill={MUTED}
          />
        );
      })}
    </svg>
  );
}

export function LoadingWave() {
  const count = 14;
  const { segment, width, total } = scrubGeometry(count);
  const middle = SCRUB.mark + SCRUB.height / 2;
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${total}`} className="block h-auto w-full" focusable="false">
      {Array.from({ length: count * SCRUB.per }, (_, index) => {
        const column = Math.floor(index / SCRUB.per);
        const x = column * (segment + SCRUB.chapter) + (index % SCRUB.per) * SCRUB.slot;
        const size = (0.2 + 0.45 * grain(index)) * SCRUB.height;
        return (
          <rect
            key={index}
            x={round(x + (SCRUB.slot - SCRUB.bar) / 2)}
            y={round(middle - size / 2)}
            width={SCRUB.bar}
            height={round(size)}
            rx={SCRUB.bar / 2}
            fill={MUTED}
            className={styles.waiting}
          />
        );
      })}
    </svg>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`${styles.spin} size-4 ${className}`} focusable="false">
      <circle cx={10} cy={10} r={7.5} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2.4} />
      <path
        d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
