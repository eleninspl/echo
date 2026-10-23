"use client";

import { useEffect, useRef, useState } from "react";

import type { Guest, Label } from "@/lib/echo";
import { LABELS, score } from "@/lib/format";

// The chart from docs/qloo.md, Scoring: reach across, fit up, love back as dot size, label as colour,
// and the sweet-spot zone at reach ≥ 0.33 and fit ≥ 0.5. Colour is never the only cue: each label has
// its own fill or stroke, the legend names them, and the guest table is the chart's table view.
const MARK: Record<Label, { fill: string; stroke: string; dash?: string }> = {
  sweet_spot: { fill: "var(--vermilion)", stroke: "var(--ink)" },
  safe: { fill: "var(--tag-safe)", stroke: "var(--tag-safe)" },
  far: { fill: "var(--stock)", stroke: "var(--tag-safe)" },
  long_shot: { fill: "var(--stock)", stroke: "var(--ink)", dash: "2 2" },
  balanced: { fill: "var(--stock)", stroke: "var(--ink)" },
};

const ORDER: Label[] = ["sweet_spot", "safe", "far", "long_shot", "balanced"];
const ZONE = { reach: 0.33, fit: 0.5 };
const PAD = { top: 16, right: 20, bottom: 52, left: 48 };
// Guests without a reach score sit in a lane of their own, left of the axis.
const LANE = 56;

type Props = {
  guests: Guest[];
  // The guest whose row the pointer or focus is on, shown with a ring.
  highlighted: string | null;
  onSelect: (guestRef: string) => void;
};

export function ScoreSection(props: Props) {
  return (
    <section aria-labelledby="where" className="border-b-2 border-ink">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-4">
          <h2 id="where" className="font-display text-5xl leading-none font-extrabold uppercase">
            Where they sit
          </h2>
          <p className="mt-3 text-ink-soft">
            Up is how much your listeners over-index on a guest, beyond their fame. Right is how new the guest&apos;s
            fans are to you. Bigger dots are guests whose fans over-index on your show.
          </p>
          <p className="mt-3 text-ink-soft">
            The sweet spot is the shaded corner, high on all three. Reach and love back pull against each other, so
            it&apos;s rare. Select a dot to go to the guest.
          </p>
        </div>
        <div className="md:col-span-8">
          <ScoreChart {...props} />
        </div>
      </div>
    </section>
  );
}

