"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type { Analysis, AnchorType, MapItem, MapRow } from "@/lib/echo";
import { category as categoryName } from "@/lib/format";
import type { Rerun } from "@/lib/use-analysis";

import { requestFilters } from "./lock-header";
import { categoryHue, Chip, hue, Info, RerunStatus, SectionHead } from "./hud";
import { useReveal } from "./reveal";
import { Track } from "./spectrum";

const ANCHOR: Partial<Record<string, AnchorType>> = { music: "artist", film: "movie", tv: "tv_show", brands: "brand" };
const MAX_SIDE = 700;
const SETTLED = 1900;

type Spot = {
  key: string;
  item: MapItem;
  category: string;
  rank: number;
  count: number;
  strength: number;
  size: number;
  middle: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
};

type Layout = {
  spots: Spot[];
  centre: number;
  inner: number;
  outer: number;
  wedge: number;
  low: number;
  high: number;
  scale: number;
};

const pull = (affinity: number) => Math.round(affinity * 100);

const place = (rank: number) => (rank === 0 ? "Top" : (["2nd", "3rd"][rank - 1] ?? `${rank + 1}th`));

const middleOf = (k: number, wedge: number) => -Math.PI / 2 + k * wedge;

function layout(rows: MapRow[], side: number): Layout {
  const centre = side / 2;
  const scale = Math.min(Math.max(side / MAX_SIDE, 0.55), 1);
  const outer = centre - 46 * scale;
  const inner = 58 * scale;
  const values = rows.flatMap((row) => row.items.map((item) => item.affinity));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const wedge = (2 * Math.PI) / Math.max(rows.length, 1);
  const spots = rows.flatMap((row, k) =>
    row.items.map((item, rank) => {
      const strength = (item.affinity - low) / span;
      const size = (11 + 13 * strength) * scale;
      const distance = inner + size + 8 + (1 - strength) * (outer - inner - 2 * size - 8);
      const turn = (rank % 2 ? 1 : -1) * Math.ceil(rank / 2) * ((wedge * 0.7) / Math.max(row.items.length, 1));
      const angle = middleOf(k, wedge) + turn;
      const homeX = centre + Math.cos(angle) * distance;
      const homeY = centre + Math.sin(angle) * distance;
      return {
        key: `${row.category}-${rank}`,
        item,
        category: row.category,
        rank,
        count: row.items.length,
        strength,
        size,
        middle: middleOf(k, wedge),
        x: homeX,
        y: homeY,
        homeX,
        homeY,
      };
    }),
  );
  for (let step = 0; step < 180; step++) {
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        const one = spots[a];
        const two = spots[b];
        const gap = one.size + two.size + 4 * scale;
        const apart = Math.hypot(two.x - one.x, two.y - one.y);
        if (apart >= gap) continue;
        const [dx, dy, d] = apart < 0.01 ? [1, 0, 1] : [two.x - one.x, two.y - one.y, apart];
        const push = (gap - d) / 2;
        one.x -= (dx / d) * push;
        one.y -= (dy / d) * push;
        two.x += (dx / d) * push;
        two.y += (dy / d) * push;
      }
    }
    for (const spot of spots) {
      spot.x += (spot.homeX - spot.x) * 0.04;
      spot.y += (spot.homeY - spot.y) * 0.04;
      const dx = spot.x - centre;
      const dy = spot.y - centre;
      const d = Math.hypot(dx, dy) || 1;
      const kept = Math.min(Math.max(d, inner + spot.size + 6), outer - spot.size);
      const room = Math.max(wedge / 2 - Math.asin(Math.min(1, (spot.size + 3) / kept)), 0);
      const off = Math.atan2(Math.sin(Math.atan2(dy, dx) - spot.middle), Math.cos(Math.atan2(dy, dx) - spot.middle));
      const angle = spot.middle + Math.min(Math.max(off, -room), room);
      spot.x = centre + Math.cos(angle) * kept;
      spot.y = centre + Math.sin(angle) * kept;
    }
  }
  return { spots, centre, inner, outer, wedge, low, high, scale };
}

