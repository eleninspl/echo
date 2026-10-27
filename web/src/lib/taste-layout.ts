import type { GuestBridge, MapItem, MapRow } from "./echo";

export const MAX_SIDE = 700;

export type Side = "yours" | "both" | "theirs";
export const SIDES: Side[] = ["yours", "both", "theirs"];

export type Spot = {
  key: string;
  item: MapItem;
  category: string;
  side: Side | null;
  rank: number;
  count: number;
  strength: number;
  size: number;
  x: number;
  y: number;
};

export type Ring = {
  spots: Spot[];
  rows: MapRow[];
  centre: number;
  inner: number;
  outer: number;
  wedge: number;
  scale: number;
};

export type Venn = {
  spots: Spot[];
  scale: number;
  radius: number;
  left: number;
  right: number;
  middle: number;
  half: number;
  totals: Record<Side, number>;
};

export const tasteKey = (category: string, name: string) => `${category}/${name}`;

export const middleOf = (k: number, wedge: number) => -Math.PI / 2 + k * wedge;

const scaleOf = (side: number) => Math.min(Math.max(side / MAX_SIDE, 0.55), 1);

type Placed = Spot & { homeX: number; homeY: number; middle: number };

export function ring(rows: MapRow[], side: number): Ring {
  const centre = side / 2;
  const scale = scaleOf(side);
  const outer = centre - 46 * scale;
  const inner = 58 * scale;
  const values = rows.flatMap((row) => row.items.map((item) => item.affinity));
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const wedge = (2 * Math.PI) / Math.max(rows.length, 1);
  const spots: Placed[] = rows.flatMap((row, k) =>
    row.items.map((item, rank) => {
      const strength = (item.affinity - low) / span;
      const size = (11 + 13 * strength) * scale;
      const distance = inner + size + 8 + (1 - strength) * (outer - inner - 2 * size - 8);
      const turn = (rank % 2 ? 1 : -1) * Math.ceil(rank / 2) * ((wedge * 0.7) / Math.max(row.items.length, 1));
      const angle = middleOf(k, wedge) + turn;
      const homeX = centre + Math.cos(angle) * distance;
      const homeY = centre + Math.sin(angle) * distance;
      return {
        key: tasteKey(row.category, item.name),
        item,
        category: row.category,
        side: null,
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
    collide(spots, 4 * scale);
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
  return { spots: spots.map(strip), rows, centre, inner, outer, wedge, scale };
}

export function venn(bridge: GuestBridge, side: number, focus: string | null): Venn {
  const scale = scaleOf(side);
  const radius = side * 0.32;
  const left = side / 2 - side * 0.17;
  const right = side / 2 + side * 0.17;
  const middle = side * 0.53;
  const half = Math.sqrt(radius ** 2 - (side * 0.17) ** 2);
  const each = focus ? 8 : 3;
  const homes: Record<Side, number> = { yours: left - radius * 0.45, both: side / 2, theirs: right + radius * 0.45 };
  const totals = { yours: 0, both: 0, theirs: 0 };
  const spots: Placed[] = SIDES.flatMap((where) => {
    const rows = bridge[where].filter((row) => !focus || row.category === focus);
    const counted = Object.entries(bridge.totals ?? {}).filter(([key]) => !focus || key === focus);
    totals[where] = counted.length
      ? counted.reduce((sum, [, count]) => sum + count[where], 0)
      : rows.reduce((sum, row) => sum + row.items.length, 0);
    const chosen = rows
      .flatMap((row) => row.items.slice(0, each).map((item, rank) => ({ row, item, rank })))
      .sort((a, b) => a.rank - b.rank || b.item.affinity - a.item.affinity);
    const values = chosen.map(({ item }) => item.affinity);
    const low = Math.min(...values);
    const span = Math.max(...values) - low || 1;
    return chosen.map(({ row, item, rank }, order) => {
      const strength = (item.affinity - low) / span;
      const size = (focus ? 17 + 13 * strength : 13 + 10 * strength) * scale;
      const turn = order * 2.39996;
      const reach = Math.sqrt(order) * 30 * scale;
      return {
        key: tasteKey(row.category, item.name),
        item,
        category: row.category,
        side: where,
        rank,
        count: row.items.length,
        strength,
        size,
        middle: 0,
        x: homes[where] + Math.cos(turn) * reach,
        y: middle + Math.sin(turn) * reach,
        homeX: homes[where],
        homeY: middle,
      };
    });
  });
  for (let step = 0; step < 240; step++) {
    collide(spots, 6 * scale);
    for (const spot of spots) {
      spot.x += (spot.homeX - spot.x) * 0.006;
      spot.y += (spot.homeY - spot.y) * 0.006;
      if (spot.side === "yours") {
        keepOut(spot, right, middle, radius + 4 * scale);
        keepIn(spot, left, middle, radius - 4 * scale);
      } else if (spot.side === "theirs") {
        keepOut(spot, left, middle, radius + 4 * scale);
        keepIn(spot, right, middle, radius - 4 * scale);
      } else {
        keepIn(spot, right, middle, radius - 4 * scale);
        keepIn(spot, left, middle, radius - 4 * scale);
      }
    }
  }
  return { spots: spots.map(strip), scale, radius, left, right, middle, half, totals };
}

function collide(spots: Spot[], gap: number) {
  for (let a = 0; a < spots.length; a++) {
    for (let b = a + 1; b < spots.length; b++) {
      const one = spots[a];
      const two = spots[b];
      const want = one.size + two.size + gap;
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
}

function keepIn(spot: Spot, cx: number, cy: number, radius: number) {
  const dx = spot.x - cx;
  const dy = spot.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const most = Math.max(radius - spot.size, 0);
  if (d <= most) return;
  spot.x = cx + (dx / d) * most;
  spot.y = cy + (dy / d) * most;
}

function keepOut(spot: Spot, cx: number, cy: number, radius: number) {
  const dx = spot.x - cx;
  const dy = spot.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const least = radius + spot.size;
  if (d >= least) return;
  spot.x = cx + (dx / d) * least;
  spot.y = cy + (dy / d) * least;
}

function strip({ key, item, category, side, rank, count, strength, size, x, y }: Placed): Spot {
  return { key, item, category, side, rank, count, strength, size, x, y };
}
