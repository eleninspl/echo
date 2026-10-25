import { styles } from "./styles";
import { TONE } from "./wave";

const WIDTH = 960;
const HEIGHT = 560;
const SHOW = { x: 350, y: 272 };
const GUEST = { x: 610, y: 272 };
const RADIUS = 200;
const RINGS = [40, 80, 120, 160];
const GROUND = "#170c1a";
const INK = "#fbf1ea";
const SOFT = "#dccacf";

const FIT_PATH = `M ${SHOW.x + 12} ${SHOW.y - 22} C ${SHOW.x + 50} 12, ${GUEST.x - 50} 12, ${GUEST.x - 12} ${GUEST.y - 24}`;
const LOVE_PATH = `M ${GUEST.x - 12} ${GUEST.y + 22} C ${GUEST.x - 50} 532, ${SHOW.x + 50} 532, ${SHOW.x + 12} ${SHOW.y + 24}`;

const halo = { paintOrder: "stroke", stroke: GROUND, strokeWidth: 8, strokeLinejoin: "round" } as const;

function Head({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M1 1 9 5 1 9" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </marker>
  );
}

export function Overlap() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby="v9e-overlap-title v9e-overlap-desc"
      className="h-auto w-full overflow-visible"
      focusable="false"
    >
      <title id="v9e-overlap-title">Your listeners and the guest&apos;s fans, overlapping</title>
      <desc id="v9e-overlap-desc">
        Fit runs from your show to the guest. Love back runs from the guest to your show. Reach is the part of the
        guest&apos;s audience your show doesn&apos;t have yet.
      </desc>
      <defs>
        <radialGradient id="v9e-ov-show">
          <stop offset="0" stopColor={TONE.fit} stopOpacity="0.16" />
          <stop offset="1" stopColor={TONE.fit} stopOpacity="0.03" />
        </radialGradient>
        <radialGradient id="v9e-ov-guest">
          <stop offset="0" stopColor={TONE.reach} stopOpacity="0.14" />
          <stop offset="1" stopColor={TONE.reach} stopOpacity="0.03" />
        </radialGradient>
        <clipPath id="v9e-ov-inside-show">
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} />
        </clipPath>
        <mask id="v9e-ov-outside-show">
          <rect width={WIDTH} height={HEIGHT} fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="black" />
        </mask>
        <pattern id="v9e-ov-dots" width="11" height="11" patternUnits="userSpaceOnUse">
          <circle cx="5.5" cy="5.5" r="1.3" fill={TONE.reach} />
        </pattern>
        <Head id="v9e-ov-head-fit" color={TONE.fit} />
        <Head id="v9e-ov-head-love" color={TONE.love} />
      </defs>

      <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="url(#v9e-ov-show)" />
      <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="url(#v9e-ov-guest)" />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="url(#v9e-ov-dots)"
        fillOpacity={0.6}
        mask="url(#v9e-ov-outside-show)"
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill={TONE.love}
        fillOpacity={0.2}
        clipPath="url(#v9e-ov-inside-show)"
      />

      {RINGS.map((radius, index) => (
        <circle
          key={`show-${radius}`}
          cx={SHOW.x}
          cy={SHOW.y}
          r={radius}
          fill="none"
          stroke={TONE.fit}
          strokeOpacity={0.14 + index * 0.06}
          strokeWidth={1}
        />
      ))}
      {RINGS.map((radius, index) => (
        <circle
          key={`guest-${radius}`}
          cx={GUEST.x}
          cy={GUEST.y}
          r={radius}
          fill="none"
          stroke={TONE.reach}
          strokeOpacity={0.14 + index * 0.06}
          strokeWidth={1}
        />
      ))}
      <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="none" stroke={TONE.fit} strokeWidth={1.6} />
      <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="none" stroke={TONE.reach} strokeWidth={1.6} />

      <path
        d={FIT_PATH}
        fill="none"
        stroke={TONE.fit}
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd="url(#v9e-ov-head-fit)"
      />
      <path
        d={LOVE_PATH}
        fill="none"
        stroke={TONE.love}
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd="url(#v9e-ov-head-love)"
      />

      <path
        d={`M 868 492 C 846 452, 800 424, 742 410`}
        fill="none"
        stroke={TONE.reach}
        strokeWidth={1.2}
        strokeOpacity={0.8}
      />
      <circle cx={740} cy={410} r={4} fill={TONE.reach} />

      <circle cx={SHOW.x} cy={SHOW.y} r={9} fill={TONE.fit} />
      <circle cx={GUEST.x} cy={GUEST.y} r={9} fill={TONE.reach} />

      <g className={styles.diagramLabel}>
        <text x={(SHOW.x + GUEST.x) / 2} y={46} textAnchor="middle" fill={TONE.fit} style={halo}>
          Fit
        </text>
        <text x={(SHOW.x + GUEST.x) / 2} y={548} textAnchor="middle" fill={TONE.love} style={halo}>
          Love back
        </text>
        <text x={944} y={532} textAnchor="end" fill={TONE.reach} style={halo}>
          Reach
        </text>
      </g>
      <g className={styles.diagramNote}>
        <text x={SHOW.x - 22} y={SHOW.y + 6} textAnchor="end" fill={INK} style={halo}>
          Your show
        </text>
        <text x={GUEST.x + 22} y={GUEST.y + 6} textAnchor="start" fill={INK} style={halo}>
          A guest
        </text>
        <text x={SHOW.x - RADIUS} y={68} textAnchor="start" fill={SOFT}>
          Your listeners
        </text>
        <text x={GUEST.x + RADIUS} y={68} textAnchor="end" fill={SOFT}>
          The guest&apos;s fans
        </text>
      </g>
    </svg>
  );
}
