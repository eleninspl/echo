import type { CSSProperties } from "react";

import styles from "./classes";

const HERO_SHOW = { x: 118, y: 260, r: 80 };
const HERO_GUEST = { x: 572, y: 260, r: 168 };
const HERO_SPREAD = Math.PI / 6;
const HERO_RINGS = Array.from({ length: 13 }, (_, ring) => ({ ring, r: 120 + ring * 33, width: 1.5 + ring * 0.4 }));

function wedgeArc(cx: number, cy: number, r: number) {
  const x = cx + r * Math.cos(HERO_SPREAD);
  const dy = r * Math.sin(HERO_SPREAD);
  return `M ${x.toFixed(1)} ${(cy - dy).toFixed(1)} A ${r} ${r} 0 0 1 ${x.toFixed(1)} ${(cy + dy).toFixed(1)}`;
}

function Rings({ stroke }: { stroke: string }) {
  return (
    <g fill="none" stroke={stroke}>
      {HERO_RINGS.map(({ ring, r, width }) => (
        <path
          key={ring}
          d={wedgeArc(HERO_SHOW.x, HERO_SHOW.y, r)}
          strokeWidth={width}
          className={styles.wave}
          style={{ "--ring": ring } as CSSProperties}
        />
      ))}
    </g>
  );
}

export function EchoFigure() {
  return (
    <figure className="relative">
      <svg viewBox="0 0 740 520" className="block h-auto w-full" role="img" aria-labelledby="d02-echo-title">
        <title id="d02-echo-title">Your show sends its voice out in rings until it reaches a new audience</title>
        <defs>
          <clipPath id="d02-hero-guest">
            <circle cx={HERO_GUEST.x} cy={HERO_GUEST.y} r={HERO_GUEST.r} />
          </clipPath>
        </defs>
        <circle cx={HERO_GUEST.x} cy={HERO_GUEST.y} r={HERO_GUEST.r} fill="var(--red)" />
        <Rings stroke="var(--ink)" />
        <g clipPath="url(#d02-hero-guest)">
          <Rings stroke="var(--paper)" />
        </g>
        <circle cx={HERO_SHOW.x} cy={HERO_SHOW.y} r={HERO_SHOW.r} fill="var(--ink)" />
      </svg>
      <figcaption className="mt-6 flex flex-col gap-1.5 text-[14px] leading-tight font-bold md:absolute md:bottom-0 md:left-0 md:mt-0">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="size-3 rounded-full bg-(--ink)" />
          Your show
        </span>
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="size-3 rounded-full bg-(--red)" />
          New ears: the guest&apos;s audience
        </span>
      </figcaption>
    </figure>
  );
}

const SHOW = { x: 262, y: 250, r: 168 };
const GUEST = { x: 482, y: 250, r: 168 };

function Arrowhead({ x, y, direction, fill }: { x: number; y: number; direction: 1 | -1; fill: string }) {
  return <path d={`M ${x} ${y} L ${x - direction * 14} ${y - 7} L ${x - direction * 14} ${y + 7} Z`} fill={fill} />;
}

