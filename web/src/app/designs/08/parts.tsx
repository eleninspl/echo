import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import type { Guest, Label, Scores, Show } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { styles } from "./styles";

export type ScoreKey = "fit" | "love_back" | "reach";

export const SCORES: { key: ScoreKey; name: string; color: string }[] = [
  { key: "fit", name: "Fit", color: "var(--fit)" },
  { key: "love_back", name: "Love back", color: "var(--love)" },
  { key: "reach", name: "Reach", color: "var(--reach)" },
];

export function percent(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100);
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function sweetCount(guests: Guest[]): number {
  return guests.filter((guest) => guest.label === "sweet_spot").length;
}

export function rankedBy(guests: Guest[], key: ScoreKey | "echo"): Guest[] {
  return [...guests]
    .filter((guest) => guest.scores[key] !== null)
    .sort((a, b) => (b.scores[key] ?? 0) - (a.scores[key] ?? 0));
}

const RING_RADIUS = 17;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const SEGMENT = RING_LENGTH / 3;
const SEGMENT_GAP = 3.4;

export function ScoreRing({
  scores,
  name,
  size = 36,
  muted = false,
  className = "",
}: {
  scores: Scores;
  name?: string;
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <circle cx="20" cy="20" r="19.5" fill="#ffffff" />
      {SCORES.map((score, index) => {
        const value = scores[score.key];
        const usable = SEGMENT - SEGMENT_GAP;
        const filled = value === null ? 0 : Math.max(usable * value, 0.6);
        const start = index * SEGMENT + SEGMENT_GAP / 2;
        return (
          <g key={score.key} transform="rotate(-90 20 20)">
            <circle
              cx="20"
              cy="20"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--bg-sunk)"
              strokeWidth="3.2"
              strokeDasharray={`${usable} ${RING_LENGTH - usable}`}
              strokeDashoffset={-start}
            />
            {filled > 0 && (
              <circle
                cx="20"
                cy="20"
                r={RING_RADIUS}
                fill="none"
                stroke={muted ? "#b9b9c6" : score.color}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray={`${filled} ${RING_LENGTH - filled}`}
                strokeDashoffset={-start}
              />
            )}
          </g>
        );
      })}
      {name && size >= 26 && (
        <text
          x="20"
          y="20.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11.5"
          fontWeight="600"
          letterSpacing="-0.02em"
          fill={muted ? "#8a8a96" : "var(--ink)"}
        >
          {initials(name)}
        </text>
      )}
    </svg>
  );
}

export function ScoreBar({
  value,
  color,
  order = 0,
  height = 6,
}: {
  value: number | null;
  color: string;
  order?: number;
  height?: number;
}) {
  return (
    <span
      className="relative block w-full overflow-hidden rounded-full bg-(--bg-sunk)"
      style={{ height }}
      title={value === null ? "Not enough data to score" : undefined}
    >
      {value === null ? (
        <span className="absolute inset-0 rounded-full border border-dashed border-(--line-strong)" />
      ) : (
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${styles.bar}`}
          style={{ width: `${Math.max(value * 100, 3)}%`, background: color, "--i": order } as CSSProperties}
        />
      )}
    </span>
  );
}

export function ScoreCell({ value, color, order }: { value: number | null; color: string; order?: number }) {
  const shown = percent(value);
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className={`${styles.mono} text-[12px] leading-none font-medium text-(--ink)`}>
        {shown === null ? <span className="text-(--ink-3)">n/a</span> : shown}
      </span>
      <ScoreBar value={value} color={color} order={order} height={5} />
    </span>
  );
}

export function LabelPill({ label, small = false }: { label: Label; small?: boolean }) {
  const size = small ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-[12px]";
  if (label === "sweet_spot") {
    return (
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium ${size} ${styles.sweetPill}`}>
        <span aria-hidden className={`size-1.5 rounded-full ${styles.sweetFill}`} />
        {LABELS[label].name}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-(--line) bg-(--bg-soft) font-medium text-(--ink-3) ${size}`}
    >
      {LABELS[label].name}
    </span>
  );
}

const COVERS = [
  "linear-gradient(140deg, #0b8ae6 0%, #5b3df5 70%)",
  "linear-gradient(140deg, #5b3df5 0%, #d2369c 90%)",
  "linear-gradient(140deg, #23233a 0%, #5b3df5 100%)",
  "linear-gradient(140deg, #0c0c14 0%, #3a3a52 100%)",
];

function coverFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVERS[hash % COVERS.length];
}

export function ShowCover({ show, size, rounded = "rounded-xl" }: { show: Show; size: number; rounded?: string }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={`shrink-0 border border-(--line) bg-(--bg-soft) object-cover ${rounded}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center overflow-hidden text-white ${rounded}`}
      style={{ width: size, height: size, background: coverFor(show.id) }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none" stroke="#ffffff">
        {[26, 46, 66, 86, 106].map((radius, index) => (
          <circle key={radius} cx="0" cy="100" r={radius} strokeWidth="1.6" strokeOpacity={0.34 - index * 0.05} />
        ))}
      </svg>
      <span className="relative leading-none font-semibold tracking-[-0.04em]" style={{ fontSize: size * 0.44 }}>
        {show.title.trim().charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

export function Eyebrow({ children, color = "var(--accent)" }: { children: ReactNode; color?: string }) {
  return (
    <span
      className={`${styles.mono} inline-flex items-center gap-2 text-[11.5px] font-medium tracking-[0.08em] text-(--ink-3) uppercase`}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`size-4 ${styles.spinner} ${className}`} fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`size-4 ${className}`} fill="none">
      <path
        d="M3 8h9.5M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
