"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { Info, LABEL_HUE, out100, rank, SCORE_HUE, SectionHead } from "./hud";
import { Voiceprint } from "./voiceprint";

// The scope from docs/qloo.md, Scoring: reach across, fit up, love back as dot size, label as colour,
// and the sweet-spot zone at reach ≥ 0.33 and fit ≥ 0.5. Dot size steps on a fixed five-step ramp so
// the same size means the same love back everywhere. Colour is never the only cue: sweet spots carry a
// ring, the regions and the top guests are named on the chart, the tooltip names the label, and the list and
// the dossier say it in words.
const ZONE = { reach: 0.33, fit: 0.5 };
// The label regions that fit and reach alone decide (docs/qloo.md, Scoring): safe under 33 reach, long shot
// under 33 fit. Far also needs a low love back, so it has no region; its dots gather at the right.
const LOW = 0.33;
const RAMP = [4.5, 6.5, 8.5, 11, 13.5];
const PAD = { top: 30, right: 24, bottom: 50, left: 58 };
// How many of the best guests are named beside their dots; the rest are named on hover or focus.
const NAMED = 10;
// Guests without a reach score sit in a lane of their own inside the plot, between the fit axis and reach's zero.
const LANE = 64;

// What each axis and the dot size mean, for the hints on their names.
const MEANS = {
  fit: "How much more your listeners like this guest than their fame alone explains. Higher is better.",
  reach:
    "How new the guest's fans are to your show. Further right, more of their audience is people your show doesn't reach yet.",
  love: "How much more than most people the guest's fans like your show. A bigger dot means the new listeners are likelier to enjoy it.",
};
const SCALE = "Each score runs from 0 to 100 against the other guests in this run.";

// When a dot starts growing, in seconds after the scope mounts.
const entry = (order: number) => 0.25 + order * 0.04;

