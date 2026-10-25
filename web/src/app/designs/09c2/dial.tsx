import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { AUBERGINE, DIM, INK, PAPER, PARTS, RULE, scoreOf } from "./inks";

const SIZE = 640;
const MIDDLE = SIZE / 2;
const LABEL = 112;
const BASE = 134;
const LENGTH = 152;
const NUMBERS = BASE + LENGTH + 18;
const GAP_SLOTS = 1.5;
const START = -Math.PI / 2;
const TOP_ARC = 86;
const HAIR = 3;
const BOTTOM_ARC = 97;

const round = (value: number) => Math.round(value * 100) / 100;

function polar(radius: number, angle: number) {
  return {
    x: round(MIDDLE + Math.cos(angle) * radius),
    y: round(MIDDLE + Math.sin(angle) * radius),
  };
}

export function Dial({
  guests,
  arc,
  waiting,
}: {
  guests: Guest[];
  arc: { top: string; bottom: string } | null;
  waiting: boolean;
}) {
  const count = guests.length;
  const slots = Math.max(count, 1) * (3 + GAP_SLOTS);
  const step = (Math.PI * 2) / slots;
  const thickness = round(Math.min(10, step * BASE * 0.72));

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block size-full overflow-visible"
      focusable="false"
    >
      <defs>
        <path
          id="w2-dial-top"
          d={`M ${MIDDLE - TOP_ARC} ${MIDDLE} A ${TOP_ARC} ${TOP_ARC} 0 0 1 ${MIDDLE + TOP_ARC} ${MIDDLE}`}
        />
        <path
          id="w2-dial-bottom"
          d={`M ${MIDDLE - BOTTOM_ARC} ${MIDDLE} A ${BOTTOM_ARC} ${BOTTOM_ARC} 0 0 0 ${MIDDLE + BOTTOM_ARC} ${MIDDLE}`}
        />
      </defs>

      {[0.5, 1].map((level) => (
        <circle
          key={level}
          cx={MIDDLE}
          cy={MIDDLE}
          r={BASE + LENGTH * level}
          fill="none"
          stroke={RULE}
          strokeWidth={1}
        />
      ))}
      <circle
        cx={MIDDLE}
        cy={MIDDLE}
        r={BASE}
        fill="none"
        stroke={RULE}
        strokeWidth={1}
      />

      {count > 0 &&
        [
          { level: 0.5, text: "50" },
          { level: 1, text: "100" },
        ].map(({ level, text }) => (
          <text
            key={text}
            x={MIDDLE}
            y={MIDDLE - BASE - LENGTH * level}
            dy="0.34em"
            textAnchor="middle"
            fontSize={12}
            fill={DIM}
            stroke={PAPER}
            strokeWidth={5}
            paintOrder="stroke"
            className="w2-sans w2-figures"
          >
            {text}
          </text>
        ))}

      <circle cx={MIDDLE} cy={MIDDLE} r={LABEL} fill={AUBERGINE} />
      <circle
        cx={MIDDLE}
        cy={MIDDLE}
        r={LABEL - 8}
        fill="none"
        stroke={PAPER}
        strokeOpacity={0.35}
        strokeWidth={0.75}
      />

      {arc &&
        [
          { href: "#w2-dial-top", text: arc.top },
          { href: "#w2-dial-bottom", text: arc.bottom },
        ].map(({ href, text }) => (
          <text
            key={href}
            fontSize={15}
            fontWeight={600}
            letterSpacing="0.05em"
            fill={PAPER}
            className="w2-sans w2-narrow"
          >
            <textPath href={href} startOffset="50%" textAnchor="middle">
              {text}
            </textPath>
          </text>
        ))}

      {waiting && (
        <circle
          cx={MIDDLE}
          cy={MIDDLE}
          r={BASE + LENGTH * 0.5}
          fill="none"
          stroke={AUBERGINE}
          strokeWidth={1.5}
          strokeDasharray="2 10"
          className="w2-wait"
        />
      )}

      {guests.map((guest, column) => {
        const sweet = guest.label === "sweet_spot";
        const first = column * (3 + GAP_SLOTS) + GAP_SLOTS / 2;
        const middle = START + (first + 1.5) * step;
        const number = polar(NUMBERS, middle);
        return (
          <g
            key={guest.ref}
            className="w2-spoke"
            style={{ "--order": column } as CSSProperties}
          >
            {PARTS.map((part, at) => {
              const angle = START + (first + at + 0.5) * step;
              const score = scoreOf(guest, part);
              const inner = polar(BASE + 1, angle);
              if (score === null) {
                const ring = polar(BASE + thickness, angle);
                return (
                  <circle
                    key={part}
                    cx={ring.x}
                    cy={ring.y}
                    r={round(thickness / 2 - 0.75)}
                    fill={PAPER}
                    stroke={INK[part]}
                    strokeWidth={sweet ? 1.75 : 1.25}
                  />
                );
              }
              const outer = polar(BASE + Math.max(0.03, score) * LENGTH, angle);
              return (
                <line
                  key={part}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={INK[part]}
                  strokeWidth={sweet ? thickness : HAIR}
                />
              );
            })}
            <text
              x={number.x}
              y={number.y}
              dy="0.35em"
              textAnchor="middle"
              fontSize={13}
              fontWeight={sweet ? 700 : 400}
              fill={sweet ? AUBERGINE : DIM}
              className="w2-sans w2-figures"
            >
              {column + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
