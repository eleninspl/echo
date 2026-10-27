"use client";

import { useMemo, useState } from "react";

import type { MapItem, MapRow } from "@/lib/echo";
import { category } from "@/lib/format";

import { categoryHue } from "./hud";
import { TasteImage } from "./taste-side";

type Side = "yours" | "both" | "theirs";
type Spot = { key: string; item: MapItem; category: string; side: Side; x: number; y: number; r: number };
type Sides = Record<Side, MapRow[]>;

const WIDTH = 520;
const HEIGHT = 300;
const RADIUS = 132;
const SHIFT = 80;
const LEFT = WIDTH / 2 - SHIFT;
const RIGHT = WIDTH / 2 + SHIFT;
const MIDDLE = HEIGHT / 2;
const EACH = { all: 2, one: 8 };
const MOST_BOTH = 10;

const SIDE_NAMES: Record<Side, string> = {
  yours: "Only your listeners",
  both: "Both love",
  theirs: "New to you",
};
const SIDE_HUES: Record<Side, string> = {
  yours: "var(--fit)",
  both: "var(--sweet)",
  theirs: "var(--reach)",
};

const nameKey = (name: string) => name.trim().toLowerCase();

function sidesOf(showMap: MapRow[], guestMap: MapRow[], adds: MapRow[]): Sides {
  const added = new Map(adds.map((row) => [row.category, new Set(row.items.map((item) => nameKey(item.name)))]));
  const theirs = new Map(guestMap.map((row) => [row.category, new Set(row.items.map((item) => nameKey(item.name)))]));
  return {
    yours: showMap.map((row) => ({
      category: row.category,
      items: row.items.filter((item) => !theirs.get(row.category)?.has(nameKey(item.name))),
    })),
    both: guestMap.map((row) => ({
      category: row.category,
      items: row.items.filter((item) => !added.get(row.category)?.has(nameKey(item.name))),
    })),
    theirs: adds,
  };
}

function inside(x: number, y: number, cx: number, r: number) {
  return Math.hypot(x - cx, y - MIDDLE) <= r;
}

function keepIn(spot: Spot, cx: number, r: number) {
  const d = Math.hypot(spot.x - cx, spot.y - MIDDLE);
  const room = r - spot.r;
  if (d <= room || d === 0) return;
  spot.x = cx + ((spot.x - cx) / d) * room;
  spot.y = MIDDLE + ((spot.y - MIDDLE) / d) * room;
}

function keepOut(spot: Spot, cx: number, r: number) {
  const d = Math.hypot(spot.x - cx, spot.y - MIDDLE);
  const room = r + spot.r;
  if (d >= room) return;
  const [dx, dy, length] = d < 0.01 ? [cx < spot.x ? 1 : -1, 0, 1] : [spot.x - cx, spot.y - MIDDLE, d];
  spot.x = cx + (dx / length) * room;
  spot.y = MIDDLE + (dy / length) * room;
}

function layout(sides: Sides, focus: string | null): Spot[] {
  const each = focus ? EACH.one : EACH.all;
  const homes: Record<Side, number> = {
    yours: LEFT - RADIUS * 0.42,
    both: WIDTH / 2,
    theirs: RIGHT + RADIUS * 0.42,
  };
  const spots = (Object.keys(homes) as Side[]).flatMap((side) => {
    const chosen = sides[side]
      .filter((row) => !focus || row.category === focus)
      .flatMap((row) => row.items.slice(0, each).map((item, rank) => ({ row, item, rank })))
      .sort((a, b) => a.rank - b.rank || b.item.affinity - a.item.affinity)
      .slice(0, side === "both" ? MOST_BOTH : undefined);
    return chosen.map(({ row, item }, order) => {
      const turn = order * 2.39996;
      const out = Math.sqrt(order) * 20;
      return {
        key: `${side}/${row.category}/${item.name}`,
        item,
        category: row.category,
        side,
        x: homes[side] + Math.cos(turn) * out,
        y: MIDDLE + Math.sin(turn) * out,
        r: focus ? 17 : 14,
      };
    });
  });
  for (let step = 0; step < 200; step++) {
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        const one = spots[a];
        const two = spots[b];
        const want = one.r + two.r + 3;
        const apart = Math.hypot(two.x - one.x, two.y - one.y);
        if (apart >= want) continue;
        const [dx, dy, d] = apart < 0.01 ? [1, 0, 1] : [two.x - one.x, two.y - one.y, apart];
        const push = (want - d) / 2;
        one.x -= (dx / d) * push;
        one.y -= (dy / d) * push;
        two.x += (dx / d) * push;
        two.y += (dy / d) * push;
      }
    }
    for (const spot of spots) {
      if (spot.side === "yours") {
        keepOut(spot, RIGHT, RADIUS + 3);
        keepIn(spot, LEFT, RADIUS - 3);
      } else if (spot.side === "theirs") {
        keepOut(spot, LEFT, RADIUS + 3);
        keepIn(spot, RIGHT, RADIUS - 3);
      } else {
        keepIn(spot, LEFT, RADIUS - 3);
        keepIn(spot, RIGHT, RADIUS - 3);
      }
    }
  }
  return spots.filter((spot) => {
    const inLeft = inside(spot.x, spot.y, LEFT, RADIUS);
    const inRight = inside(spot.x, spot.y, RIGHT, RADIUS);
    return spot.side === "both" ? inLeft && inRight : spot.side === "yours" ? inLeft : inRight;
  });
}

