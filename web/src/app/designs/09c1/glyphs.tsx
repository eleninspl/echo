import { HUE, INK } from "./wave";

const WIDTH = 258;
const HEIGHT = 252;
const RADIUS = 62;
const YOU = { x: 64, y: 126 };
const GUEST = { x: 138, y: 126 };

const FIT_ARC = `M ${YOU.x - 6} ${YOU.y - RADIUS - 6} C ${YOU.x + 6} ${YOU.y - RADIUS - 40}, ${GUEST.x - 6} ${GUEST.y - RADIUS - 40}, ${GUEST.x + 4} ${GUEST.y - RADIUS - 10}`;
const LOVE_ARC = `M ${GUEST.x + 6} ${GUEST.y + RADIUS + 6} C ${GUEST.x - 6} ${GUEST.y + RADIUS + 40}, ${YOU.x + 6} ${YOU.y + RADIUS + 40}, ${YOU.x - 4} ${YOU.y + RADIUS + 10}`;

function Head({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="6"
      refY="5"
      markerWidth="4.2"
      markerHeight="4.2"
      orient="auto-start-reverse"
    >
      <path d="M0 0 10 5 0 10z" fill={color} />
    </marker>
  );
}

export function AudienceDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Two overlapping circles, your listeners and the guest's fans. Fit runs from you to the guest, love back from the guest to you, and reach is the part of the guest's audience outside yours."
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      focusable="false"
    >
      <defs>
        <mask id="w1-diagram-outside">
          <rect width={WIDTH} height={HEIGHT} fill="white" />
          <circle cx={YOU.x} cy={YOU.y} r={RADIUS} fill="black" />
        </mask>
        <pattern
          id="w1-diagram-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="1.6" height="6" fill={HUE.reach} />
        </pattern>
        <Head id="w1-diagram-fit" color={HUE.fit} />
        <Head id="w1-diagram-love" color={HUE.love} />
      </defs>

      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="url(#w1-diagram-hatch)"
        fillOpacity={0.55}
        mask="url(#w1-diagram-outside)"
      />
      <circle
        cx={YOU.x}
        cy={YOU.y}
        r={RADIUS}
        fill="none"
        stroke={INK}
        strokeWidth={1.5}
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="none"
        stroke={INK}
        strokeWidth={1.5}
      />

      <path
        d={FIT_ARC}
        fill="none"
        stroke={HUE.fit}
        strokeWidth={2.5}
        markerEnd="url(#w1-diagram-fit)"
      />
      <path
        d={LOVE_ARC}
        fill="none"
        stroke={HUE.love}
        strokeWidth={2.5}
        markerEnd="url(#w1-diagram-love)"
      />

      <g fontSize={14} fontWeight={600} textAnchor="middle">
        <text x={YOU.x - 32} y={YOU.y} dy="0.35em" fill={INK}>
          You
        </text>
        <text
          x={GUEST.x + 32}
          y={GUEST.y}
          dy="0.35em"
          fill={INK}
          stroke="#fffaf6"
          strokeWidth={4}
          paintOrder="stroke"
        >
          Guest
        </text>
        <text x={(YOU.x + GUEST.x) / 2} y={14} dy="0.35em" fill={HUE.fit}>
          Fit
        </text>
        <text
          x={(YOU.x + GUEST.x) / 2}
          y={HEIGHT - 12}
          dy="0.35em"
          fill={HUE.love}
        >
          Love back
        </text>
        <text
          x={GUEST.x + RADIUS + 8}
          y={GUEST.y}
          dy="0.35em"
          textAnchor="start"
          fill={HUE.reach}
        >
          Reach
        </text>
      </g>
    </svg>
  );
}
