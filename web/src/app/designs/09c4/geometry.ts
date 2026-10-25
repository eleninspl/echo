export const round = (value: number) => Math.round(value * 100) / 100;

export function polar(cx: number, cy: number, radius: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return {
    x: round(cx + Math.cos(angle) * radius),
    y: round(cy + Math.sin(angle) * radius),
  };
}

type EchoArc = {
  cx: number;
  cy: number;
  from: number;
  to: number;
  radius: number;
  curl?: number;
  width: number;
  tip?: number;
};

export function echoArc({
  cx,
  cy,
  from,
  to,
  radius,
  curl = 0,
  width,
  tip = 0,
}: EchoArc) {
  const steps = Math.max(6, Math.ceil(Math.abs(to - from) / 3));
  const outer: string[] = [];
  const inner: string[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const along = index / steps;
    const degrees = from + (to - from) * along;
    const edge = radius - curl * along + width / 2;
    const thickness = Math.max(0.5, width * (tip + (1 - tip) * Math.sqrt(1 - along)));
    const out = polar(cx, cy, edge, degrees);
    const back = polar(cx, cy, edge - thickness, degrees);
    outer.push(`${out.x} ${out.y}`);
    inner.push(`${back.x} ${back.y}`);
  }
  return `M ${outer.join(" L ")} L ${inner.reverse().join(" L ")} Z`;
}

export function hairArc(
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
) {
  const start = polar(cx, cy, radius, from);
  const end = polar(cx, cy, radius, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} ${sweep} ${end.x} ${end.y}`;
}

export const MARK = {
  viewBox: "-167.2 11.5 895.9 895.9",
  cx: 205,
  cy: 525,
  ring: { radius: 111, width: 54 },
  arcs: [
    { radius: 198, curl: 18, from: -226, to: -356, width: 42 },
    { radius: 277, curl: 27, from: -271, to: -403, width: 52 },
    { radius: 352, curl: 34, from: -316, to: -448, width: 50 },
    { radius: 425, curl: 27, from: 0, to: -135, width: 54 },
  ],
};
