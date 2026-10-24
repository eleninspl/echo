import type { CSSProperties, ReactNode } from "react";

import type { Label } from "@/lib/echo";

// The console's parts, shared by every zone: hues, lamps, segmented bars, gauges and zone heads.

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

// A level from 0 to 1, lit to the nearest whole segment. `order` staggers the sweep across a row.
export function Meter({
  value,
  color,
  segments = 20,
  vertical = false,
  order = 0,
  className = "",
}: {
  value: number;
  color: string;
  segments?: number;
  vertical?: boolean;
  order?: number;
  className?: string;
}) {
  const lit = Math.round(Math.min(Math.max(value, 0), 1) * segments);
  const style = {
    "--hue": color,
    "--segments": segments,
    "--level": `${(lit / segments) * 100}%`,
    "--order": order,
  } as CSSProperties;
  return (
    <span aria-hidden className={`meter block ${vertical ? "meter-v" : ""} ${className}`} style={style}>
      <span className="unlit" />
      <span className="lit" />
    </span>
  );
}

// A radial gauge: a 270° tick scale, the value as an arc in its hue, the figure in the middle. A null
// value draws the scale alone with a dash.
export function Gauge({
  value,
  color,
  size = 112,
  order = 0,
  children,
}: {
  value: number | null;
  color: string;
  size?: number;
  order?: number;
  children?: ReactNode;
}) {
  const r = 40;
  const sweep = 270;
  const length = (2 * Math.PI * r * sweep) / 360;
  const level = value === null ? 0 : Math.min(Math.max(value, 0), 1);
  const ticks = Array.from({ length: 28 }, (_, i) => i / 27);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 overflow-visible">
        <g transform="rotate(135 50 50)">
          {ticks.map((t) => {
            const angle = (t * sweep * Math.PI) / 180;
            const major = Math.round(t * 27) % 9 === 0;
            const inner = major ? 45 : 46.5;
            return (
              <line
                key={t}
                x1={50 + Math.cos(angle) * inner}
                y1={50 + Math.sin(angle) * inner}
                x2={50 + Math.cos(angle) * 49}
                y2={50 + Math.sin(angle) * 49}
                stroke={t <= level && value !== null ? color : "var(--steel-hi)"}
                strokeWidth={major ? 1.2 : 0.8}
              />
            );
          })}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeOpacity="0.14"
            strokeWidth="5"
            strokeDasharray={`${length} 999`}
          />
          {value !== null && (
            <circle
              className="arc"
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeDasharray={`${length * level} 999`}
              style={
                {
                  "--length": `${length * level}`,
                  "--order": order,
                } as CSSProperties
              }
            />
          )}
        </g>
      </svg>
      <span className="relative flex flex-col items-center">{children}</span>
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
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-steel px-4 py-2.5">
      <Heading id={id} className="font-display text-[0.9375rem] font-semibold text-ink">
        {title}
      </Heading>
      {children && <div className="tag flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-dim">{children}</div>}
    </div>
  );
}

// A label or category named in its hue: a small square and the word. A plain chip is a name from the
// data (a taste, a podcast) in a hairline box.
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
        className={`inline-flex items-center rounded-[2px] border px-1.5 py-0.5 text-xs text-ink ${className}`}
        style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${className}`}
      style={{ color }}
    >
      <span aria-hidden className="size-1.5 shrink-0" style={{ background: color }} />
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
        className="flex size-5 cursor-pointer list-none items-center justify-center rounded-full border border-steel-hi font-display text-[0.6875rem] font-semibold text-ink-soft group-open:border-fit group-open:text-fit hover:border-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        ?
      </summary>
      <div
        className={`absolute right-0 z-30 w-72 ${up ? "bottom-7" : "top-7"} border border-steel-hi bg-deck-hi p-3 font-sans text-sm tracking-normal text-ink normal-case shadow-[0_14px_36px_rgb(0_0_0/0.7)]`}
      >
        {children}
      </div>
    </details>
  );
}
