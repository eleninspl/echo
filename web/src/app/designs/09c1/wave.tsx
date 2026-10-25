import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { styles } from "./styles";

export type Part = "fit" | "love" | "reach";

export const PARTS: Part[] = ["fit", "love", "reach"];

export const HUE: Record<Part, string> = {
  fit: "#b9440b",
  love: "#c41e5c",
  reach: "#6a3bd6",
};

export const PART_NAME: Record<Part, string> = {
  fit: "Fit",
  love: "Love back",
  reach: "Reach",
};

export const INK = "#2a1030";
export const DIM = "#735a71";
const RULE = "#ebd0c4";
const RULE_STRONG = "#d4b0a2";

export type Levels = Record<Part, number | null>;

export function levelsOf(guest: Guest): Levels {
  return {
    fit: guest.scores.fit,
    love: guest.scores.love_back,
    reach: guest.scores.reach,
  };
}

export const out100 = (value: number) => String(Math.round(value * 100));

const round = (value: number) => Math.round(value * 100) / 100;

const CENTERS: Record<Part, number> = { fit: 1 / 6, love: 1 / 2, reach: 5 / 6 };
const SPREAD = 0.115;

function partAt(position: number): Part {
  if (position < 1 / 3) return "fit";
  if (position < 2 / 3) return "love";
  return "reach";
}

export function Voiceprint({
  levels,
  bars = 30,
  width = 120,
  height = 44,
  muted = false,
  className = "",
}: {
  levels: Levels;
  bars?: number;
  width?: number;
  height?: number;
  muted?: boolean;
  className?: string;
}) {
  const step = width / bars;
  const thickness = Math.max(1, step * 0.5);
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
        const unscored = levels[part] === null;
        const envelope = PARTS.reduce(
          (sum, each) =>
            sum +
            (levels[each] ?? 0) *
              Math.exp(-(((position - CENTERS[each]) / SPREAD) ** 2)),
          0,
        );
        const size = unscored
          ? thickness
          : Math.max(thickness, Math.min(1, envelope) * height);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(middle - size / 2)}
            width={round(thickness)}
            height={round(size)}
            fill={muted || unscored ? RULE_STRONG : HUE[part]}
          />
        );
      })}
    </svg>
  );
}

const DIAL = 640;
const MIDDLE = DIAL / 2;
const BASE = 140;
const LENGTH = 142;
const OPENING = (26 * Math.PI) / 180;
const FROM = -Math.PI / 2 + OPENING / 2;
const SWEEP = Math.PI * 2 - OPENING;
const BETWEEN = 1.5;
const LABEL_RADIUS = 108;
const WAITING_COUNT = 14;

function polar(radius: number, angle: number) {
  return {
    x: round(MIDDLE + Math.cos(angle) * radius),
    y: round(MIDDLE + Math.sin(angle) * radius),
  };
}

function arc(radius: number, from: number, to: number) {
  const start = polar(radius, from);
  const end = polar(radius, to);
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

function layout(count: number) {
  const slots = count * 3 + (count - 1) * BETWEEN;
  const step = SWEEP / slots;
  return {
    step,
    angle: (guest: number, bar: number) =>
      FROM + (guest * (3 + BETWEEN) + bar + 0.5) * step,
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
  const count = guests?.length ?? 0;
  const { step, angle } = layout(count || WAITING_COUNT);
  const thickness = Math.min(11, step * BASE * 0.72);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${DIAL} ${DIAL}`}
      className={`block size-full overflow-visible ${className}`}
      focusable="false"
    >
      <defs>
        <path
          id="w1-dial-label"
          d={`M ${MIDDLE} ${MIDDLE - LABEL_RADIUS} a ${LABEL_RADIUS} ${LABEL_RADIUS} 0 1 1 -0.01 0`}
        />
      </defs>

      {[0, 0.5, 1].map((level) => (
        <g key={level}>
          <path
            d={arc(BASE + level * LENGTH, FROM, FROM + SWEEP)}
            fill="none"
            stroke={level === 0 ? RULE_STRONG : RULE}
            strokeWidth={level === 0 ? 1.5 : 1}
            strokeDasharray={level === 0.5 ? "2 5" : undefined}
          />
          <text
            x={MIDDLE}
            y={MIDDLE - BASE - level * LENGTH}
            dy="0.35em"
            textAnchor="middle"
            fontWeight={400}
            fill={DIM}
            className={`${styles.num} w1-dial-axis`}
          >
            {Math.round(level * 100)}
          </text>
        </g>
      ))}

      {label && (
        <text
          className={`${styles.narrow} w1-dial-label`}
          fontWeight={600}
          fill={INK}
        >
          <textPath
            href="#w1-dial-label"
            textLength={round(Math.PI * 2 * LABEL_RADIUS - 18)}
            lengthAdjust="spacing"
          >
            {label}
          </textPath>
        </text>
      )}

      {count === 0 &&
        pending &&
        Array.from({ length: WAITING_COUNT }, (_, column) => (
          <g key={column} className={styles.waiting}>
            {[0, 1, 2].map((bar) => {
              const inner = polar(BASE + 4, angle(column, bar));
              const outer = polar(BASE + 26, angle(column, bar));
              return (
                <line
                  key={bar}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={RULE_STRONG}
                  strokeWidth={thickness}
                />
              );
            })}
          </g>
        ))}

      {guests?.map((guest, column) => {
        const sweet = guest.label === "sweet_spot";
        const levels = levelsOf(guest);
        return (
          <g
            key={guest.ref}
            className={styles.grow}
            style={{ "--order": column } as CSSProperties}
          >
            {PARTS.map((part, bar) => {
              const at = angle(column, bar);
              const score = levels[part];
              if (score === null) {
                const dot = polar(BASE + 7, at);
                return (
                  <circle
                    key={part}
                    cx={dot.x}
                    cy={dot.y}
                    r={thickness / 2.4}
                    fill={RULE_STRONG}
                  />
                );
              }
              const inner = polar(BASE + 2, at);
              const outer = polar(BASE + Math.max(0.03, score) * LENGTH, at);
              return (
                <line
                  key={part}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={HUE[part]}
                  strokeOpacity={sweet ? 1 : 0.38}
                  strokeWidth={thickness}
                />
              );
            })}
            {sweet && (
              <path
                d={arc(
                  BASE - 11,
                  angle(column, 0) - step * 0.5,
                  angle(column, 2) + step * 0.5,
                )}
                fill="none"
                stroke={INK}
                strokeWidth={5}
              />
            )}
          </g>
        );
      })}

      {count > 0 && <RankMark at={angle(0, 1)} />}
    </svg>
  );
}

function RankMark({ at }: { at: number }) {
  const spot = polar(BASE + LENGTH + 16, at);
  return (
    <text
      x={spot.x + 4}
      y={spot.y}
      textAnchor="start"
      fontWeight={600}
      fill={INK}
      className={`${styles.num} w1-dial-rank`}
    >
      No. 1
    </text>
  );
}