export function OverlapFigure() {
  const top = SHOW.y - SHOW.r;
  const bottom = SHOW.y + SHOW.r;
  return (
    <svg viewBox="78 0 588 500" className="block h-auto w-full" role="img" aria-labelledby="d02-overlap-title">
      <title id="d02-overlap-title">
        Two overlapping circles: your listeners in black and the guest&apos;s fans in red. Fit runs from your show to
        the guest, love back from the guest to your show, and reach is the red part your audience doesn&apos;t cover.
      </title>
      <defs>
        <clipPath id="d02-show-disc">
          <circle cx={SHOW.x} cy={SHOW.y} r={SHOW.r} />
        </clipPath>
      </defs>

      <circle cx={GUEST.x} cy={GUEST.y} r={GUEST.r} fill="var(--red)" />
      <circle cx={SHOW.x} cy={SHOW.y} r={SHOW.r} fill="var(--ink)" />
      <circle cx={GUEST.x} cy={GUEST.y} r={GUEST.r} fill="var(--paper)" clipPath="url(#d02-show-disc)" />

      <g fill="var(--ink)" fontWeight="700" textAnchor="middle">
        <text x={(SHOW.x + GUEST.x) / 2} y={SHOW.y - 6} fontSize="16">
          Shared
        </text>
        <text x={(SHOW.x + GUEST.x) / 2} y={SHOW.y + 14} fontSize="16">
          taste
        </text>
      </g>

      <g fill="var(--paper)">
        <text x={SHOW.x - 120} y={SHOW.y - 4} fontSize="21" fontWeight="700">
          Your
        </text>
        <text x={SHOW.x - 120} y={SHOW.y + 21} fontSize="21" fontWeight="700">
          listeners
        </text>
        <text x={GUEST.x - 12} y={SHOW.y - 4} fontSize="21" fontWeight="700">
          The guest&apos;s
        </text>
        <text x={GUEST.x - 12} y={SHOW.y + 21} fontSize="21" fontWeight="700">
          fans
        </text>
        <text x={GUEST.x - 12} y={SHOW.y + 82} fontSize="34" fontWeight="700" letterSpacing="-1">
          03
        </text>
        <text x={GUEST.x - 12} y={SHOW.y + 106} fontSize="16" fontWeight="700">
          Reach
        </text>
      </g>

      <g stroke="var(--ink)" strokeWidth="2">
        <line x1={SHOW.x} y1={top} x2={SHOW.x} y2="44" />
        <line x1={GUEST.x} y1={top} x2={GUEST.x} y2="44" />
        <line x1={SHOW.x} y1="44" x2={GUEST.x - 12} y2="44" />
      </g>
      <Arrowhead x={GUEST.x} y={44} direction={1} fill="var(--ink)" />
      <text x={SHOW.x} y="28" fontSize="16" fontWeight="700" fill="var(--ink)">
        01 Fit
      </text>

      <g stroke="var(--red)" strokeWidth="2">
        <line x1={SHOW.x} y1={bottom} x2={SHOW.x} y2="456" />
        <line x1={GUEST.x} y1={bottom} x2={GUEST.x} y2="456" />
        <line x1={GUEST.x} y1="456" x2={SHOW.x + 12} y2="456" />
      </g>
      <Arrowhead x={SHOW.x} y={456} direction={-1} fill="var(--red)" />
      <text x={GUEST.x} y="488" fontSize="16" fontWeight="700" fill="var(--red)" textAnchor="end">
        02 Love back
      </text>
    </svg>
  );
}

export type GlyphKind = "fit" | "love_back" | "reach" | "sweet_spot";

export function Glyph({ kind }: { kind: GlyphKind }) {
  return (
    <svg viewBox="0 0 48 48" className="block size-12 shrink-0" aria-hidden>
      {kind === "fit" && (
        <>
          <circle cx="12" cy="24" r="9" fill="var(--ink)" />
          <line x1="21" y1="24" x2="36" y2="24" stroke="var(--ink)" strokeWidth="2" />
          <path d="M 46 24 L 36 19 L 36 29 Z" fill="var(--ink)" />
        </>
      )}
      {kind === "love_back" && (
        <>
          <circle cx="36" cy="24" r="9" fill="var(--red)" />
          <line x1="27" y1="24" x2="12" y2="24" stroke="var(--red)" strokeWidth="2" />
          <path d="M 2 24 L 12 19 L 12 29 Z" fill="var(--red)" />
        </>
      )}
      {kind === "reach" && (
        <>
          <circle cx="31" cy="24" r="15" fill="var(--red)" />
          <circle cx="17" cy="24" r="15" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
        </>
      )}
      {kind === "sweet_spot" && (
        <>
          <circle cx="24" cy="24" r="21" fill="none" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="24" cy="24" r="14" fill="none" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="24" cy="24" r="7" fill="var(--red)" />
        </>
      )}
    </svg>
  );
}
