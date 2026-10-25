export type Point = { x: number; y: number };

const round = (value: number) => Math.round(value * 10) / 10;

export function wobble(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value) - 0.5;
}

export function smooth(points: Point[]) {
  if (points.length < 2) return "";
  const at = (index: number) =>
    points[Math.max(0, Math.min(points.length - 1, index))];
  let path = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const before = at(index - 1);
    const from = at(index);
    const to = at(index + 1);
    const after = at(index + 2);
    const c1 = {
      x: from.x + (to.x - before.x) / 6,
      y: from.y + (to.y - before.y) / 6,
    };
    const c2 = {
      x: to.x - (after.x - from.x) / 6,
      y: to.y - (after.y - from.y) / 6,
    };
    path += `C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(to.x)} ${round(to.y)}`;
  }
  return path;
}

export function lasso({
  center,
  inner,
  outer,
  from,
  to,
  seed,
}: {
  center: Point;
  inner: number;
  outer: number;
  from: number;
  to: number;
  seed: number;
}) {
  const middleAngle = (from + to) / 2;
  const halfAngle = (to - from) / 2;
  const middleRadius = (inner + outer) / 2;
  const halfRadius = (outer - inner) / 2;
  const squareness = 0.3;
  const turns = 1.1;
  const samples = 72;
  const begin = Math.PI * 0.62;
  const points: Point[] = [];
  for (let step = 0; step <= samples; step++) {
    const progress = step / samples;
    const t = begin + progress * Math.PI * 2 * turns;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const angle =
      middleAngle + halfAngle * Math.sign(cos) * Math.abs(cos) ** squareness;
    const drift = progress * 14;
    const tremor =
      3.2 * Math.sin(t * 3 + seed) + 2.2 * Math.sin(t * 5 + seed * 2.3);
    const radius =
      middleRadius +
      (halfRadius + drift) * Math.sign(sin) * Math.abs(sin) ** squareness +
      tremor;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  return smooth(points);
}

export function curve({
  from,
  to,
  bend = 0.2,
  seed = 1,
  shake = 1.2,
}: {
  from: Point;
  to: Point;
  bend?: number;
  seed?: number;
  shake?: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const control = {
    x: (from.x + to.x) / 2 - (dy / length) * bend * length,
    y: (from.y + to.y) / 2 + (dx / length) * bend * length,
  };
  const samples = 9;
  const points: Point[] = [];
  for (let step = 0; step <= samples; step++) {
    const t = step / samples;
    const edge = step === 0 || step === samples ? 0 : 1;
    points.push({
      x:
        (1 - t) ** 2 * from.x +
        2 * (1 - t) * t * control.x +
        t ** 2 * to.x +
        edge * wobble(seed, step) * shake,
      y:
        (1 - t) ** 2 * from.y +
        2 * (1 - t) * t * control.y +
        t ** 2 * to.y +
        edge * wobble(seed + 7, step) * shake,
    });
  }
  const heading = Math.atan2(to.y - control.y, to.x - control.x);
  return { path: smooth(points), heading };
}

export function arrowhead(tip: Point, heading: number, size: number) {
  const back = heading + Math.PI;
  const left = {
    x: tip.x + Math.cos(back - 0.5) * size,
    y: tip.y + Math.sin(back - 0.5) * size,
  };
  const right = {
    x: tip.x + Math.cos(back + 0.42) * size * 0.82,
    y: tip.y + Math.sin(back + 0.42) * size * 0.82,
  };
  return `M${round(left.x)} ${round(left.y)}Q${round((left.x + tip.x) / 2 + 0.6)} ${round((left.y + tip.y) / 2)} ${round(tip.x)} ${round(tip.y)}L${round(right.x)} ${round(right.y)}`;
}

export function underline(width: number, seed: number, rise = 3) {
  const points: Point[] = [];
  const samples = 8;
  for (let step = 0; step <= samples; step++) {
    const t = step / samples;
    points.push({
      x: t * width,
      y: 4 - t * rise + Math.sin(t * Math.PI) * 1.6 + wobble(seed, step) * 0.9,
    });
  }
  return smooth(points);
}
