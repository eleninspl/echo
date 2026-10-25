import type { CSSProperties } from "react";

import type { Guest, Show } from "@/lib/echo";

import { arrowhead, curve, lasso } from "./hand";
import { levels, plural, sweetRun, TONE } from "./scores";

const WIDTH = 720;
const HEIGHT = 700;
const CX = 320;
const CY = 384;
const BASE = 140;
const SPAN = 142;
const AXIS_SLOTS = 4;
const GUEST_SLOTS = 4.5;
const RULE = "#d9b9ab";
const FAINT = "#ebd3c7";
const DIM = "#7a6474";
const INK = "#2a1030";
const PEN = "#13795b";

const round = (value: number) => Math.round(value * 10) / 10;

function polar(radius: number, angle: number) {
  return {
    x: round(CX + Math.cos(angle) * radius),
    y: round(CY + Math.sin(angle) * radius),
  };
}

function layout(count: number) {
  const slots = count * GUEST_SLOTS + AXIS_SLOTS;
  const step = (Math.PI * 2) / slots;
  const start = -Math.PI / 2 + (AXIS_SLOTS / 2) * step;
  const barAngle = (column: number, bar: number) =>
    start + (column * GUEST_SLOTS + 0.75 + bar + 0.5) * step;
  const guestFrom = (column: number) =>
    start + (column * GUEST_SLOTS + 0.35) * step;
  const guestTo = (column: number) =>
    start + ((column + 1) * GUEST_SLOTS - 0.35) * step;
  return { step, barAngle, guestFrom, guestTo };
}

function initial(show: Show) {
  return show.title.trim().charAt(0).toUpperCase();
}

export function Dial({
  show,
  guests,
  marked,
}: {
  show: Show | null;
  guests: Guest[] | null;
  marked: boolean;
}) {
  const count = guests?.length ?? 0;
  const { step, barAngle, guestFrom, guestTo } = layout(Math.max(count, 1));
  const thickness = Math.min(9, step * BASE * 0.62);
  const sweet = guests?.filter((guest) => guest.label === "sweet_spot").length;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="block h-auto w-full overflow-visible"
      focusable="false"
    >
      <defs>
        <path
          id="w6-label-top"
          d={`M ${CX - 90} ${CY} A 90 90 0 0 1 ${CX + 90} ${CY}`}
        />
        <path
          id="w6-label-bottom"
          d={`M ${CX - 100} ${CY} A 100 100 0 0 0 ${CX + 100} ${CY}`}
        />
        <clipPath id="w6-cover-clip">
          <circle cx={CX} cy={CY} r={74} />
        </clipPath>
      </defs>

      <circle cx={CX} cy={CY} r={BASE} fill="none" stroke={RULE} />
      <circle
        cx={CX}
        cy={CY}
        r={BASE + SPAN / 2}
        fill="none"
        stroke={RULE}
        strokeDasharray="1.5 5"
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={BASE + SPAN} fill="none" stroke={FAINT} />

      <line
        x1={CX}
        y1={CY - BASE}
        x2={CX}
        y2={CY - BASE - SPAN}
        stroke={RULE}
      />
      {[0, 50, 100].map((value) => {
        const y = CY - BASE - (SPAN * value) / 100;
        return (
          <g key={value}>
            <line x1={CX - 5} y1={y} x2={CX + 5} y2={y} stroke={DIM} />
            <text
              x={CX - 10}
              y={y}
              dy="0.34em"
              textAnchor="end"
              fontSize={14}
              fill={DIM}
              className="w6-figures"
            >
              {value}
            </text>
          </g>
        );
      })}

      {show?.image_url ? (
        <image
          href={show.image_url}
          x={CX - 74}
          y={CY - 74}
          width={148}
          height={148}
          clipPath="url(#w6-cover-clip)"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <circle cx={CX} cy={CY} r={74} fill="#f6e0d4" />
      )}
      <circle cx={CX} cy={CY} r={74} fill="none" stroke={RULE} />
      {show && !show.image_url && (
        <text
          x={CX}
          y={CY}
          dy="0.35em"
          textAnchor="middle"
          fontSize={72}
          fontStyle="italic"
          fill={INK}
          className="w6-serif"
        >
          {initial(show)}
        </text>
      )}

      {show && (
        <text fontSize={19} fill={INK} className="w6-serif" fontStyle="italic">
          <textPath href="#w6-label-top" startOffset="50%" textAnchor="middle">
            {show.title.length > 26
              ? `${show.title.slice(0, 25).trimEnd()}…`
              : show.title}
          </textPath>
        </text>
      )}
      {guests && (
        <text fontSize={13.5} fill={DIM} className="w6-figures">
          <textPath
            href="#w6-label-bottom"
            startOffset="50%"
            textAnchor="middle"
          >
            {`${plural(guests.length, "guest", "guests")} · ${plural(sweet ?? 0, "sweet spot", "sweet spots")}`}
          </textPath>
        </text>
      )}

      {guests?.map((guest, column) => {
        const isSweet = guest.label === "sweet_spot";
        const rankAt = polar(BASE + SPAN + 17, barAngle(column, 1));
        return (
          <g
            key={guest.ref}
            className="w6-grow"
            style={{ "--w6-order": column } as CSSProperties}
          >
            {levels(guest).map(([part, score], bar) => {
              const angle = barAngle(column, bar);
              const inner = polar(BASE + 1, angle);
              if (score === null) {
                return (
                  <circle
                    key={part}
                    cx={inner.x}
                    cy={inner.y}
                    r={thickness * 0.38}
                    fill="none"
                    stroke={DIM}
                    strokeWidth={1.4}
                  />
                );
              }
              const outer = polar(BASE + Math.max(0.03, score) * SPAN, angle);
              return (
                <line
                  key={part}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={TONE[part]}
                  strokeOpacity={isSweet ? 1 : 0.38}
                  strokeWidth={isSweet ? thickness : thickness * 0.72}
                  strokeLinecap="butt"
                />
              );
            })}
            <text
              x={rankAt.x}
              y={rankAt.y}
              dy="0.34em"
              textAnchor="middle"
              fontSize={13}
              fill={isSweet ? INK : DIM}
              fontWeight={isSweet ? 600 : 400}
              className="w6-figures w6-wide-only"
            >
              {column + 1}
            </text>
          </g>
        );
      })}

      {marked && guests && (
        <SweetMark guests={guests} from={guestFrom} to={guestTo} />
      )}
    </svg>
  );
}

