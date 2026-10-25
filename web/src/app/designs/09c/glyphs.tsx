import { INK, TONE, type Part } from "./wave";

const WIDTH = 176;
const HEIGHT = 124;
const RADIUS = 40;
const SHOW = { x: 68, y: 62 };
const GUEST = { x: 108, y: 62 };

const ARC_OVER = `M ${SHOW.x} ${SHOW.y - 9} C ${SHOW.x - 4} -8, ${GUEST.x + 4} -8, ${GUEST.x} ${GUEST.y - 13}`;
const ARC_UNDER = `M ${GUEST.x} ${GUEST.y + 9} C ${GUEST.x + 4} 132, ${SHOW.x - 4} 132, ${SHOW.x} ${SHOW.y + 13}`;

export function OverlapGlyph({
  part,
  className = "",
}: {
  part: Part;
  className?: string;
}) {
  const id = `v9c-glyph-${part}`;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      focusable="false"
    >
      <defs>
        <clipPath id={`${id}-inside`}>
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} />
        </clipPath>
        <mask id={`${id}-outside`}>
          <rect width={WIDTH} height={HEIGHT} fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="black" />
        </mask>
        <pattern
          id={`${id}-dots`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="3" r="1.25" fill={TONE.reach} />
        </pattern>
        <marker
          id={`${id}-head`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="4.2"
          markerHeight="4.2"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill={INK[part]} />
        </marker>
      </defs>

      <circle
        cx={SHOW.x}
        cy={SHOW.y}
        r={RADIUS}
        fill={TONE.fit}
        fillOpacity={0.07}
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill={TONE.reach}
        fillOpacity={0.06}
      />

      {part === "reach" ? (
        <circle
          cx={GUEST.x}
          cy={GUEST.y}
          r={RADIUS}
          fill={`url(#${id}-dots)`}
          mask={`url(#${id}-outside)`}
        />
      ) : (
        <circle
          cx={GUEST.x}
          cy={GUEST.y}
          r={RADIUS}
          fill={TONE[part]}
          fillOpacity={0.22}
          clipPath={`url(#${id}-inside)`}
        />
      )}

      <circle
        cx={SHOW.x}
        cy={SHOW.y}
        r={RADIUS}
        fill="none"
        stroke={TONE.fit}
        strokeWidth={1.6}
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="none"
        stroke={TONE.reach}
        strokeWidth={1.6}
      />

      {part !== "reach" && (
        <path
          d={part === "fit" ? ARC_OVER : ARC_UNDER}
          fill="none"
          stroke={INK[part]}
          strokeWidth={2.6}
          strokeLinecap="round"
          markerEnd={`url(#${id}-head)`}
        />
      )}

      <circle cx={SHOW.x} cy={SHOW.y} r={5} fill={TONE.fit} />
      <circle cx={GUEST.x} cy={GUEST.y} r={5} fill={TONE.reach} />
    </svg>
  );
}