// Whether to play the entrance: not under reduced motion. SVG animation doesn't read the media query.
function usePlaysMotion() {
  return useSyncExternalStore(
    (change) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", change);
      return () => query.removeEventListener("change", change);
    },
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

// A dot's radius for its love back; `scale` shrinks the ramp on a narrow chart so dots don't crowd.
export const loveRadius = (love: number, scale = 1) =>
  RAMP[Math.min(Math.floor(love * RAMP.length), RAMP.length - 1)] * scale;

// How much to shrink the dots and whether there's room for each region's meaning beside its name.
const sizing = (width: number) => ({ scale: Math.min(Math.max(width / 720, 0.62), 1), roomy: width >= 560 });

type Props = {
  title: string;
  children?: ReactNode;
  guests: Guest[];
  selected: string | null;
  highlighted: string | null;
  onSelect: (guestRef: string) => void;
  onHighlight: (guestRef: string | null) => void;
};

export function Scope({ title, children, guests, selected, highlighted, onSelect, onHighlight }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const motion = usePlaysMotion();

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const unscored = guests.filter((guest) => guest.scores.reach === null);
  const lane = unscored.length ? LANE : 0;
  const height = Math.round(Math.min(Math.max(width * 0.62, 340), 560));
  const axis = PAD.left;
  const plot = {
    left: PAD.left + lane,
    right: Math.max(width - PAD.right, PAD.left + lane + 1),
    top: PAD.top,
    bottom: height - PAD.bottom,
  };
  const x = (reach: number) => plot.left + reach * (plot.right - plot.left);
  const y = (fit: number) => plot.bottom - fit * (plot.bottom - plot.top);
  const position = (guest: Guest) => {
    if (guest.scores.reach !== null) return { cx: x(guest.scores.reach), cy: y(guest.scores.fit) };
    const slot = unscored.indexOf(guest);
    return { cx: axis + 16 + ((slot * 12) % Math.max(lane - 44, 1)), cy: y(guest.scores.fit) };
  };

  const focus = highlighted ?? selected;
  // The tooltip follows the pointer or focus; the selected guest keeps its ring and crosshair.
  const active = guests.find((guest) => guest.ref === highlighted);
  const marked = guests.find((guest) => guest.ref === focus);
  const markedAt = marked ? position(marked) : null;
  const activeAt = active ? position(active) : null;
  const sweet = guests.filter((guest) => guest.label === "sweet_spot");
  const index = new Map(guests.map((guest, i) => [guest.ref, i]));
  const { scale, roomy } = sizing(width);
  const radius = (guest: Guest) => loveRadius(guest.scores.love_back, scale);
  // The region captions, kept clear of the guests' names.
  const captions: Box[] = [
    { left: plot.left + 8, top: plot.top + 6, right: plot.left + (roomy ? 150 : 50), bottom: plot.top + 26 },
    { left: plot.right - (roomy ? 240 : 110), top: plot.bottom - 26, right: plot.right - 8, bottom: plot.bottom - 6 },
    roomy
      ? { left: plot.right - 220, top: plot.top + 6, right: plot.right - 8, bottom: plot.top + 26 }
      : { left: plot.right - 110, top: y(ZONE.fit) - 24, right: plot.right - 8, bottom: y(ZONE.fit) - 4 },
  ];
  const names = width > 0 ? placeNames(guests, focus, position, radius, plot, captions) : [];

  return (
    <section aria-labelledby="scope" className="flex flex-col gap-4">
      <SectionHead id="scope" title={title}>
        <Hint name="Love back" color="var(--love)" place={{ top: "100%", right: 0, marginTop: 8 }}>
          {MEANS.love}
        </Hint>
        <Info>
          Up is how much your listeners like a guest beyond their fame; right, how new the guest&apos;s fans are to you.
          Bigger dots: their fans like your show more. The teal corner is the sweet spot, high on all three; the shaded
          regions are the labels fit and reach decide on their own.
        </Info>
      </SectionHead>
      {children}
      <div ref={frame} className="relative shrink-0" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="group"
            aria-label="Guests by fit and reach, sized by love back"
            className="absolute inset-0 overflow-visible"
          >
            {lane > 0 && (
              <>
                <rect
                  x={axis}
                  y={plot.top}
                  width={lane}
                  height={plot.bottom - plot.top}
                  rx="8"
                  fill="var(--steel)"
                  fillOpacity="0.35"
                />
                <text
                  x={axis + lane / 2}
                  y={plot.top - 9}
                  textAnchor="middle"
                  className="tag"
                  fill="var(--ink-dim)"
                  style={{ fontSize: 9.5 }}
                >
                  No reach
                </text>
              </>
            )}

            {/* Gridlines at quarters. */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <g key={`g${tick}`} stroke="var(--steel)">
                <line x1={axis} x2={plot.right} y1={y(tick)} y2={y(tick)} />
                <line x1={x(tick)} x2={x(tick)} y1={plot.top} y2={plot.bottom} />
              </g>
            ))}

            {/* The label regions fit and reach decide, each named with what it means. */}
            <rect
              x={plot.left}
              y={plot.top}
              width={x(LOW) - plot.left}
              height={y(LOW) - plot.top}
              rx="12"
              fill="var(--safe)"
              fillOpacity="0.08"
            />
            <rect
              x={plot.left}
              y={y(LOW)}
              width={plot.right - plot.left}
              height={plot.bottom - y(LOW)}
              rx="12"
              fill="var(--long-shot)"
              fillOpacity="0.08"
            />
            <Region
              x={plot.left + 12}
              y={plot.top + 20}
              color="var(--safe)"
              name="Safe"
              means={roomy ? "few new ears" : undefined}
            />
            <Region
              x={plot.right - 12}
              y={plot.bottom - 12}
              anchor="end"
              color="var(--long-shot)"
              name="Long shot"
              means={roomy ? "your listeners aren't into them" : undefined}
            />

            {/* The sweet-spot zone. */}
            <rect
              x={x(ZONE.reach)}
              y={plot.top}
              width={plot.right - x(ZONE.reach)}
              height={y(ZONE.fit) - plot.top}
              rx="12"
              fill="var(--sweet)"
              fillOpacity="0.1"
              stroke="var(--sweet)"
              strokeOpacity="0.45"
            />
            <Region
              x={plot.right - 12}
              y={roomy ? plot.top + 20 : y(ZONE.fit) - 10}
              anchor="end"
              color="var(--sweet)"
              name={`Sweet spot · ${sweet.length}`}
              means={roomy ? "high on all three" : undefined}
            />

            {[0, 0.5, 1].map((tick) => (
              <text
                key={`y${tick}`}
                x={axis - 10}
                y={y(tick) + 3.5}
                textAnchor="end"
                className="readout"
                fill="var(--ink-dim)"
                style={{ fontSize: 11 }}
              >
                {out100(tick)}
              </text>
            ))}
            {[0, 0.5, 1].map((tick) => (
              <text
                key={`x${tick}`}
                x={x(tick)}
                y={plot.bottom + 19}
                textAnchor="middle"
                className="readout"
                fill="var(--ink-dim)"
                style={{ fontSize: 11 }}
              >
                {out100(tick)}
              </text>
            ))}

            {/* The crosshair on the guest in focus, across the whole plot, with its readouts on the axes. */}
            {markedAt && marked && (
              <g aria-hidden>
                <g stroke="var(--ink-dim)" strokeOpacity="0.6" strokeDasharray="3 4">
                  <line x1={axis} x2={plot.right} y1={markedAt.cy} y2={markedAt.cy} />
                  {marked.scores.reach !== null && (
                    <line x1={markedAt.cx} x2={markedAt.cx} y1={plot.top} y2={plot.bottom} />
                  )}
                </g>
                <rect x={axis - 34} y={markedAt.cy - 9} width={30} height={18} rx="9" fill="var(--fit)" />
                <text
                  x={axis - 19}
                  y={markedAt.cy + 4}
                  textAnchor="middle"
                  className="readout"
                  fill="var(--on-hue)"
                  style={{ fontSize: 11 }}
                >
                  {out100(marked.scores.fit)}
                </text>
                {marked.scores.reach !== null && (
                  <>
                    <rect x={markedAt.cx - 15} y={plot.bottom + 7} width={30} height={18} rx="9" fill="var(--reach)" />
                    <text
                      x={markedAt.cx}
                      y={plot.bottom + 20}
                      textAnchor="middle"
                      className="readout"
                      fill="var(--on-hue)"
                      style={{ fontSize: 11 }}
                    >
                      {out100(marked.scores.reach)}
                    </text>
                  </>
                )}
              </g>
            )}

            {guests.map((guest, order) => {
              const { cx, cy } = position(guest);
              const r = radius(guest);
              const color = LABEL_HUE[guest.label];
              const isSweet = guest.label === "sweet_spot";
              const on = guest.ref === focus;
              const name = `${rank(order)}, ${guest.name}, ${LABELS[guest.label].name}: fit ${out100(guest.scores.fit)}, love back ${out100(guest.scores.love_back)}, reach ${guest.scores.reach === null ? "not scored" : out100(guest.scores.reach)}`;
              return (
                <g
                  key={guest.ref}
                  role="button"
                  tabIndex={0}
                  aria-label={name}
                  aria-pressed={guest.ref === selected}
                  className="cursor-pointer outline-none transition-opacity duration-200"
                  opacity={highlighted && !on ? 0.35 : 1}
                  onPointerEnter={() => onHighlight(guest.ref)}
                  onPointerLeave={() => onHighlight(null)}
                  onFocus={() => onHighlight(guest.ref)}
                  onBlur={() => onHighlight(null)}
                  onClick={() => onSelect(guest.ref)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(guest.ref);
                    }
                  }}
                >
                  <circle cx={cx} cy={cy} r={Math.max(r + 4, 14)} fill="transparent" />
                  {on && <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
                  {isSweet && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r + 3.5}
                      fill="none"
                      stroke={color}
                      strokeOpacity="0.55"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={isSweet ? 1 : 0.85}>
                    {/* Grows in rank order; without animation the dot is simply there. */}
                    {motion && (
                      <animate
                        attributeName="r"
                        values={`0;0;${r}`}
                        keyTimes={`0;${(entry(order) / (entry(order) + 0.5)).toFixed(3)};1`}
                        dur={`${entry(order) + 0.5}s`}
                        calcMode="spline"
                        keySplines="0 0 1 1;0.16 1 0.3 1"
                      />
                    )}
                  </circle>
                </g>
              );
            })}

            {/* The best guests named beside their dots, over everything, on a halo of the plot's ground. */}
            <g aria-hidden className="pointer-events-none">
              {names.map(({ guest, x: tx, y: ty, anchor }) => (
                <text
                  key={guest.ref}
                  x={tx}
                  y={ty}
                  textAnchor={anchor}
                  stroke="var(--well)"
                  strokeWidth="4"
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  opacity={highlighted && guest.ref !== highlighted ? 0.35 : 1}
                  style={{ fontSize: 11.5 }}
                >
                  <tspan className="readout" fill="var(--ink-dim)">
                    {rank(index.get(guest.ref) ?? 0)}{" "}
                  </tspan>
                  <tspan className="font-display" fontWeight="600" fill="var(--ink)">
                    {guest.name}
                  </tspan>
                </text>
              ))}
            </g>
          </svg>
        )}

        {width > 0 && (
          <>
            <span
              className="absolute z-20 flex justify-center"
              style={{ left: plot.left, width: plot.right - plot.left, bottom: 4 }}
            >
              <Hint
                name="Reach"
                color="var(--reach)"
                axis="x"
                place={{ bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8 }}
              >
                {MEANS.reach} {SCALE}
              </Hint>
            </span>
            <span
              className="absolute z-20 flex items-center"
              style={{ left: 4, top: plot.top, bottom: height - plot.bottom }}
            >
              <Hint
                name="Fit"
                color="var(--fit)"
                axis="y"
                place={{ left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 8 }}
              >
                {MEANS.fit} {SCALE}
              </Hint>
            </span>
          </>
        )}

        {active && activeAt && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 w-60 rounded-xl border border-steel bg-deck px-3.5 py-3 shadow-pop"
            style={{
              left: activeAt.cx + 260 > width ? Math.max(activeAt.cx - 258, 4) : activeAt.cx + 18,
              top: Math.min(Math.max(activeAt.cy - 60, 4), height - 150),
            }}
          >
            <p className="tag" style={{ color: LABEL_HUE[active.label] }}>
              {rank(index.get(active.ref) ?? 0)} · {LABELS[active.label].name}
            </p>
            <p className="mt-1 font-display text-lg leading-tight font-semibold">{active.name}</p>
            <Voiceprint
              fit={active.scores.fit}
              love={active.scores.love_back}
              reach={active.scores.reach}
              bars={44}
              height={30}
              className="mt-2.5 w-full"
            />
            <p className="readout mt-1 grid grid-cols-3 text-center text-xs">
              <span style={{ color: SCORE_HUE.fit }}>Fit {out100(active.scores.fit)}</span>
              <span style={{ color: SCORE_HUE.love_back }}>Love {out100(active.scores.love_back)}</span>
              <span style={{ color: SCORE_HUE.reach }}>Reach {out100(active.scores.reach)}</span>
            </p>
          </div>
        )}
      </div>
      <p className="sr-only">{sweet.length} guests sit in the sweet-spot zone.</p>
    </section>
  );
}