function SweetMark({
  guests,
  from,
  to,
}: {
  guests: Guest[];
  from: (column: number) => number;
  to: (column: number) => number;
}) {
  const run = sweetRun(guests);
  if (!run) return null;
  const last = run.whole ? run.last : run.first;
  const outer = BASE + SPAN + 30;
  const pad = 0.05;
  const startAngle = from(run.first) - pad;
  const endAngle = to(last) + pad;
  const loop = lasso({
    center: { x: CX, y: CY },
    inner: BASE - 24,
    outer,
    from: startAngle,
    to: endAngle,
    seed: 3,
  });
  const middle = (startAngle + endAngle) / 2;
  const target = polar(outer + 26, Math.min(middle, -0.5));
  const noteAt = { x: 708, y: 52 };
  const tail = { x: Math.min(noteAt.x - 96, target.x + 70), y: noteAt.y + 22 };
  const pointer = curve({ from: tail, to: target, bend: -0.28, seed: 5 });
  const note = run.whole
    ? plural(run.total, "sweet spot", "sweet spots")
    : "sweet spot";

  return (
    <g
      fill="none"
      stroke={PEN}
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d={loop}
        pathLength={1}
        className="w6-draw"
        style={{ "--w6-at": "1s", "--w6-for": "1.1s" } as CSSProperties}
      />
      <text
        x={noteAt.x}
        y={noteAt.y}
        textAnchor="end"
        fontSize={38}
        stroke="none"
        fill={PEN}
        transform={`rotate(-4 ${noteAt.x} ${noteAt.y})`}
        className="w6-hand w6-write"
        style={{ "--w6-at": "2.05s", "--w6-for": "0.6s" } as CSSProperties}
      >
        {note}
      </text>
      <path
        d={`${pointer.path}${arrowhead(target, pointer.heading, 16)}`}
        pathLength={1}
        className="w6-draw"
        style={{ "--w6-at": "2.6s", "--w6-for": "0.45s" } as CSSProperties}
      />
    </g>
  );
}
