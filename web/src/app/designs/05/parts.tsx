import Image from "next/image";
import type { ReactNode } from "react";

import type { Label, Show } from "@/lib/echo";
import { LABELS, score } from "@/lib/format";

import { styles } from "./styles";
import { INK, LAVENDER, MINT, ORANGE, YELLOW } from "./palette";

const COVER_TINTS = [LAVENDER, ORANGE, YELLOW, MINT];
const COVER_PATTERNS = [
  styles.patDots,
  styles.patStripes,
  styles.patGrid,
  styles.patRings,
];

function hashOf(text: string) {
  let hash = 7;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function initialsOf(title: string) {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word && !/^(the|a|an)$/i.test(word));
  const letters = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase());
  return letters.join("") || title.trim().charAt(0).toUpperCase();
}

export function Cover({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 border-3 border-(--nb-ink) bg-white object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const hash = hashOf(show.title);
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center overflow-hidden border-3 border-(--nb-ink)"
      style={{
        width: size,
        height: size,
        background: COVER_TINTS[hash % COVER_TINTS.length],
      }}
    >
      <span
        className={`absolute inset-0 opacity-80 ${COVER_PATTERNS[(hash >>> 3) % COVER_PATTERNS.length]}`}
      />
      <span
        className={`${styles.display} relative grid place-items-center border-2 border-(--nb-ink) bg-white leading-none font-extrabold tracking-[-0.04em] shadow-[2px_2px_0_0_var(--nb-ink)]`}
        style={{ width: size * 0.5, height: size * 0.5, fontSize: size * 0.22 }}
      >
        {initialsOf(show.title)}
      </span>
    </span>
  );
}

export function Sticker({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`${styles.mono} inline-flex items-center gap-1.5 border-2 border-(--nb-ink) px-2 py-0.5 text-[0.72rem] leading-5 font-bold tracking-[0.06em] uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function Star({
  className = "size-3.5",
  fill = INK,
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <polygon points={burstPoints(12, 12, 12, 5, 8)} fill={fill} />
    </svg>
  );
}

export function LabelSticker({ label }: { label: Label }) {
  const sweet = label === "sweet_spot";
  return (
    <Sticker
      className={`shrink-0 ${sweet ? "-rotate-2 bg-(--nb-yellow)" : "bg-white"}`}
    >
      {sweet && <Star className="size-3" />}
      {LABELS[label].name}
    </Sticker>
  );
}

export function ScoreBar({
  name,
  value,
  color,
}: {
  name: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[4.6rem_minmax(0,1fr)_2rem] items-center gap-2">
      <span
        className={`${styles.mono} text-[0.68rem] font-bold tracking-[0.04em] uppercase`}
      >
        {name}
      </span>
      <span className="relative h-4 overflow-hidden border-2 border-(--nb-ink) bg-white">
        {value === null ? (
          <span className={`absolute inset-0 opacity-40 ${styles.hatch}`} />
        ) : (
          <span
            className="absolute inset-y-0 left-0 border-r-2 border-(--nb-ink)"
            style={{
              width: `${Math.max(0, Math.min(1, value)) * 100}%`,
              background: color,
            }}
          />
        )}
      </span>
      <span className={`${styles.mono} text-right text-sm font-bold`}>
        {value === null ? (
          <>
            <span aria-hidden>–</span>
            <span className="sr-only">not scored</span>
          </>
        ) : (
          score(value)
        )}
      </span>
    </div>
  );
}

export function burstPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  spikes: number,
) {
  return Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / spikes - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

export function StampMark({
  x,
  y,
  radius,
  lines,
  fill = YELLOW,
  sizes,
}: {
  x: number;
  y: number;
  radius: number;
  lines: string[];
  fill?: string;
  sizes?: number[];
}) {
  const fontSizes = sizes ?? lines.map(() => radius * 0.36);
  const gap = radius * 0.06;
  const total =
    fontSizes.reduce((sum, size) => sum + size, 0) + gap * (lines.length - 1);
  const baselines = fontSizes.map(
    (size, index) =>
      y -
      total / 2 +
      fontSizes.slice(0, index).reduce((sum, above) => sum + above + gap, 0) +
      size * 0.8,
  );
  return (
    <g>
      <polygon
        points={burstPoints(
          x + radius * 0.08,
          y + radius * 0.08,
          radius,
          radius * 0.84,
          18,
        )}
        fill={INK}
      />
      <polygon
        points={burstPoints(x, y, radius, radius * 0.84, 18)}
        fill={fill}
        stroke={INK}
        strokeWidth={radius * 0.055}
        strokeLinejoin="round"
      />
      <circle
        cx={x}
        cy={y}
        r={radius * 0.66}
        fill="none"
        stroke={INK}
        strokeWidth={radius * 0.035}
        strokeDasharray={`${radius * 0.07} ${radius * 0.06}`}
      />
      <g
        style={{ fontFamily: "var(--font-d05-display)" }}
        fill={INK}
        fontWeight={800}
        textAnchor="middle"
      >
        {lines.map((line, index) => (
          <text
            key={line + index}
            x={x}
            y={baselines[index]}
            fontSize={fontSizes[index]}
            letterSpacing={fontSizes[index] > radius * 0.5 ? -1 : 0.5}
          >
            {line}
          </text>
        ))}
      </g>
    </g>
  );
}

export function Stamp({
  lines,
  className = "",
  fill,
  sizes,
}: {
  lines: string[];
  className?: string;
  fill?: string;
  sizes?: number[];
}) {
  return (
    <svg aria-hidden viewBox="0 0 132 132" className={className}>
      <StampMark
        x={62}
        y={62}
        radius={58}
        lines={lines}
        fill={fill}
        sizes={sizes}
      />
    </svg>
  );
}
