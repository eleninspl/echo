"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { channel, Info, LABEL_HUE, out100, PanelHead } from "./gallery";

// The scope from docs/qloo.md, Scoring: reach across, fit up, love back as dot size, label as colour,
// and the sweet-spot zone at reach ≥ 0.33 and fit ≥ 0.5. Dot size steps on a fixed five-step ramp so
// the same size means the same love back everywhere. Colour is never the only cue: sweet spots carry a
// ring, the tooltip names the label, and the wall and the preview say it in words.
const ZONE = { reach: 0.33, fit: 0.5 };
const RAMP = [3.5, 5, 6.5, 8, 9.5];
const PAD = { top: 18, right: 18, bottom: 34, left: 40 };
// Guests without a reach score sit in a lane of their own, left of the axis.
const LANE = 44;

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
  const height = Math.round(Math.min(Math.max(width * 0.72, 280), 440));
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
    return { cx: PAD.left + 10 + ((slot * 11) % Math.max(lane - 20, 1)), cy: y(guest.scores.fit) };
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
    <section aria-labelledby="scope" className="panel flex flex-col rounded-[4px]">
      <PanelHead id="scope" title="Scope · fit by reach">
        <span className="flex items-center gap-1.5">
          <svg aria-hidden viewBox="0 0 26 12" className="h-3 w-6.5">
            <circle cx="4" cy="6" r="2.5" fill="none" stroke="currentColor" />
            <circle cx="17" cy="6" r="5" fill="none" stroke="currentColor" />
          </svg>
          Love back
        </span>
        <Info>
          Up is how much your listeners over-index on a guest beyond their fame; right, how new the guest&apos;s fans
          are to you. Bigger dots: their fans over-index on your show. The red corner is the sweet spot, high on all
          three.
        </Info>
      </PanelHead>
      <div ref={frame} className="monitor relative m-2 mt-0 shrink-0 rounded-[2px]" style={{ height }}>
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

            {/* Graticule: major lines at quarters, minor ticks at twentieths. */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <g key={`g${tick}`}>
                <line x1={plot.left} x2={plot.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
                <line x1={x(tick)} x2={x(tick)} y1={plot.top} y2={plot.bottom} stroke="var(--line)" />
              </g>
            ))}
            {Array.from({ length: 21 }, (_, i) => i / 20).map((tick) => (
              <g key={`t${tick}`} stroke="var(--ink-dim)" strokeOpacity="0.5">
                <line x1={x(tick)} x2={x(tick)} y1={y(0.5) - 2} y2={y(0.5) + 2} />
                <line x1={x(0.5) - 2} x2={x(0.5) + 2} y1={y(tick)} y2={y(tick)} />
              </g>
            ))}

            <rect
              x={x(ZONE.reach)}
              y={plot.top}
              width={plot.right - x(ZONE.reach)}
              height={y(ZONE.fit) - plot.top}
              fill="var(--tally)"
              fillOpacity="0.07"
              stroke="var(--tally)"
              strokeOpacity="0.55"
              strokeDasharray="3 3"
            />
            <text
              x={plot.right - 6}
              y={y(ZONE.fit) - 7}
              textAnchor="end"
              className="silk fill-tally"
              style={{ fontSize: 9 }}
            >
              Sweet spot
            </text>

            {[0, 0.5, 1].map((tick) => (
              <text
                key={`y${tick}`}
                x={plot.left - 6}
                y={y(tick) + 3}
                textAnchor="end"
                className="fill-ink-dim text-[10px]"
              >
                {out100(tick)}
              </text>
            ))}
            {[0, 0.5, 1].map((tick) => (
              <text
                key={`x${tick}`}
                x={x(tick)}
                y={plot.bottom + 14}
                textAnchor="middle"
                className="fill-ink-dim text-[10px]"
              >
                {out100(tick)}
              </text>
            ))}
            <text x={plot.right} y={height - 6} textAnchor="end" className="silk fill-reach" style={{ fontSize: 9 }}>
              Reach →
            </text>
            <text
              transform={`translate(11 ${plot.bottom}) rotate(-90)`}
              className="silk fill-fit"
              style={{ fontSize: 9 }}
            >
              Fit →
            </text>
            {lane > 0 && (
              <>
                <line
                  x1={plot.left - 4}
                  x2={plot.left - 4}
                  y1={plot.top}
                  y2={plot.bottom}
                  stroke="var(--line)"
                  strokeDasharray="2 3"
                />
                <text
                  x={PAD.left + lane / 2 - 4}
                  y={plot.bottom + 14}
                  textAnchor="middle"
                  className="fill-ink-dim text-[10px]"
                >
                  no reach
                </text>
              </>
            )}

            {/* The beam crosses once as the scope comes up. SVG's own animation, not CSS: Chrome can skip
                repainting CSS-animated SVG children, which would leave the dots unseen. */}
            {motion && (
              <rect aria-hidden x={plot.left} y={plot.top} width={48} height={plot.bottom - plot.top} fill="url(#beam)" opacity="0">
                <animate attributeName="x" from={plot.left} to={plot.right - 48} dur="1.1s" fill="freeze" />
                <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="1.1s" fill="freeze" />
              </rect>
            )}

            {markedAt && marked && (
              <g aria-hidden stroke="var(--ink)" strokeOpacity="0.55" strokeDasharray="2 3">
                <line x1={plot.left} x2={markedAt.cx} y1={markedAt.cy} y2={markedAt.cy} />
                {marked.scores.reach !== null && (
                  <line x1={markedAt.cx} x2={markedAt.cx} y1={markedAt.cy} y2={plot.bottom} />
                )}
              </g>
            )}

            {guests.map((guest, order) => {
              const { cx, cy } = position(guest);
              const r = loveRadius(guest.scores.love_back);
              const color = LABEL_HUE[guest.label];
              const isSweet = guest.label === "sweet_spot";
              const on = guest.ref === focus;
              const name = `${channel(order)}, ${guest.name}, ${LABELS[guest.label].name}: fit ${out100(guest.scores.fit)}, love back ${out100(guest.scores.love_back)}, reach ${guest.scores.reach === null ? "not scored" : out100(guest.scores.reach)}`;
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
                  {on && <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
                  {isSweet && <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={color} strokeOpacity="0.6" />}
                  <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={isSweet ? 1 : 0.85} filter="url(#phosphor)">
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
                      x={cx + r + 7}
                      y={cy + 3.5}
                      className="pointer-events-none fill-ink font-cond text-[11px] font-semibold tracking-wide uppercase"
                    >
                      {String((index.get(guest.ref) ?? 0) + 1).padStart(2, "0")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {active && activeAt && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 w-max max-w-56 rounded-[3px] border border-line bg-bezel/95 px-3 py-2 shadow-[0_8px_20px_rgb(0_0_0/0.5)]"
            style={{
              left: Math.min(activeAt.cx + 18, Math.max(width - 232, 0)),
              top: Math.max(activeAt.cy - 70, 4),
            }}
          >
            <p className="silk text-ink-dim">{channel(index.get(active.ref) ?? 0)}</p>
            <p className="mt-1 font-cond text-lg leading-tight font-semibold">{active.name}</p>
            <p className="mt-1 flex gap-3 font-cond text-sm font-semibold">
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
