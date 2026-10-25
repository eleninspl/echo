import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { TONE, type Part } from "./parts";

const SIZE = 620;
const MIDDLE = SIZE / 2;
const BASE = 132;
const LENGTH = 146;
const RANK_RADIUS = 297;
const MARK_RADIUS = 122;
const LABEL_RADIUS = 99;
const TOP_GAP = 0.2;
const GAP_SLOTS = 1.6;
const INK = "#2a1030";
const DIM = "#7a5f77";
const PAPER = "#fffaf6";

const round = (value: number) => Math.round(value * 100) / 100;

function polar(radius: number, angle: number) {
  return {
    x: round(MIDDLE + Math.cos(angle) * radius),
    y: round(MIDDLE + Math.sin(angle) * radius),
  };
}

const SCALE = [
  { level: 0, text: "0" },
  { level: 0.5, text: "50" },
  { level: 1, text: "100" },
];

export function Dial({
  guests,
  label,
  active = null,
}: {
  guests: Guest[] | null;
  label?: string;
  active?: string | null;
}) {
  const count = guests?.length ?? 0;
  const step = count ? (Math.PI * 2 - TOP_GAP) / (count * (3 + GAP_SLOTS)) : 0;
  const thickness = Math.min(9, step * BASE * 0.7);
  const start = -Math.PI / 2 + TOP_GAP / 2;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block size-full overflow-visible"
      focusable="false"
    >
      <defs>
        <path
          id="w3-dial-label"
          d={`M ${MIDDLE} ${MIDDLE - LABEL_RADIUS} a ${LABEL_RADIUS} ${LABEL_RADIUS} 0 1 1 -0.01 0`}
        />
      </defs>

      {SCALE.map(({ level }) => (
        <circle
          key={level}
          cx={MIDDLE}
          cy={MIDDLE}
          r={BASE + level * LENGTH}
          fill="none"
          stroke={level === 0 ? "#e2c5b9" : "#efd8ce"}
          strokeWidth={1}
          strokeDasharray={level === 0.5 ? "2 5" : undefined}
        />
      ))}

      {SCALE.map(({ level, text }) => (
        <text
          key={text}
          x={MIDDLE}
          y={MIDDLE - BASE - level * LENGTH}
          dy="0.35em"
          textAnchor="middle"
          fontSize={16}
          fill={DIM}
          stroke={PAPER}
          strokeWidth={6}
          paintOrder="stroke"
          className="w3-figure"
        >
          {text}
        </text>
      ))}

      {label && (
        <text fontSize={15} fontWeight={600} fill={INK} fillOpacity={0.8}>
          <textPath
            href="#w3-dial-label"
            textLength={round(Math.PI * 2 * LABEL_RADIUS - 16)}
            lengthAdjust="spacing"
          >
            {label}
          </textPath>
        </text>
      )}

      {guests?.map((guest, column) => {
        const sweet = guest.label === "sweet_spot";
        const lit = active === guest.ref;
        const dimmed = active !== null && !lit;
        const first = column * (3 + GAP_SLOTS) + GAP_SLOTS / 2;
        const levels: [Part, number | null][] = [
          ["fit", guest.scores.fit],
          ["love", guest.scores.love_back],
          ["reach", guest.scores.reach],
        ];
        const markFrom = polar(MARK_RADIUS, start + (first + 0.1) * step);
        const markTo = polar(MARK_RADIUS, start + (first + 2.9) * step);
        const rankAt = polar(RANK_RADIUS, start + (first + 1.5) * step);
        return (
          <g
            key={guest.ref}
            className="w3-spoke"
            style={{ "--order": column } as CSSProperties}
          >
            <g
              className="transition-opacity duration-150"
              opacity={dimmed ? 0.14 : sweet || lit ? 1 : 0.55}
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
                      r={thickness / 2 - 0.5}
                      fill={PAPER}
                      stroke={DIM}
                      strokeWidth={1}
                    />
                  );
                }
                const outer = polar(BASE + Math.max(0.02, score) * LENGTH, angle);
                return (
                  <line
                    key={part}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={TONE[part]}
                    strokeWidth={thickness}
                  />
                );
              })}
              {sweet && (
                <path
                  d={`M ${markFrom.x} ${markFrom.y} A ${MARK_RADIUS} ${MARK_RADIUS} 0 0 1 ${markTo.x} ${markTo.y}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={3.5}
                />
              )}
            </g>
            <text
              x={rankAt.x}
              y={rankAt.y}
              dy="0.35em"
              textAnchor="middle"
              fontSize={20}
              fontWeight={sweet || lit ? 700 : 500}
              fill={sweet || lit ? INK : DIM}
              opacity={dimmed ? 0.35 : 1}
              className="w3-figure transition-opacity duration-150"
            >
              {column + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