function sector(centre: number, inner: number, outer: number, from: number, to: number) {
  const point = (radius: number, angle: number) =>
    `${centre + Math.cos(angle) * radius} ${centre + Math.sin(angle) * radius}`;
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${point(inner, from)} L ${point(outer, from)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, to)} L ${point(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, from)} Z`;
}

const FROM = "tastes";

export function TasteMap({ analysis, rerun }: { analysis: Analysis; rerun: Rerun }) {
  const rows = useMemo(() => analysis.audience_map.filter((row) => row.items.length > 0), [analysis.audience_map]);
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [stage, shown] = useReveal<HTMLDivElement>();
  const [settled, setSettled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setSettled(true), SETTLED);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const side = Math.min(width, MAX_SIDE);
  const map = useMemo(() => (side > 0 && rows.length ? layout(rows, side) : null), [rows, side]);
  if (!rows.length) return null;

  const spots = map?.spots ?? [];
  const picked = spots.find((spot) => spot.key === chosen);
  const lit = spots.find((spot) => spot.key === (hovered ?? chosen));
  const total = rows.reduce((sum, row) => sum + row.items.length, 0);
  const anchor = picked ? ANCHOR[picked.category] : undefined;
  const busy = rerun.busy && rerun.from === FROM;

  return (
    <section aria-labelledby="tastes" className="flex flex-col gap-6">
      <SectionHead id="tastes" title="What your listeners love">
        <span>
          {total} tastes · {rows.length} categories
        </span>
        <Info>
          What your listeners like more than most people do, as a group. The closer to your show and the bigger the
          circle, the stronger the pull, out of 100.
        </Info>
      </SectionHead>
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_22rem] @4xl:items-center">
        <div ref={frame} className="min-w-0">
          <div
            ref={stage}
            role="group"
            aria-label="Your listeners' tastes around your show"
            className="relative isolate mx-auto"
            style={{ width: side, height: side }}
          >
            {map && (
              <>
                <svg
                  aria-hidden
                  width={side}
                  height={side}
                  className="pointer-events-none absolute inset-0 overflow-visible"
                >
                  {rows.map((row, k) => {
                    const middle = middleOf(k, map.wedge);
                    const on = focus === row.category || picked?.category === row.category;
                    return (
                      <path
                        key={row.category}
                        d={sector(map.centre, map.inner, map.outer, middle - map.wedge / 2, middle + map.wedge / 2)}
                        fill={categoryHue(row.category)}
                        fillOpacity={on ? 0.12 : 0.035}
                        stroke="var(--steel)"
                        strokeOpacity="0.7"
                        style={{ transition: "fill-opacity 300ms ease-out" }}
                      />
                    );
                  })}
                  {[0.5, 0].map((strength) => (
                    <circle
                      key={strength}
                      cx={map.centre}
                      cy={map.centre}
                      r={map.inner + 8 + (1 - strength) * (map.outer - map.inner - 8)}
                      fill="none"
                      stroke="var(--steel-hi)"
                      strokeDasharray="2 5"
                    />
                  ))}
                  {lit && (
                    <line
                      x1={map.centre}
                      y1={map.centre}
                      x2={lit.x}
                      y2={lit.y}
                      stroke={categoryHue(lit.category)}
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                      strokeOpacity="0.8"
                    />
                  )}
                  <g transform={`translate(${map.centre} ${map.centre})`}>
                    {[0, 1, 2].map((i) => (
                      <circle
                        key={i}
                        className="ring"
                        r={map.inner * 0.45}
                        fill="none"
                        stroke="var(--brand)"
                        strokeOpacity="0.5"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                        style={{ animationDelay: `${i * 0.93}s`, animationDuration: "4.2s" }}
                      />
                    ))}
                  </g>
                </svg>

                <span
                  aria-hidden
                  className="pointer-events-none absolute overflow-hidden rounded-full motion-reduce:hidden"
                  style={{
                    left: map.centre - map.outer,
                    top: map.centre - map.outer,
                    width: map.outer * 2,
                    height: map.outer * 2,
                  }}
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0turn, transparent 0.8turn, color-mix(in srgb, var(--brand) 14%, transparent) 1turn)",
                      animation: "spin 14s linear infinite",
                    }}
                  />
                </span>

                <span
                  aria-hidden
                  className="absolute overflow-hidden rounded-full bg-well shadow-pop"
                  style={{
                    left: map.centre - map.inner + 10 * map.scale,
                    top: map.centre - map.inner + 10 * map.scale,
                    width: (map.inner - 10 * map.scale) * 2,
                    height: (map.inner - 10 * map.scale) * 2,
                  }}
                >
                  {analysis.show.image_url && (
                    <Image
                      src={analysis.show.image_url}
                      alt=""
                      fill
                      unoptimized
                      sizes="96px"
                      className="object-cover"
                    />
                  )}
                </span>

                {rows.map((row, k) => {
                  const middle = middleOf(k, map.wedge);
                  const radius = map.outer + 22 * map.scale;
                  const on = focus === row.category;
                  return (
                    <button
                      key={row.category}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFocus(on ? null : row.category)}
                      className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full px-2 py-1 font-display text-sm font-semibold whitespace-nowrap transition-[opacity,background-color] duration-300 hover:bg-deck-hi ${
                        focus && !on ? "opacity-40" : ""
                      } ${on ? "bg-deck-hi" : ""}`}
                      style={{
                        left: map.centre + Math.cos(middle) * radius,
                        top: map.centre + Math.sin(middle) * radius,
                      }}
                    >
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ background: categoryHue(row.category) }}
                      />
                      {categoryName(row.category)}
                    </button>
                  );
                })}

                {spots.map((spot, order) => {
                  const color = categoryHue(spot.category);
                  const on = spot.key === chosen;
                  const near = spot.key === hovered || on;
                  const dim =
                    focus !== null
                      ? spot.category !== focus
                      : picked !== undefined && spot.category !== picked.category;
                  const delay = settled
                    ? 0
                    : 150 + (Math.hypot(spot.x - map.centre, spot.y - map.centre) / map.outer) * 650 + order * 4;
                  return (
                    <button
                      key={spot.key}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${spot.item.name}, ${categoryName(spot.category)}, ${pull(spot.item.affinity)} out of 100`}
                      onClick={() => setChosen(on ? null : spot.key)}
                      onPointerEnter={() => setHovered(spot.key)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => setHovered(spot.key)}
                      onBlur={() => setHovered(null)}
                      className={`absolute rounded-full before:absolute before:inset-0 before:-z-10 before:rounded-full before:content-[''] pointer-coarse:before:-inset-3 ${near ? "z-10" : ""}`}
                      style={{
                        left: spot.x - spot.size,
                        top: spot.y - spot.size,
                        width: spot.size * 2,
                        height: spot.size * 2,
                        transform: shown
                          ? "none"
                          : `translate(${map.centre - spot.x}px, ${map.centre - spot.y}px) scale(0.2)`,
                        opacity: shown ? (dim ? 0.28 : 1) : 0,
                        transition: `transform 1100ms var(--ease-out) ${delay}ms, opacity ${settled ? 250 : 500}ms ease-out ${delay}ms`,
                      }}
                    >
                      {on && (
                        <span
                          aria-hidden
                          className="absolute inset-0 animate-ping rounded-full border-2 motion-reduce:hidden"
                          style={{ borderColor: color }}
                        />
                      )}
                      <span
                        className={`relative block size-full overflow-hidden rounded-full bg-well transition-[scale] duration-200 ease-(--ease-out) ${near ? "scale-[1.35]" : ""}`}
                        style={{ boxShadow: `0 0 0 ${on ? 2.5 : 1.5}px ${color}` }}
                      >
                        <TasteImage item={spot.item} color={color} />
                      </span>
                    </button>
                  );
                })}

                {lit && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute z-20 flex max-w-[15rem] -translate-x-1/2 -translate-y-full items-baseline gap-2 rounded-full bg-deck px-3 py-1.5 text-sm whitespace-nowrap shadow-pop ring-1 ring-steel"
                    style={{
                      left: Math.min(Math.max(lit.x, 90), side - 90),
                      top: lit.y - lit.size * 1.35 - 8,
                    }}
                  >
                    <span className="truncate font-semibold">{lit.item.name}</span>
                    <span className="readout text-ink-dim">{pull(lit.item.affinity)}</span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {picked ? (
          <div key={picked.key} className="rise flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setChosen(null)}
              className="tag flex items-center gap-1.5 self-start text-ink-dim hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 12 12" className="size-3">
                <path d="M10 6H2M5.5 2.5L2 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              All tastes
            </button>
            <div className="flex items-center gap-4">
              <span
                className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-well"
                style={{ boxShadow: `inset 0 0 0 1px var(--steel)` }}
              >
                <TasteImage item={picked.item} color={categoryHue(picked.category)} large />
              </span>
              <div className="min-w-0">
                <Chip color={categoryHue(picked.category)}>{categoryName(picked.category)}</Chip>
                <p className="mt-1 font-display text-2xl leading-tight font-semibold text-balance">
                  {picked.item.name}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1" style={hue(categoryHue(picked.category))}>
              <p className="flex items-baseline justify-between gap-3">
                <span className="tag text-ink-dim">How strongly your listeners lean to it</span>
                <span className="readout text-3xl">{pull(picked.item.affinity)}</span>
              </p>
              <Track share={picked.item.affinity} order={0} />
              <p className="mt-1.5 text-sm text-ink-dim">
                {place(picked.rank)} of {picked.count} in {categoryName(picked.category)}.
              </p>
            </div>
            {anchor ? (
              <div className="flex flex-col gap-2.5 border-t border-steel pt-5">
                <button
                  type="button"
                  disabled={rerun.busy}
                  onClick={() =>
                    rerun.start(
                      { ...requestFilters(analysis.filters), episode_about: { query: picked.item.name, type: anchor } },
                      FROM,
                    )
                  }
                  className="btn btn-brand min-h-12 px-5 text-base text-balance"
                >
                  {busy ? "Finding guests…" : `Find guests for an episode about ${picked.item.name}`}
                </button>
                {busy || (rerun.from === FROM && rerun.error) ? (
                  <RerunStatus rerun={rerun} from={FROM} />
                ) : (
                  <p className="text-sm text-ink-dim">
                    Echo runs again with {picked.item.name} as the episode&apos;s subject.
                  </p>
                )}
              </div>
            ) : (
              <p className="border-t border-steel pt-5 text-sm text-ink-dim">
                Echo can build an episode around a film, a TV show, an artist or a brand.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-ink-soft">
              Each circle is something your listeners like more than most people do. The closer to your show and the
              bigger, the stronger the pull. Pick one to build an episode around it.
            </p>
            <ul className="flex flex-col border-t border-steel">
              {rows.map((row) => {
                const on = focus === row.category;
                return (
                  <li key={row.category} className="border-b border-steel">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFocus(on ? null : row.category)}
                      className={`flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-deck/70 ${on ? "bg-deck/70" : ""}`}
                    >
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: categoryHue(row.category) } as CSSProperties}
                      />
                      <span className="font-display font-semibold">{categoryName(row.category)}</span>
                      <span className="min-w-0 flex-1 truncate text-right text-sm text-ink-dim">
                        {row.items[0].name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export function TasteImage({ item, color, large = false }: { item: MapItem; color: string; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (item.image_url && !broken) {
    return (
      <Image
        src={item.image_url}
        alt=""
        fill
        unoptimized
        loading="eager"
        sizes={large ? "96px" : "64px"}
        onError={() => setBroken(true)}
        className="object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex size-full items-center justify-center font-display font-semibold text-ink ${large ? "text-4xl" : "text-xs"}`}
      style={{ background: `color-mix(in srgb, ${color} 30%, var(--well))` }}
    >
      {item.name.charAt(0)}
    </span>
  );
}
