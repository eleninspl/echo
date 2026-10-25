import type { CSSProperties } from "react";

import { styles } from "./styles";
import { grain, toneAt } from "./wave";

const round = (value: number) => Math.round(value * 10) / 10;

const STILL_RINGS = [250, 310, 370, 430, 490];

function ringStyle(duration: number, delay: number, peak: number, still: number): CSSProperties {
  return {
    "--ring-duration": `${duration}s`,
    "--ring-delay": `${delay}s`,
    "--ring-peak": peak,
    "--still-scale": still,
    "--still-opacity": peak * (1 - still) + 0.06,
  } as CSSProperties;
}

export function Rings({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-560 -560 1120 1120" className={className} focusable="false">
      <defs>
        <radialGradient id="v9a-halo">
          <stop offset="0.25" stopColor="#ff5c93" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#b48aff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#b48aff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={540} fill="url(#v9a-halo)" />
      {STILL_RINGS.map((radius, index) => (
        <circle
          key={radius}
          r={radius}
          fill="none"
          stroke={toneAt(index / 5)}
          strokeOpacity={0.36 - index * 0.06}
          strokeWidth={1.2}
          strokeDasharray={index % 2 ? "1 7" : undefined}
          strokeLinecap="round"
        />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <circle
          key={`ripple-${index}`}
          r={540}
          fill="none"
          stroke={toneAt(index / 4 + 0.1)}
          strokeWidth={1.6}
          className={styles.ring}
          style={ringStyle(10, -index * 2.5, 0.5, (index + 2) / 6)}
        />
      ))}
    </svg>
  );
}

export function Strip({ bars = 160 }: { bars?: number }) {
  const width = 1440;
  const height = 80;
  const step = width / bars;
  const thickness = step * 0.5;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className="block h-12 w-full sm:h-16"
      focusable="false"
    >
      {Array.from({ length: bars }, (_, index) => {
        const t = (index + 0.5) / bars;
        const phrase = Math.abs(Math.sin(t * Math.PI * 5.2 + 0.6)) * 0.7 + 0.3;
        const fade = Math.sin(Math.PI * t) ** 0.6;
        const level = Math.max(0.06, phrase * fade * (0.45 + 0.55 * grain(index + 11)));
        const size = level * (height - 4);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(height / 2 - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={toneAt(t)}
            fillOpacity={0.85}
            className={styles.bar}
            style={
              {
                "--bar-delay": `${-round(grain(index + 97) * 2.6)}s`,
                "--bar-low": round(0.35 + grain(index + 3) * 0.4),
              } as CSSProperties
            }
          />
        );
      })}
    </svg>
  );
}
