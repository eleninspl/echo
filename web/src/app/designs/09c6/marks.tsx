import type { CSSProperties } from "react";

import { arrowhead, curve, underline, type Point } from "./hand";

const PEN = "#13795b";

export function Note({
  lines,
  width,
  height,
  text = { x: 0, y: 0 },
  size = 24,
  tilt = -4,
  arrow,
  end = false,
  className = "",
}: {
  lines: string[];
  width: number;
  height: number;
  text?: Point;
  size?: number;
  tilt?: number;
  arrow?: { from: Point; to: Point; bend?: number; seed?: number };
  end?: boolean;
  className?: string;
}) {
  const pointer = arrow ? curve({ ...arrow, shake: 0.8 }) : null;
  return (
    <span
      aria-hidden
      className={`pointer-events-none relative block select-none ${className}`}
      style={{ width, height }}
    >
      <span
        className="w6-hand absolute block leading-[0.92] whitespace-nowrap"
        style={{
          ...(end ? { right: text.x } : { left: text.x }),
          top: text.y,
          fontSize: size,
          transform: `rotate(${tilt}deg)`,
          transformOrigin: end ? "right center" : "left center",
        }}
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
      {pointer && arrow && (
        <svg
          className="absolute top-0 left-0 overflow-visible"
          width={width}
          height={height}
          focusable="false"
        >
          <path
            d={`${pointer.path}${arrowhead(arrow.to, pointer.heading, 9)}`}
            fill="none"
            stroke={PEN}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function DoubleUnderline({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 16"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute overflow-visible ${className}`}
      style={style}
      focusable="false"
    >
      <g
        fill="none"
        stroke={PEN}
        strokeWidth={2.2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        <path d={underline(100, 2, 2.5)} vectorEffect="non-scaling-stroke" />
        <path
          d={underline(86, 9, 1.5)}
          transform="translate(9 7)"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