const count = (rows: MapRow[], focus: string | null) =>
  rows.filter((row) => !focus || row.category === focus).reduce((sum, row) => sum + row.items.length, 0);

export function FansVenn({ showMap, guestMap, adds }: { showMap: MapRow[]; guestMap: MapRow[]; adds: MapRow[] }) {
  const [focus, setFocus] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const sides = useMemo(() => sidesOf(showMap, guestMap, adds), [showMap, guestMap, adds]);
  const spots = useMemo(() => layout(sides, focus), [sides, focus]);
  const categories = guestMap.filter((row) => row.items.length > 0).map((row) => row.category);
  const shown = spots.find((spot) => spot.key === lit);
  if (!categories.length) return <p className="text-ink-dim">There&apos;s no map for their fans yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Show one category" className="flex flex-wrap gap-1">
        {[null, ...categories].map((key) => {
          const on = key === focus;
          return (
            <button
              key={key ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => setFocus(key)}
              className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors ${
                on ? "bg-ink text-void" : "text-ink-soft hover:bg-deck-hi hover:text-ink"
              }`}
            >
              {key && <span aria-hidden className="size-2 rounded-full" style={{ background: categoryHue(key) }} />}
              {key ? category(key) : "All"}
            </button>
          );
        })}
      </div>
      <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <svg aria-hidden viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 size-full overflow-visible">
          <circle
            cx={LEFT}
            cy={MIDDLE}
            r={RADIUS}
            fill={SIDE_HUES.yours}
            fillOpacity="0.07"
            stroke={SIDE_HUES.yours}
            strokeOpacity="0.6"
          />
          <circle
            cx={RIGHT}
            cy={MIDDLE}
            r={RADIUS}
            fill={SIDE_HUES.theirs}
            fillOpacity="0.07"
            stroke={SIDE_HUES.theirs}
            strokeOpacity="0.6"
          />
        </svg>
        {spots.map((spot) => {
          const color = categoryHue(spot.category);
          const on = spot.key === lit;
          return (
            <span
              key={spot.key}
              role="img"
              tabIndex={0}
              aria-label={`${spot.item.name}, ${category(spot.category)}: ${SIDE_NAMES[spot.side].toLowerCase()}`}
              onPointerEnter={() => setLit(spot.key)}
              onPointerLeave={() => setLit(null)}
              onFocus={() => setLit(spot.key)}
              onBlur={() => setLit(null)}
              className={`absolute block overflow-hidden rounded-full bg-well outline-offset-2 transition-[scale] duration-200 ease-(--ease-out) ${on ? "z-10 scale-125" : ""}`}
              style={{
                left: `${((spot.x - spot.r) / WIDTH) * 100}%`,
                top: `${((spot.y - spot.r) / HEIGHT) * 100}%`,
                width: `${((spot.r * 2) / WIDTH) * 100}%`,
                aspectRatio: "1",
                boxShadow: `0 0 0 1.5px ${color}`,
              }}
            >
              <TasteImage item={spot.item} color={color} />
            </span>
          );
        })}
      </div>
      <p aria-live="polite" className="flex min-h-6 items-baseline gap-2 text-sm">
        {shown ? (
          <>
            <span className="font-semibold">{shown.item.name}</span>
            <span className="text-ink-dim">
              {category(shown.category)} · {SIDE_NAMES[shown.side]}
            </span>
          </>
        ) : (
          <span className="text-ink-dim">Point at a picture to see what it is.</span>
        )}
      </p>
      <dl className="grid grid-cols-3 gap-3 border-t border-steel pt-3">
        {(Object.keys(SIDE_NAMES) as Side[]).map((side) => (
          <div key={side} className="flex flex-col gap-0.5">
            <dt className="text-xs" style={{ color: SIDE_HUES[side] }}>
              {SIDE_NAMES[side]}
            </dt>
            <dd className="readout text-2xl">{count(sides[side], focus)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