// An axis name, or the dot-size key when there's no axis, that explains itself on hover, focus or a tap.
function Hint({
  name,
  color,
  axis,
  place,
  children,
}: {
  name: string;
  color: string;
  axis?: "x" | "y";
  place: CSSProperties;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="group relative flex">
      <button
        type="button"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        className={`flex cursor-help items-center gap-1.5 font-display font-semibold ${axis ? "text-[0.9375rem]" : "text-[0.8125rem]"} ${axis === "y" ? "flex-col-reverse" : ""}`}
        style={{ color }}
      >
        {!axis && (
          <svg aria-hidden viewBox="0 0 44 18" className="h-4.5 w-11">
            <circle cx="4" cy="9" r="2.5" fill="currentColor" fillOpacity="0.5" />
            <circle cx="15" cy="9" r="4.5" fill="currentColor" fillOpacity="0.5" />
            <circle cx="33" cy="9" r="7.5" fill="currentColor" fillOpacity="0.5" />
          </svg>
        )}
        <span className={axis === "y" ? "rotate-180 [writing-mode:vertical-rl]" : ""}>{name}</span>
        {axis === "x" && (
          <svg aria-hidden viewBox="0 0 30 10" className="h-2.5 w-7.5">
            <path d="M1 5h27M23 1l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {axis === "y" && (
          <svg aria-hidden viewBox="0 0 10 30" className="h-7.5 w-2.5">
            <path d="M5 29V2M1 7l4-5 4 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-30 w-64 rounded-xl border border-steel bg-deck px-3.5 py-2.5 font-sans text-sm leading-relaxed tracking-normal text-ink normal-case shadow-pop transition-opacity group-hover:visible group-hover:opacity-100 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
        style={place}
      >
        <span className="font-semibold" style={{ color }}>
          {name}:{" "}
        </span>
        {children}
      </span>
    </span>
  );
}

// A region's name and what it means, in its hue.
function Region({
  x,
  y,
  name,
  means,
  color,
  anchor = "start",
}: {
  x: number;
  y: number;
  name: string;
  means?: string;
  color: string;
  anchor?: "start" | "end";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} aria-hidden className="pointer-events-none" style={{ fontSize: 11.5 }}>
      <tspan className="font-display" fontWeight="600" fill={color}>
        {name}
      </tspan>
      {means && (
        <tspan className="tag" fill="var(--ink-dim)" style={{ fontSize: 10.5 }}>
          {"  "}
          {means}
        </tspan>
      )}
    </text>
  );
}

type Box = { left: number; top: number; right: number; bottom: number };
const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// Where to name the best guests and the one in focus: beside each dot on the first side that clears the
// other names and dots and stays inside the plot. A name with no clear side is left to the hover.
function placeNames(
  guests: Guest[],
  focus: string | null,
  position: (guest: Guest) => { cx: number; cy: number },
  radius: (guest: Guest) => number,
  plot: { left: number; right: number; top: number; bottom: number },
  reserved: Box[],
) {
  const dots: Box[] = guests.map((guest) => {
    const { cx, cy } = position(guest);
    const r = radius(guest);
    return { left: cx - r, top: cy - r, right: cx + r, bottom: cy + r };
  });
  const placed: Box[] = [...reserved];
  const out: { guest: Guest; x: number; y: number; anchor: "start" | "end" }[] = [];
  const order = guests
    .map((guest, i) => ({ guest, i }))
    .filter(({ guest, i }) => (i < NAMED || guest.ref === focus) && guest.scores.reach !== null)
    .sort((a, b) => Number(b.guest.ref === focus) - Number(a.guest.ref === focus) || a.i - b.i);
  for (const { guest, i } of order) {
    const { cx, cy } = position(guest);
    const r = radius(guest);
    const w = 22 + guest.name.length * 6.6;
    const h = 15;
    const sides = [
      { x: cx + r + 7, y: cy + 4, anchor: "start" as const, box: { left: cx + r + 5, right: cx + r + 7 + w } },
      { x: cx - r - 7, y: cy + 4, anchor: "end" as const, box: { left: cx - r - 7 - w, right: cx - r - 5 } },
      { x: cx - w / 2, y: cy - r - 7, anchor: "start" as const, box: { left: cx - w / 2, right: cx + w / 2 } },
      { x: cx - w / 2, y: cy + r + 15, anchor: "start" as const, box: { left: cx - w / 2, right: cx + w / 2 } },
    ];
    for (const side of sides) {
      const box = { ...side.box, top: side.y - h + 3, bottom: side.y + 3 };
      const inside =
        box.left >= plot.left + 2 && box.right <= plot.right - 2 && box.top >= plot.top && box.bottom <= plot.bottom;
      const clear =
        !placed.some((other) => overlaps(box, other)) && !dots.some((dot, d) => d !== i && overlaps(box, dot));
      if (inside && clear) {
        placed.push(box);
        out.push({ guest, x: side.x, y: side.y, anchor: side.anchor });
        break;
      }
    }
  }
  return out;
}
