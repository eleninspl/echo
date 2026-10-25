import type { CSSProperties, ReactNode } from "react";

import { styles } from "./styles";
import { halftone, INK, RegistrationMark, smoothstep } from "./ink";

const WIDTH = 680;
const HEIGHT = 600;
const RADIUS = 165;
const SHOW = { x: 228, y: 322 };
const GUEST = { x: 398, y: 290 };

const AWAY = (() => {
  const dx = GUEST.x - SHOW.x;
  const dy = GUEST.y - SHOW.y;
  const length = Math.hypot(dx, dy);
  return { x: dx / length, y: dy / length };
})();

function ring(radius: number, strength: number) {
  return halftone({
    width: WIDTH,
    height: HEIGHT,
    step: 7,
    angle: 15,
    tone: (x, y) => {
      const dx = x - GUEST.x;
      const dy = y - GUEST.y;
      const distance = Math.hypot(dx, dy);
      const band = 1 - Math.abs(distance - radius) / 11;
      if (band <= 0) return 0;
      const facing = (dx * AWAY.x + dy * AWAY.y) / distance;
      return band * strength * smoothstep(-0.45, 0.55, facing);
    },
  });
}

const RINGS = [
  { d: ring(RADIUS + 30, 1), delay: "0s" },
  { d: ring(RADIUS + 62, 0.78), delay: "0.5s" },
  { d: ring(RADIUS + 94, 0.55), delay: "1s" },
];

function at(x: number, y: number): CSSProperties {
  return { left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` };
}

function Label({ x, y, children, className = "" }: { x: number; y: number; children: ReactNode; className?: string }) {
  return (
    <span
      className={`absolute -translate-x-1/2 -translate-y-1/2 text-center whitespace-nowrap ${className}`}
      style={at(x, y)}
    >
      {children}
    </span>
  );
}

export function Venn() {
  return (
    <figure className="relative @container mx-auto w-full max-w-[640px]">
      <div className="relative aspect-[680/600] w-full">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 size-full overflow-visible" aria-hidden focusable="false">
          {RINGS.map((item) => (
            <path
              key={item.delay}
              d={item.d}
              fill={INK.blue}
              className={styles.ripple}
              style={{ "--delay": item.delay, mixBlendMode: "multiply" } as CSSProperties}
            />
          ))}

          <g className={styles.fromLeft}>
            <g filter="url(#d04-ink)" style={{ mixBlendMode: "multiply" }}>
              <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill={INK.pink} />
            </g>
            <circle
              cx={SHOW.x - 7}
              cy={SHOW.y + 6}
              r={RADIUS + 9}
              fill="none"
              stroke={INK.blue}
              strokeWidth="1.6"
              strokeDasharray="2 7"
              strokeLinecap="round"
              style={{ mixBlendMode: "multiply" }}
            />
          </g>

          <g className={styles.fromRight}>
            <g filter="url(#d04-ink)" style={{ mixBlendMode: "multiply" }}>
              <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={INK.blue} />
            </g>
            <circle
              cx={GUEST.x + 6}
              cy={GUEST.y - 5}
              r={RADIUS + 9}
              fill="none"
              stroke={INK.pink}
              strokeWidth="1.6"
              style={{ mixBlendMode: "multiply" }}
            />
          </g>

          <g fill="none" stroke={INK.overprint} strokeWidth="3.2" strokeLinecap="round" className={styles.drawIn}>
            <path d="M150 196 C 196 76, 330 44, 410 118" markerEnd="url(#d04-arrowhead)" />
            <path d="M478 438 C 450 548, 300 576, 232 494" markerEnd="url(#d04-arrowhead)" />
          </g>
        </svg>

        <Label x={236} y={44} className={`${styles.mono} ${styles.labelSize} font-bold text-(--overprint)`}>
          fit: show → guest
        </Label>
        <Label x={356} y={576} className={`${styles.mono} ${styles.labelSize} font-bold text-(--overprint)`}>
          love back: guest → show
        </Label>
        <Label x={140} y={330} className={`${styles.mono} ${styles.labelSize} font-bold leading-tight text-(--overprint)`}>
          your
          <br />
          listeners
        </Label>
        <Label x={496} y={300} className={`${styles.mono} ${styles.labelSize} font-bold leading-tight text-(--paper)`}>
          a guest&apos;s
          <br />
          fans
        </Label>
        <Label
          x={312}
          y={306}
          className={`${styles.display} ${styles.sweetSize} leading-[0.86] tracking-[0.01em] text-(--paper) uppercase`}
        >
          sweet
          <br />
          spot
        </Label>
        <Label x={618} y={60} className={`${styles.mono} ${styles.labelSize} font-bold leading-tight text-(--blue)`}>
          reach:
          <br />
          new ears
        </Label>

        <RegistrationMark className="absolute top-0 left-0 size-7 -translate-x-1/3 -translate-y-1/3 sm:size-8" />
        <RegistrationMark className="absolute right-0 bottom-0 size-7 translate-x-1/3 translate-y-1/3 sm:size-8" />
      </div>
      <figcaption className="sr-only">
        Two overlapping audiences: your show&apos;s listeners and a guest&apos;s fans. Where they overlap is the sweet
        spot. Fit runs from your listeners to the guest, love back runs from the guest&apos;s fans to your show, and
        reach is the guest&apos;s fans who are new to you.
      </figcaption>
    </figure>
  );
}
