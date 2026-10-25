import type { CSSProperties, ReactNode } from "react";

import type { Label } from "@/lib/echo";

// The panel parts shared by every zone: hues, lamps, level bars, gauges and zone heads.

export const SCORE_HUE = { fit: "var(--fit)", love_back: "var(--love)", reach: "var(--reach)" } as const;

export const LABEL_HUE: Record<Label, string> = {
  sweet_spot: "var(--sweet)",
  safe: "var(--safe)",
  far: "var(--far)",
  long_shot: "var(--long-shot)",
  balanced: "var(--balanced)",
};

const CATEGORY_HUE: Record<string, string> = {
  music: "var(--music)",
  film: "var(--film)",
  tv: "var(--tv)",
  books: "var(--books)",
  brands: "var(--brands)",
  podcasts: "var(--podcasts)",
  places: "var(--places)",
};

export const categoryHue = (key: string) => CATEGORY_HUE[key] ?? "var(--balanced)";

export const hue = (color: string) => ({ "--hue": color }) as CSSProperties;

// A guest's rank, as the list and the scope show it: 01 is the best Echo score.
export const rank = (index: number) => String(index + 1).padStart(2, "0");

// The page's frame width and gutters.
export const FRAME = "mx-auto w-full max-w-[96rem] px-4 sm:px-6";

// A score out of 100 for a readout, or a dash when there's none.
export const out100 = (value: number | null | undefined) =>
  value === null || value === undefined ? "–" : String(Math.round(value * 100));

export function Lamp({ color, on = true, className = "size-2" }: { color: string; on?: boolean; className?: string }) {
  return (
    <span aria-hidden className={`inline-block shrink-0 ${on ? "lamp" : "lamp-off"} ${className}`} style={hue(color)} />
  );
}

// A level from 0 to 1 as a rounded bar. `order` staggers the fill across a row.
export function Meter({
  value,
  color,
  vertical = false,
  order = 0,
  className = "",
}: {
  value: number;
  color: string;
  vertical?: boolean;
  order?: number;
  className?: string;
}) {
  const style = {
    "--hue": color,
    "--level": `${Math.min(Math.max(value, 0), 1) * 100}%`,
    "--order": order,
  } as CSSProperties;
  return (
    <span aria-hidden className={`meter block ${vertical ? "meter-v" : ""} ${className}`} style={style}>
      <span className="unlit" />
      <span className="lit" />
    </span>
  );
}

// A zone's head: the name, and optional readouts at the right.
export function ZoneHead({
  id,
  title,
  children,
  as: Heading = "h2",
}: {
  id?: string;
  title: string;
  children?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-4 pb-1">
      <Heading id={id} className="font-display text-[0.9375rem] font-semibold text-ink">
        {title}
      </Heading>
      {children && <div className="tag flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-dim">{children}</div>}
    </div>
  );
}

// A label or category: a small dot in its hue and the word in ink. A plain chip is a name from the data (a
// taste, a podcast) in a soft pill tinted with its hue.
export function Chip({
  color,
  children,
  plain = false,
  className = "",
}: {
  color: string;
  children: ReactNode;
  plain?: boolean;
  className?: string;
}) {
  if (plain) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs text-ink ${className}`}
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        {children}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-ink-soft ${className}`}>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

// The info key beside a zone's name: the zone's explanation, kept out of the way until asked.
export function Info({
  children,
  label = "What this shows",
  up = false,
}: {
  children: ReactNode;
  label?: string;
  up?: boolean;
}) {
  return (
    <details className="group relative">
      <summary
        aria-label={label}
        className="flex size-6 cursor-pointer list-none items-center justify-center rounded-full bg-deck-hi font-display text-[0.6875rem] font-semibold text-ink-soft group-open:bg-accent group-open:text-on-hue hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        ?
      </summary>
      <div
        className={`absolute right-0 z-30 w-72 ${up ? "bottom-8" : "top-8"} rounded-xl border border-steel bg-deck p-3.5 font-sans text-sm leading-relaxed tracking-normal text-ink normal-case shadow-pop`}
      >
        {children}
      </div>
    </details>
  );
}

// Where each score's lobe peaks along a voiceprint, and how wide it spreads.
const LOBES = [1 / 6, 1 / 2, 5 / 6];
const SPREAD = 0.13;

// The same fixed texture for every guest, so two voiceprints differ only by their scores.
const texture = (index: number) => {
  const value = Math.sin(index * 12.9898 + 4.1) * 43758.5453;
  return value - Math.floor(value);
};

// A bar's hue: fit's at the first lobe, love back's at the second, reach's at the third, blended between.
function voiceHue(position: number) {
  if (position <= LOBES[0]) return SCORE_HUE.fit;
  if (position <= LOBES[1]) {
    const love = Math.round(((position - LOBES[0]) / (LOBES[1] - LOBES[0])) * 100);
    return `color-mix(in oklab, ${SCORE_HUE.love_back} ${love}%, ${SCORE_HUE.fit})`;
  }
  if (position <= LOBES[2]) {
    const reach = Math.round(((position - LOBES[1]) / (LOBES[2] - LOBES[1])) * 100);
    return `color-mix(in oklab, ${SCORE_HUE.reach} ${reach}%, ${SCORE_HUE.love_back})`;
  }
  return SCORE_HUE.reach;
}

// A guest's three scores as one voiceprint: a lobe each for fit, love back and reach, as tall as the score.
// With no reach score the last third is a dotted line, never a made-up lobe.
export function Voiceprint({
  fit,
  love,
  reach,
  bars = 36,
  height = 32,
  className = "",
}: {
  fit: number;
  love: number;
  reach: number | null;
  bars?: number;
  height?: number;
  className?: string;
}) {
  const step = 4;
  const width = bars * step;
  const thick = step * 0.55;
  const levels = [fit, love, reach ?? 0];
  const middle = height / 2;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={`block h-auto ${className}`}
    >
      {Array.from({ length: bars }, (_, index) => {
        const position = (index + 0.5) / bars;
        const x = index * step + (step - thick) / 2;
        const color = voiceHue(position);
        if (reach === null && position > 2 / 3) {
          return <circle key={index} cx={x + thick / 2} cy={middle} r={thick / 2.4} fill={color} opacity="0.55" />;
        }
        const envelope = levels.reduce(
          (sum, level, at) => sum + Math.max(level, 0) * Math.exp(-(((position - LOBES[at]) / SPREAD) ** 2)),
          0,
        );
        const amplitude = Math.max(0.1, Math.min(envelope, 1) * (0.7 + 0.3 * texture(index)));
        const h = Math.max(thick, amplitude * (height - 2));
        return <rect key={index} x={x} y={middle - h / 2} width={thick} height={h} rx={thick / 2} fill={color} />;
      })}
    </svg>
  );
}
