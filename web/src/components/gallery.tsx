import type { CSSProperties, ReactNode } from "react";

import type { Label } from "@/lib/echo";

// The gallery's hardware, shared by every panel: lamps, meters, scribble strips and panel heads.

export const SCORE_HUE = { fit: "var(--fit)", love_back: "var(--love)", reach: "var(--reach)" } as const;

export const LABEL_HUE: Record<Label, string> = {
  sweet_spot: "var(--tally)",
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

// A guest's channel on the desk, used by every panel that names them: CH 01 is the top-ranked guest.
export const channel = (index: number) => `CH ${String(index + 1).padStart(2, "0")}`;

export function Lamp({
  color,
  on = true,
  className = "size-2.5",
}: {
  color: string;
  on?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-[1px] ${on ? "lamp" : "lamp-off"} ${className}`}
      style={hue(color)}
    />
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

// A panel's head: the silkscreened name, an optional count at the right, and its heading for screen readers.
export function PanelHead({
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
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2.5">
      <Heading id={id} className="silk text-ink-soft">
        {title}
      </Heading>
      {children && <div className="silk flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-dim">{children}</div>}
    </div>
  );
}

// The coloured strip a channel's name is written on.
export function Scribble({
  color,
  children,
  className = "",
}: {
  color: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] px-1.5 py-0.5 font-cond text-xs font-semibold tracking-wider text-on-light uppercase ${className}`}
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

// The page's frame width and gutters.
export const FRAME = "mx-auto w-full max-w-[90rem] px-3 sm:px-6";

// A score out of 100 for a readout, or a dash when there's none.
export const out100 = (value: number | null | undefined) =>
  value === null || value === undefined ? "–" : String(Math.round(value * 100));

// The little info key beside a panel's name: the panel's explanation, kept out of the way until asked.
export function Info({ children, label = "What this shows" }: { children: ReactNode; label?: string }) {
  return (
    <details className="group relative">
      <summary
        aria-label={label}
        className="flex size-5 cursor-pointer list-none items-center justify-center rounded-full border border-line text-[0.625rem] font-semibold text-ink-soft hover:border-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        ?
      </summary>
      <div className="absolute top-7 right-0 z-20 w-72 rounded-[4px] border border-line bg-bezel p-3 font-sans text-sm tracking-normal text-ink normal-case shadow-[0_12px_32px_rgb(0_0_0/0.6)]">
        {children}
      </div>
    </details>
  );
}
