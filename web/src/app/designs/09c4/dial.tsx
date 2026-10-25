import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { echoArc, polar, round } from "./geometry";
import { INK, INK_DIM, RULE, SCORE, type Part } from "./palette";

const BOX = 640;
const C = BOX / 2;
const RING = 36;
const RING_WIDTH = 17.5;
const LABEL_RADIUS = 61;
const BASE = 86;
const LENGTH = 148;
const SWEET_RADIUS = BASE + LENGTH + 13;
const RANK_RADIUS = BASE + LENGTH + 40;
const GROUP_GAP = 1.5;
const TOP_GAP = 3.4;

function slots(count: number) {
  return count * (3 + GROUP_GAP) + TOP_GAP;
}

export function Dial({
  guests,
  label,
  cover,
}: {
  guests: Guest[] | null;
  label?: string;
  cover?: string | null;
}) {
  const count = guests?.length ?? 0;
  const step = count ? 360 / slots(count) : 0;
  const thickness = count ? Math.min(11, ((step * Math.PI) / 180) * BASE * 0.92) : 0;
  const labelPath = `M ${C} ${C - LABEL_RADIUS} a ${LABEL_RADIUS} ${LABEL_RADIUS} 0 1 1 -0.01 0`;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="block size-full overflow-visible"
      focusable="false"
    >
      <defs>
        <path id="w4-dial-label" d={labelPath} />
        <clipPath id="w4-dial-cover">
          <circle cx={C} cy={C} r={RING - RING_WIDTH / 2} />
        </clipPath>
      </defs>

      {[0.5, 1].map((level) => (
        <circle
          key={level}
          cx={C}
          cy={C}
          r={BASE + LENGTH * level}
          fill="none"
          stroke={RULE}
          strokeWidth={1}
        />
      ))}
      <circle cx={C} cy={C} r={BASE} fill="none" stroke={RULE} strokeWidth={1} />

      {[
        [0, "0"],
        [0.5, "50"],
        [1, "100"],
      ].map(([level, text]) => (
        <text
          key={text}
          x={C}
          y={round(C - BASE - LENGTH * Number(level) - 6)}
          textAnchor="middle"
          fontSize={13}
          fill={INK_DIM}
          className="w4-figures"
        >
          {text}
        </text>
      ))}

      {cover ? (
        <image
          href={cover}
          x={C - RING}
          y={C - RING}
          width={RING * 2}
          height={RING * 2}
          clipPath="url(#w4-dial-cover)"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      <circle
        cx={C}
        cy={C}
        r={RING}
        fill="none"
        stroke={INK}
        strokeWidth={RING_WIDTH}
      />

      {label && (
        <text fontSize={12.5} fontWeight={600} fill={INK} letterSpacing={1.6}>
          <textPath
            href="#w4-dial-label"
            textLength={round(Math.PI * 2 * LABEL_RADIUS - 18)}
            lengthAdjust="spacing"
          >
            {label}
          </textPath>
        </text>
      )}

      {guests?.map((guest, column) => {
        const first = TOP_GAP / 2 + column * (3 + GROUP_GAP) + GROUP_GAP / 2;
        const angleAt = (slot: number) => -90 + slot * step;
        const sweet = guest.label === "sweet_spot";
        const levels: [Part, number | null][] = [
          ["fit", guest.scores.fit],
          ["love", guest.scores.love_back],
          ["reach", guest.scores.reach],
        ];
        const middle = angleAt(first + 1.5);
        const rank = polar(C, C, RANK_RADIUS, middle);
        return (
          <g
            key={guest.ref}
            className="w4-grow"
            style={{ "--w4-order": column } as CSSProperties}
          >
            {levels.map(([part, score], at) => {
              const angle = angleAt(first + at + 0.5);
              const inner = polar(C, C, BASE + 1, angle);
              if (score === null) {
                const dot = polar(C, C, BASE + 6, angle);
                return (
                  <circle
                    key={part}
                    cx={dot.x}
                    cy={dot.y}
                    r={2}
                    fill="none"
                    stroke={INK_DIM}
                    strokeWidth={1}
                  />
                );
              }
              const outer = polar(C, C, BASE + Math.max(0.03, score) * LENGTH, angle);
              return (
                <line
                  key={part}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={SCORE[part]}
                  strokeWidth={round(thickness)}
                />
              );
            })}
            {sweet && (
              <path
                d={echoArc({
                  cx: C,
                  cy: C,
                  from: angleAt(first - 0.1),
                  to: angleAt(first + 3.1),
                  radius: SWEET_RADIUS,
                  width: 6,
                  tip: 0.15,
                })}
                fill={INK}
              />
            )}
            <text
              x={rank.x}
              y={rank.y}
              dy="0.35em"
              textAnchor="middle"
              fontSize={15}
              fontWeight={sweet ? 600 : 400}
              fill={sweet ? INK : INK_DIM}
              className="w4-narrow w4-figures"
            >
              {column + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