function ScoreChart({ guests, highlighted, onSelect }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const unscored = guests.filter((guest) => guest.scores.reach === null);
  const lane = unscored.length ? LANE : 0;
  const height = Math.round(Math.min(Math.max(width * 0.62, 320), 460));
  const plot = {
    left: PAD.left + lane,
    right: Math.max(width - PAD.right, PAD.left + lane + 1),
    top: PAD.top,
    bottom: height - PAD.bottom,
  };
  const x = (reach: number) => plot.left + reach * (plot.right - plot.left);
  const y = (fit: number) => plot.bottom - fit * (plot.bottom - plot.top);
  const radius = (love: number) => 4 + love * 8;
  const position = (guest: Guest) => {
    if (guest.scores.reach !== null) return { cx: x(guest.scores.reach), cy: y(guest.scores.fit) };
    // Spread the unscored ones across the lane so equal fits don't stack.
    const slot = unscored.indexOf(guest);
    return { cx: PAD.left + 12 + ((slot * 14) % Math.max(lane - 24, 1)), cy: y(guest.scores.fit) };
  };

  const active = guests.find((guest) => guest.ref === (hovered ?? highlighted));
  const activeAt = active ? position(active) : null;

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Labels" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {ORDER.filter((label) => guests.some((guest) => guest.label === label)).map((label) => (
          <li key={label} className="flex items-center gap-2">
            <svg aria-hidden viewBox="0 0 16 16" className="size-4">
              <circle
                cx="8"
                cy="8"
                r="6"
                fill={MARK[label].fill}
                stroke={MARK[label].stroke}
                strokeWidth="2"
                strokeDasharray={MARK[label].dash}
              />
            </svg>
            {LABELS[label].name}
          </li>
        ))}
        <li className="flex items-center gap-2 text-ink-soft">
          <svg aria-hidden viewBox="0 0 24 16" className="h-4 w-6">
            <circle cx="5" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Bigger: their fans love your show more
        </li>
      </ul>

      <div ref={frame} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="group"
            aria-label="Guests by fit and reach, sized by love back"
            className="absolute inset-0 overflow-visible"
          >
            <rect
              x={x(ZONE.reach)}
              y={plot.top}
              width={plot.right - x(ZONE.reach)}
              height={y(ZONE.fit) - plot.top}
              fill="var(--well)"
            />
            <text x={plot.right - 8} y={plot.top + 18} textAnchor="end" className="fill-ink-soft text-xs font-semibold">
              Sweet-spot zone
            </text>

            {[0, 0.5, 1].map((tick) => (
              <g key={`y${tick}`}>
                <line x1={plot.left} x2={plot.right} y1={y(tick)} y2={y(tick)} stroke="var(--rule)" />
                <text x={plot.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-ink-soft text-xs tabular-nums">
                  {score(tick)}
                </text>
              </g>
            ))}
            {[0, 0.33, 0.67, 1].map((tick) => (
              <g key={`x${tick}`}>
                <line x1={x(tick)} x2={x(tick)} y1={plot.top} y2={plot.bottom} stroke="var(--rule)" />
                <text x={x(tick)} y={plot.bottom + 18} textAnchor="middle" className="fill-ink-soft text-xs tabular-nums">
                  {score(tick)}
                </text>
              </g>
            ))}
            <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke="var(--ink)" />
            <text x={plot.right} y={height - 6} textAnchor="end" className="fill-ink text-xs font-semibold">
              Reach: how new their fans are to you →
            </text>
            <text
              transform={`translate(14 ${plot.bottom}) rotate(-90)`}
              textAnchor="start"
              className="fill-ink text-xs font-semibold"
            >
              Fit beyond fame →
            </text>
            {lane > 0 && (
              <text x={plot.left - 14} y={plot.bottom + 18} textAnchor="end" className="fill-ink-soft text-xs">
                Not scored
              </text>
            )}

            {guests.map((guest) => {
              const { cx, cy } = position(guest);
              const mark = MARK[guest.label];
              const on = guest.ref === hovered || guest.ref === highlighted;
              const name = `${guest.name}, ${LABELS[guest.label].name}: fit ${score(guest.scores.fit)}, love back ${score(guest.scores.love_back)}, reach ${guest.scores.reach === null ? "not scored" : score(guest.scores.reach)}`;
              return (
                <g
                  key={guest.ref}
                  role="button"
                  tabIndex={0}
                  aria-label={name}
                  className="cursor-pointer outline-none"
                  onPointerEnter={() => setHovered(guest.ref)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(guest.ref)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect(guest.ref)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(guest.ref);
                    }
                  }}
                >
                  <circle cx={cx} cy={cy} r={12} fill="transparent" />
                  {on && <circle cx={cx} cy={cy} r={radius(guest.scores.love_back) + 5} fill="none" stroke="var(--ink)" strokeWidth="2" />}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius(guest.scores.love_back)}
                    fill={mark.fill}
                    stroke={mark.stroke}
                    strokeWidth="2"
                    strokeDasharray={mark.dash}
                    paintOrder="stroke"
                  />
                  {guest.label === "sweet_spot" && (
                    // Labels near the right edge go on the dot's left so they stay inside the plot.
                    <text
                      x={cx > plot.right - 90 ? cx - radius(guest.scores.love_back) - 6 : cx + radius(guest.scores.love_back) + 6}
                      y={cy + 4}
                      textAnchor={cx > plot.right - 90 ? "end" : "start"}
                      className="fill-ink text-xs font-semibold"
                    >
                      {guest.name}
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
            className="pointer-events-none absolute z-10 w-max max-w-56 border-2 border-ink bg-stock px-3 py-2 text-sm shadow-[0_6px_16px_rgb(0_0_0/0.18)]"
            style={{
              left: Math.min(activeAt.cx + 16, Math.max(width - 224, 0)),
              top: Math.max(activeAt.cy - 64, 0),
            }}
          >
            <p className="font-display text-lg leading-tight font-extrabold uppercase">{active.name}</p>
            <p className="text-ink-soft">{LABELS[active.label].name}</p>
            <p className="mt-1 tabular-nums">
              <span className="font-semibold">{score(active.scores.fit)}</span> fit ·{" "}
              <span className="font-semibold">{score(active.scores.love_back)}</span> love back ·{" "}
              {active.scores.reach === null ? (
                "reach not scored"
              ) : (
                <>
                  <span className="font-semibold">{score(active.scores.reach)}</span> reach
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
