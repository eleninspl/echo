import type { CSSProperties } from "react";

import type { Scores } from "@/lib/echo";

import { echoArc, hairArc, MARK } from "./geometry";
import { INK, RULE_STRONG, SCORE, type Part } from "./palette";

export function Pulse({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={MARK.viewBox}
      className={`w4-pulse ${className}`}
      focusable="false"
    >
      <circle
        cx={MARK.cx}
        cy={MARK.cy}
        r={MARK.ring.radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={MARK.ring.width}
      />
      {MARK.arcs.map((arc, index) => (
        <path
          key={arc.radius}
          d={echoArc({ cx: MARK.cx, cy: MARK.cy, ...arc })}
          fill="currentColor"
          style={{ "--w4-step": index } as CSSProperties}
        />
      ))}
    </svg>
  );
}

const GLYPH = 100;
const MIDDLE = GLYPH / 2;
const START = 90;
const SWEEP = 270;
const ARC_WIDTH = 7;
const LANES: { part: Part; radius: number }[] = [
  { part: "fit", radius: 22 },
  { part: "love", radius: 31.5 },
  { part: "reach", radius: 41 },
];

export function GuestMark({
  scores,
  className = "",
}: {
  scores: Pick<Scores, "fit" | "love_back" | "reach">;
  className?: string;
}) {
  const values: Record<Part, number | null> = {
    fit: scores.fit,
    love: scores.love_back,
    reach: scores.reach,
  };
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${GLYPH} ${GLYPH}`}
      className={className}
      focusable="false"
    >
      {LANES.map(({ part, radius }) => {
        const value = values[part];
        return (
          <g key={part}>
            <path
              d={hairArc(MIDDLE, MIDDLE, radius + ARC_WIDTH / 2 - 0.5, START, START - SWEEP)}
              fill="none"
              stroke={RULE_STRONG}
              strokeWidth={value === null ? 1.4 : 0.9}
              strokeDasharray={value === null ? "1.4 3" : undefined}
            />
            {value !== null && (
              <path
                d={echoArc({
                  cx: MIDDLE,
                  cy: MIDDLE,
                  from: START,
                  to: START - Math.max(0.02, value) * SWEEP,
                  radius,
                  width: ARC_WIDTH,
                  tip: 0.42,
                })}
                fill={SCORE[part]}
              />
            )}
          </g>
        );
      })}
      <circle
        cx={MIDDLE}
        cy={MIDDLE}
        r={9.5}
        fill="none"
        stroke={INK}
        strokeWidth={5.6}
      />
    </svg>
  );
}
