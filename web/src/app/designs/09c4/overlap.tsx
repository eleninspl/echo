import { echoArc } from "./geometry";
import { GROUND, INK, INK_DIM, SCORE } from "./palette";

const VIEW = { x: 80, y: 24, width: 592, height: 408 };
const RADIUS = 172;
const SHOW = { x: 270, y: 245 };
const GUEST = { x: 476, y: 245 };
const LOOP = { x: (SHOW.x + GUEST.x) / 2, y: SHOW.y, radius: (GUEST.x - SHOW.x) / 2 };
const NODE = 13;
const NODE_WIDTH = 7;
const TRIM = 15;
const ARC_WIDTH = 13;
const REACH_LABEL = { x: GUEST.x + RADIUS * 0.6, y: GUEST.y + 78 };

export function OverlapFigure({ className = "" }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-labelledby="w4-overlap-title"
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
      className={className}
      focusable="false"
    >
      <title id="w4-overlap-title">
        Two overlapping circles: your listeners and the guest&apos;s fans. Fit
        is an arc from your show to the guest over the top, love back an arc
        from the guest to your show underneath, and reach is the part of the
        guest&apos;s fans outside your listeners.
      </title>
      <defs>
        <pattern
          id="w4-hatch"
          width={9}
          height={9}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={9} stroke={SCORE.reach} strokeWidth={2} />
        </pattern>
        <mask id="w4-outside-show">
          <rect x={VIEW.x} y={VIEW.y} width={VIEW.width} height={VIEW.height} fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="black" />
        </mask>
      </defs>

      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="url(#w4-hatch)"
        mask="url(#w4-outside-show)"
      />
      <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="none" stroke={INK} strokeWidth={1.5} />
      <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="none" stroke={INK} strokeWidth={1.5} />

      <text x={SHOW.x - RADIUS} y={SHOW.y - RADIUS - 20} fontSize={21} fontWeight={600} fill={INK}>
        Your listeners
      </text>
      <text
        x={GUEST.x + RADIUS}
        y={GUEST.y - RADIUS - 20}
        textAnchor="end"
        fontSize={21}
        fontWeight={600}
        fill={INK}
      >
        The guest&apos;s fans
      </text>

      <path
        d={echoArc({
          cx: LOOP.x,
          cy: LOOP.y,
          from: 180 + TRIM,
          to: 360 - TRIM,
          radius: LOOP.radius,
          width: ARC_WIDTH,
          tip: 0.1,
        })}
        fill={SCORE.fit}
      />
      <path
        d={echoArc({
          cx: LOOP.x,
          cy: LOOP.y,
          from: TRIM,
          to: 180 - TRIM,
          radius: LOOP.radius,
          width: ARC_WIDTH,
          tip: 0.1,
        })}
        fill={SCORE.love}
      />

      <Tag x={LOOP.x} y={LOOP.y - LOOP.radius - 26} color={SCORE.fit} width={44}>
        Fit
      </Tag>
      <Tag x={LOOP.x} y={LOOP.y + LOOP.radius + 26} color={SCORE.love} width={104}>
        Love back
      </Tag>
      <Tag x={REACH_LABEL.x} y={REACH_LABEL.y} color={SCORE.reach} width={78}>
        Reach
      </Tag>

      {[SHOW, GUEST].map((node) => (
        <circle
          key={node.x}
          cx={node.x}
          cy={node.y}
          r={NODE}
          fill={GROUND}
          stroke={INK}
          strokeWidth={NODE_WIDTH}
        />
      ))}
      <text x={SHOW.x - 26} y={SHOW.y} dy="0.35em" textAnchor="end" fontSize={19} fill={INK_DIM}>
        Your show
      </text>
      <rect x={GUEST.x + 21} y={GUEST.y - 14} width={68} height={28} fill={GROUND} />
      <text x={GUEST.x + 26} y={GUEST.y} dy="0.35em" fontSize={19} fill={INK_DIM}>
        Guest
      </text>
    </svg>
  );
}

function Tag({
  x,
  y,
  width,
  color,
  children,
}: {
  x: number;
  y: number;
  width: number;
  color: string;
  children: string;
}) {
  return (
    <g>
      <rect x={x - width / 2} y={y - 17} width={width} height={34} fill={GROUND} />
      <text
        x={x}
        y={y}
        dy="0.35em"
        textAnchor="middle"
        fontSize={23}
        fontWeight={600}
        fill={color}
      >
        {children}
      </text>
    </g>
  );
}
