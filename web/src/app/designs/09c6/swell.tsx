import type { Guest } from "@/lib/echo";

import { levels, out100, TONE } from "./scores";

const round = (value: number) => Math.round(value * 10) / 10;

function hump(center: number, base: number, height: number, spread: number) {
  const samples = 24;
  const reachOut = spread * 2.6;
  const points: string[] = [];
  for (let step = 0; step <= samples; step++) {
    const x = center - reachOut + (step / samples) * reachOut * 2;
    const y = base - height * Math.exp(-(((x - center) / spread) ** 2));
    points.push(`${round(x)} ${round(y)}`);
  }
  return `M${points.join("L")}`;
}

export function Swell({
  guest,
  column = 112,
  numbers = true,
  className = "",
}: {
  guest: Guest;
  column?: number;
  numbers?: boolean;
  className?: string;
}) {
  const width = column * 3;
  const top = numbers ? 22 : 4;
  const height = top + 40;
  const base = height - 1;
  const spread = column * 0.19;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={`block h-auto ${className}`}
      focusable="false"
    >
      <line
        x1={0}
        y1={base + 0.5}
        x2={width}
        y2={base + 0.5}
        stroke="#ebd3c7"
      />
      {levels(guest).map(([part, score], index) => {
        const center = column * index + column / 2;
        return (
          <g key={part}>
            {score === null ? (
              <line
                x1={center - column * 0.3}
                y1={base - 1}
                x2={center + column * 0.3}
                y2={base - 1}
                stroke="#7a6474"
                strokeDasharray="2 4"
              />
            ) : (
              <path
                d={hump(
                  center,
                  base,
                  Math.max(0.04, score) * (height - top - 2),
                  spread,
                )}
                fill={TONE[part]}
                fillOpacity={0.22}
                stroke={TONE[part]}
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            )}
            {numbers && (
              <text
                x={center}
                y={13}
                textAnchor="middle"
                fontSize={15}
                fontWeight={score === null ? 400 : 600}
                fill={score === null ? "#7a6474" : "#2a1030"}
                className="w6-figures"
              >
                {score === null ? "–" : out100(score)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
