import { INK, TONE } from "./scores";

const LEFT = { x: 230, y: 228 };
const RIGHT = { x: 370, y: 228 };
const RADIUS = 140;
const INK_LINE = "#2a1030";

function head(tip: { x: number; y: number }, angle: number, color: string) {
  const size = 11;
  const a = {
    x: tip.x - size * Math.cos(angle - 0.45),
    y: tip.y - size * Math.sin(angle - 0.45),
  };
  const b = {
    x: tip.x - size * Math.cos(angle + 0.45),
    y: tip.y - size * Math.sin(angle + 0.45),
  };
  return (
    <path
      d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${tip.x} ${tip.y}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function OverlapDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 460"
      className={className}
      role="img"
      aria-labelledby="w6-diagram-title"
      focusable="false"
    >
      <title id="w6-diagram-title">
        Two overlapping circles: your listeners and the guest&apos;s fans. Fit
        runs from your listeners to the guest, love back from the guest&apos;s
        fans to your show, and reach is the part of the guest&apos;s fans
        outside your audience.
      </title>
      <defs>
        <pattern
          id="w6-hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="7"
            stroke={TONE.reach}
            strokeWidth="1.5"
          />
        </pattern>
        <clipPath id="w6-left-clip">
          <circle cx={LEFT.x} cy={LEFT.y} r={RADIUS} />
        </clipPath>
        <mask id="w6-outside-left">
          <rect width="600" height="460" fill="white" />
          <circle cx={LEFT.x} cy={LEFT.y} r={RADIUS} fill="black" />
        </mask>
      </defs>

      <circle
        cx={RIGHT.x}
        cy={RIGHT.y}
        r={RADIUS}
        fill="url(#w6-hatch)"
        mask="url(#w6-outside-left)"
      />
      <circle
        cx={RIGHT.x}
        cy={RIGHT.y}
        r={RADIUS}
        fill="#f3dccf"
        clipPath="url(#w6-left-clip)"
      />
      <circle
        cx={LEFT.x}
        cy={LEFT.y}
        r={RADIUS}
        fill="none"
        stroke={INK_LINE}
        strokeWidth={1.5}
      />
      <circle
        cx={RIGHT.x}
        cy={RIGHT.y}
        r={RADIUS}
        fill="none"
        stroke={INK_LINE}
        strokeWidth={1.5}
      />

      <text
        x={150}
        y={60}
        textAnchor="middle"
        fontSize={21}
        fill={INK_LINE}
        className="w6-serif"
        fontStyle="italic"
      >
        Your listeners
      </text>
      <text
        x={452}
        y={60}
        textAnchor="middle"
        fontSize={21}
        fill={INK_LINE}
        className="w6-serif"
        fontStyle="italic"
      >
        The guest&apos;s fans
      </text>

      <path
        d="M226 92 C246 22, 354 22, 374 92"
        fill="none"
        stroke={TONE.fit}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {head({ x: 374, y: 92 }, Math.atan2(92 - 22, 374 - 354), TONE.fit)}
      <text
        x={300}
        y={26}
        textAnchor="middle"
        fontSize={19}
        fontWeight={600}
        fill={INK.fit}
      >
        Fit
      </text>

      <path
        d="M374 364 C354 434, 246 434, 226 364"
        fill="none"
        stroke={TONE.love}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {head({ x: 226, y: 364 }, Math.atan2(364 - 434, 226 - 246), TONE.love)}
      <text
        x={300}
        y={452}
        textAnchor="middle"
        fontSize={19}
        fontWeight={600}
        fill={INK.love}
      >
        Love back
      </text>

      <line
        x1={472}
        y1={228}
        x2={524}
        y2={228}
        stroke={INK.reach}
        strokeWidth={1.4}
      />
      <circle cx={472} cy={228} r={3} fill={INK.reach} />
      <text
        x={532}
        y={228}
        dy="0.34em"
        fontSize={19}
        fontWeight={600}
        fill={INK.reach}
      >
        Reach
      </text>
    </svg>
  );
}
