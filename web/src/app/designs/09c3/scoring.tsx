import { INK, TONE } from "./parts";

const SHOW = { x: 140, y: 135 };
const GUEST = { x: 240, y: 135 };
const RADIUS = 72;
const LINE = "#2a1030";
const PAPER = "#fffaf6";

const FIT_PATH = `M ${SHOW.x} ${SHOW.y - 58} C ${SHOW.x + 10} 22, ${GUEST.x - 10} 22, ${GUEST.x} ${GUEST.y - 64}`;
const LOVE_PATH = `M ${GUEST.x} ${GUEST.y + 58} C ${GUEST.x - 10} 248, ${SHOW.x + 10} 248, ${SHOW.x} ${SHOW.y + 64}`;

export function OverlapDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 272"
      role="img"
      aria-labelledby="w3-overlap-title"
      className={className}
      focusable="false"
    >
      <title id="w3-overlap-title">
        Two overlapping circles, your listeners and the guest&apos;s fans. Fit
        runs from your listeners to the guest. Love back runs from the
        guest&apos;s fans to your show. Reach is the part of the guest&apos;s
        fans outside your listeners.
      </title>
      <defs>
        <pattern
          id="w3-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke={TONE.reach} strokeWidth="1.5" />
        </pattern>
        <mask id="w3-outside-show">
          <rect width="400" height="272" fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="black" />
        </mask>
        <clipPath id="w3-inside-show">
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} />
        </clipPath>
        {(["fit", "love"] as const).map((part) => (
          <marker
            key={part}
            id={`w3-head-${part}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10z" fill={INK[part]} />
          </marker>
        ))}
      </defs>

      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="url(#w3-hatch)"
        fillOpacity={0.8}
        mask="url(#w3-outside-show)"
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill={LINE}
        fillOpacity={0.07}
        clipPath="url(#w3-inside-show)"
      />
      <circle
        cx={SHOW.x}
        cy={SHOW.y}
        r={RADIUS}
        fill="none"
        stroke={LINE}
        strokeWidth={1.25}
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="none"
        stroke={LINE}
        strokeWidth={1.25}
      />

      <path
        d={FIT_PATH}
        fill="none"
        stroke={INK.fit}
        strokeWidth={2.25}
        markerEnd="url(#w3-head-fit)"
      />
      <path
        d={LOVE_PATH}
        fill="none"
        stroke={INK.love}
        strokeWidth={2.25}
        markerEnd="url(#w3-head-love)"
      />
      <circle cx={SHOW.x} cy={SHOW.y - 58} r={3} fill={INK.fit} />
      <circle cx={GUEST.x} cy={GUEST.y + 58} r={3} fill={INK.love} />

      <g fontSize={14} fontWeight={600} textAnchor="middle">
        <text x={190} y={22} fill={INK.fit}>
          Fit
        </text>
        <text x={190} y={264} fill={INK.love}>
          Love back
        </text>
        <text
          x={270}
          y={SHOW.y}
          dy="0.35em"
          fill={INK.reach}
          stroke={PAPER}
          strokeWidth={5}
          paintOrder="stroke"
        >
          Reach
        </text>
      </g>

      <g fontSize={13} fill={LINE}>
        <text x={58} y={SHOW.y - 4} textAnchor="end">
          Your
        </text>
        <text x={58} y={SHOW.y + 13} textAnchor="end">
          listeners
        </text>
        <text x={322} y={SHOW.y - 4}>
          The guest&apos;s
        </text>
        <text x={322} y={SHOW.y + 13}>
          fans
        </text>
      </g>
    </svg>
  );
}
