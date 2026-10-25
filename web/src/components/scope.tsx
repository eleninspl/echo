"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { Info, LABEL_HUE, out100, rank, ZoneHead } from "./hud";

// The scope from docs/qloo.md, Scoring: reach across, fit up, love back as dot size, label as colour,
// and the sweet-spot zone at reach ≥ 0.33 and fit ≥ 0.5. Dot size steps on a fixed five-step ramp so
// the same size means the same love back everywhere. Colour is never the only cue: sweet spots carry a
// reticle, the tooltip names the label, and the list and the dossier say it in words.
const ZONE = { reach: 0.33, fit: 0.5 };
const RAMP = [4, 5.5, 7, 8.5, 10];
const PAD = { top: 26, right: 22, bottom: 50, left: 58 };
// Guests without a reach score sit in a lane of their own inside the plot, between the fit axis and reach's zero.
const LANE = 64;

// What each axis and the dot size mean, for the hints on their names.
const MEANS = {
  fit: "How much your listeners over-index on this guest, beyond what their fame explains. Higher is better.",
  reach:
    "How new the guest's fans are to your show. Further right, more of their audience is people your show doesn't reach yet.",
  love: "How much the guest's fans over-index on your show. A bigger dot means the new listeners are likelier to enjoy it.",
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

export const loveRadius = (love: number) => RAMP[Math.min(Math.floor(love * RAMP.length), RAMP.length - 1)];

type Props = {
  guests: Guest[];
  selected: string | null;
  highlighted: string | null;
  onSelect: (guestRef: string) => void;
  onHighlight: (guestRef: string | null) => void;
};

export function Scope({ guests, selected, highlighted, onSelect, onHighlight }: Props) {
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
  const height = Math.round(Math.min(Math.max(width * 0.62, 300), 500));
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

  return (
    <section aria-labelledby="scope" className="zone flex flex-col">
      <ZoneHead id="scope" title="Fit by reach">
        <Hint name="Love back" color="var(--love)" place={{ top: "100%", right: 0, marginTop: 8 }}>
          {MEANS.love}
        </Hint>
        <Info>
          Up is how much your listeners over-index on a guest beyond their fame; right, how new the guest&apos;s fans
          are to you. Bigger dots: their fans over-index on your show. The lime corner is the sweet spot, high on all
          three.
        </Info>
      </ZoneHead>
      <div ref={frame} className="screen relative m-3 shrink-0" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="group"
            aria-label="Guests by fit and reach, sized by love back"
            className="absolute inset-0 overflow-visible"
          >
            <defs>
              <filter id="phosphor" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="beam" x1="0" x2="1">
                <stop offset="0" stopColor="var(--fit)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--fit)" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            {lane > 0 && (
              <>
                <rect
                  x={axis}
                  y={plot.top}
                  width={lane}
                  height={plot.bottom - plot.top}
                  fill="var(--steel)"
                  fillOpacity="0.3"
                />
                <line x1={axis} x2={axis} y1={plot.top} y2={plot.bottom} stroke="var(--steel)" />
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

            {/* Graticule: dashed lines at quarters, ticks at twentieths along both axes. */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <g key={`g${tick}`} stroke="var(--steel)" strokeDasharray={tick === 0 ? undefined : "2 4"}>
                <line x1={axis} x2={plot.right} y1={y(tick)} y2={y(tick)} />
                <line x1={x(tick)} x2={x(tick)} y1={plot.top} y2={plot.bottom} />
              </g>
            ))}
            {Array.from({ length: 21 }, (_, i) => {
              const tick = i / 20;
              const size = i % 5 === 0 ? 7 : 4;
              return (
                <g key={`t${i}`} stroke="var(--steel-hi)">
                  <line x1={x(tick)} x2={x(tick)} y1={plot.bottom} y2={plot.bottom + size} />
                  <line x1={axis - size} x2={axis} y1={y(tick)} y2={y(tick)} />
                </g>
              );
            })}

            {/* The sweet-spot zone: a lime field with corner brackets. */}
            <rect
              x={x(ZONE.reach)}
              y={plot.top}
              width={plot.right - x(ZONE.reach)}
              height={y(ZONE.fit) - plot.top}
              fill="var(--sweet)"
              fillOpacity="0.06"
            />
            <path
              d={`M ${x(ZONE.reach)} ${plot.top + 14} V ${plot.top} H ${x(ZONE.reach) + 14} M ${plot.right - 14} ${plot.top} H ${plot.right} V ${plot.top + 14} M ${plot.right} ${y(ZONE.fit) - 14} V ${y(ZONE.fit)} H ${plot.right - 14} M ${x(ZONE.reach) + 14} ${y(ZONE.fit)} H ${x(ZONE.reach)} V ${y(ZONE.fit) - 14}`}
              fill="none"
              stroke="var(--sweet)"
              strokeWidth="1.5"
            />
            <text
              x={plot.right - 8}
              y={y(ZONE.fit) - 8}
              textAnchor="end"
              className="tag"
              fill="var(--sweet)"
              style={{ fontSize: 9.5 }}
            >
              Sweet spot
            </text>

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

            {/* The beam crosses once as the scope comes up. SVG's own animation, not CSS: Chrome can skip
                repainting CSS-animated SVG children, which would leave the dots unseen. */}
            {motion && (
              <rect
                aria-hidden
                x={plot.left}
                y={plot.top}
                width={48}
                height={plot.bottom - plot.top}
                fill="url(#beam)"
                opacity="0"
              >
                <animate attributeName="x" from={plot.left} to={plot.right - 48} dur="1.1s" fill="freeze" />
                <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="1.1s" fill="freeze" />
              </rect>
            )}

            {/* The crosshair on the guest in focus, across the whole plot, with its readouts on the axes. */}
            {markedAt && marked && (
              <g aria-hidden>
                <g stroke="var(--ink)" strokeOpacity="0.45" strokeDasharray="3 3">
                  <line x1={axis} x2={plot.right} y1={markedAt.cy} y2={markedAt.cy} />
                  {marked.scores.reach !== null && (
                    <line x1={markedAt.cx} x2={markedAt.cx} y1={plot.top} y2={plot.bottom} />
                  )}
                </g>
                <rect x={axis - 34} y={markedAt.cy - 8} width={30} height={16} fill="var(--fit)" />
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
                    <rect x={markedAt.cx - 15} y={plot.bottom + 8} width={30} height={16} fill="var(--reach)" />
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
              const r = loveRadius(guest.scores.love_back);
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
                  className="cursor-pointer outline-none"
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
                  <circle cx={cx} cy={cy} r={14} fill="transparent" />
                  {on && (
                    <path
                      d={`M ${cx - r - 8} ${cy - r - 2} V ${cy - r - 8} H ${cx - r - 2} M ${cx + r + 2} ${cy - r - 8} H ${cx + r + 8} V ${cy - r - 2} M ${cx + r + 8} ${cy + r + 2} V ${cy + r + 8} H ${cx + r + 2} M ${cx - r - 2} ${cy + r + 8} H ${cx - r - 8} V ${cy + r + 2}`}
                      fill="none"
                      stroke="var(--ink)"
                      strokeWidth="1.5"
                    />
                  )}
                  {isSweet && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r + 4}
                      fill="none"
                      stroke={color}
                      strokeOpacity="0.8"
                      strokeDasharray="2 2.5"
                    />
                  )}
                  <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={isSweet ? 1 : 0.85}>
                    {/* Grows in rank order after the beam; without animation the dot is simply there. */}
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
                  {(isSweet || on) && (
                    <text
                      x={guest.scores.reach === null ? cx : cx + r + 11}
                      y={guest.scores.reach === null ? cy - r - 12 : cy + 3.5}
                      textAnchor={guest.scores.reach === null ? "middle" : "start"}
                      className="readout pointer-events-none"
                      fill="var(--ink)"
                      style={{ fontSize: 12 }}
                    >
                      {String((index.get(guest.ref) ?? 0) + 1).padStart(2, "0")}
                    </text>
                  )}
                </g>
              );
            })}
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
            className="pointer-events-none absolute z-10 w-max max-w-60 border border-steel-hi bg-deck-hi/95 px-3 py-2 shadow-[0_10px_24px_rgb(0_0_0/0.6)]"
            style={{
              left: Math.min(activeAt.cx + 18, Math.max(width - 232, 0)),
              top: Math.max(activeAt.cy - 70, 4),
            }}
          >
            <p className="tag" style={{ color: LABEL_HUE[active.label] }}>
              {rank(index.get(active.ref) ?? 0)} · {LABELS[active.label].name}
            </p>
            <p className="mt-1 font-display text-lg leading-tight font-semibold">{active.name}</p>
            <p className="readout mt-1.5 flex gap-3 text-sm">
              <span className="text-fit">{out100(active.scores.fit)} fit</span>
              <span className="text-love">{out100(active.scores.love_back)} love</span>
              <span className="text-reach">{out100(active.scores.reach)} reach</span>
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
        className={`flex cursor-help items-center gap-1.5 font-display font-semibold tracking-[0.08em] uppercase ${axis ? "text-[0.9375rem]" : "text-[0.8125rem]"} ${axis === "y" ? "flex-col-reverse" : ""}`}
        style={{ color }}
      >
        {!axis && (
          <svg aria-hidden viewBox="0 0 26 12" className="h-3 w-6.5">
            <circle cx="4" cy="6" r="2.5" fill="none" stroke="currentColor" />
            <circle cx="17" cy="6" r="5" fill="none" stroke="currentColor" />
          </svg>
        )}
        <span className={axis === "y" ? "rotate-180 [writing-mode:vertical-rl]" : ""}>{name}</span>
        {axis && (
          <span
            aria-hidden
            className="flex size-4 items-center justify-center rounded-full border text-[0.625rem] leading-none tracking-normal"
            style={{ borderColor: `color-mix(in srgb, ${color} 55%, transparent)` }}
          >
            ?
          </span>
        )}
      </button>
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-30 w-64 border border-steel-hi bg-deck-hi/95 px-3 py-2 font-sans text-sm tracking-normal text-ink normal-case shadow-[0_10px_24px_rgb(0_0_0/0.6)] transition-opacity group-hover:visible group-hover:opacity-100 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
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
