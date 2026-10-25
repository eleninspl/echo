import type { CSSProperties } from "react";

import { styles } from "./styles";
import { grain, INK, swell, TONE, toneAt } from "./wave";

export type Half = "top" | "bottom";
export type Surface = "field" | "dark";

export const ECHO_RINGS = { size: "clamp(360px, 52vw, 800px)", x: "84%" };

const RADIUS = 800;
const RINGS = [
  { radius: 78, weight: 28 },
  { radius: 156, weight: 18 },
  { radius: 244, weight: 12 },
  { radius: 340, weight: 8 },
  { radius: 448, weight: 5.5 },
  { radius: 566, weight: 4 },
  { radius: 694, weight: 3 },
];

const FIELD_OPACITY = [0.78, 0.64, 0.5, 0.36, 0.25, 0.17, 0.12];

const round = (value: number) => Math.round(value * 1000) / 1000;

export function Rings({
  half,
  surface,
  x = "78%",
  size,
}: {
  half: Half;
  surface: Surface;
  x?: string;
  size?: string;
}) {
  const onField = surface === "field";
  return (
    <svg
      aria-hidden
      viewBox={`${-RADIUS} ${-RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
      className={`${styles.rings} ${half === "top" ? styles.ringsTop : styles.ringsBottom}`}
      style={{ "--rings-x": x, "--rings-size": size } as CSSProperties}
      focusable="false"
    >
      {RINGS.map((ring, index) => (
        <circle
          key={ring.radius}
          r={ring.radius}
          fill="none"
          stroke={onField ? INK : toneAt(index / (RINGS.length - 1))}
          strokeWidth={ring.weight}
          strokeOpacity={onField ? FIELD_OPACITY[index] : 1 - index * 0.1}
        />
      ))}
      {[0, 1].map((index) => (
        <circle
          key={`pulse-${index}`}
          r={RADIUS - 12}
          fill="none"
          stroke={onField ? INK : TONE.love}
          strokeWidth={4}
          className={styles.ring}
          style={{ "--ring-delay": `${-index * 4.5}s`, "--ring-peak": onField ? 0.45 : 0.85 } as CSSProperties}
        />
      ))}
      <circle r={34} fill={onField ? INK : TONE.fit} />
    </svg>
  );
}

function BarEdge({
  levels,
  half,
  surface,
  height,
  breathe = false,
}: {
  levels: number[];
  half: Half;
  surface: Surface;
  height: string;
  breathe?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`${styles.barEdge} ${styles.thin} ${half === "top" ? styles.edgeTop : styles.edgeBottom}`}
      style={{ "--edge-height": height } as CSSProperties}
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className={`${styles.slot} ${breathe ? styles.breathe : ""}`}
          style={
            breathe
              ? ({
                  "--bar-delay": `${-round(grain(index + 97) * 2.8)}s`,
                  "--bar-low": round(0.4 + grain(index + 3) * 0.4),
                } as CSSProperties)
              : undefined
          }
        >
          <span
            style={{
              height: `${round(level * 100)}%`,
              background: surface === "dark" ? toneAt((index + 0.5) / levels.length) : INK,
            }}
          />
        </span>
      ))}
    </div>
  );
}

const STRIP = Array.from({ length: 120 }, (_, index) => {
  const t = (index + 0.5) / 120;
  const phrase = Math.abs(Math.sin(t * Math.PI * 5.2 + 0.6)) * 0.7 + 0.3;
  const fade = Math.sin(Math.PI * t) ** 0.5;
  return Math.max(0.05, phrase * fade * (0.45 + 0.55 * grain(index + 11)));
});

export function Strip({ half, surface }: { half: Half; surface: Surface }) {
  return <BarEdge levels={STRIP} half={half} surface={surface} height="clamp(120px, 14vw, 200px)" breathe />;
}

const SWELL_BARS = 96;
const SWELLS = Array.from({ length: SWELL_BARS }, (_, index) =>
  swell((index + 0.5) / SWELL_BARS, [0.96, 0.96, 0.96], index),
);
const SWELL_HEIGHT = "clamp(200px, 30vw, 420px)";

export function Swells({ half, surface }: { half: Half; surface: Surface }) {
  return (
    <>
      <BarEdge levels={SWELLS} half={half} surface={surface} height={SWELL_HEIGHT} />
      {half === "top" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-0"
          style={{ bottom: `calc(${SWELL_HEIGHT} / 2 + 14px)` }}
        >
          {(
            [
              ["Fit", TONE.fit, "16.667%"],
              ["Love back", TONE.love, "50%"],
              ["Reach", TONE.reach, "83.333%"],
            ] as const
          ).map(([name, color, left]) => (
            <span
              key={name}
              className={`${styles.poster} absolute bottom-0 -translate-x-1/2 text-[clamp(1.1rem,2.4vw,2.2rem)] leading-none whitespace-nowrap uppercase`}
              style={{ left, color }}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
