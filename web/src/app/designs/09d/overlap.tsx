import { styles } from "./styles";
import { TONE } from "./wave";

const SHOW = { x: 196, y: 250 };
const GUEST = { x: 360, y: 250 };
const RADIUS = 132;
const WIDTH = 560;
const HEIGHT = 500;

const FIT_PATH = `M ${SHOW.x + 6} ${SHOW.y - 18} C ${SHOW.x + 18} 50, ${GUEST.x - 18} 50, ${GUEST.x - 6} ${GUEST.y - 24}`;
const LOVE_PATH = `M ${GUEST.x - 6} ${GUEST.y + 18} C ${GUEST.x - 18} 450, ${SHOW.x + 18} 450, ${SHOW.x + 6} ${SHOW.y + 24}`;

const halo = {
  paintOrder: "stroke",
  stroke: "#1b1020",
  strokeWidth: 6,
  strokeLinejoin: "round",
} as const;

export function Overlap() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby="v9d-overlap-title v9d-overlap-desc"
      className="h-auto w-full"
      focusable="false"
    >
      <title id="v9d-overlap-title">Your listeners and the guest&apos;s fans, overlapping</title>
      <desc id="v9d-overlap-desc">
        Fit runs from your show to the guest. Love back runs from the guest to your show. Reach is the part of the
        guest&apos;s audience your show doesn&apos;t have yet.
      </desc>
      <defs>
        <radialGradient id="v9d-ov-show">
          <stop offset="0" stopColor={TONE.fit} stopOpacity="0.3" />
          <stop offset="1" stopColor={TONE.fit} stopOpacity="0.05" />
        </radialGradient>
        <radialGradient id="v9d-ov-guest">
          <stop offset="0" stopColor={TONE.reach} stopOpacity="0.26" />
          <stop offset="1" stopColor={TONE.reach} stopOpacity="0.05" />
        </radialGradient>
        <clipPath id="v9d-ov-inside-show">
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} />
        </clipPath>
        <mask id="v9d-ov-outside-show">
          <rect width={WIDTH} height={HEIGHT} fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="black" />
        </mask>
        <pattern id="v9d-ov-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="1.7" fill={TONE.reach} />
        </pattern>
        <marker
          id="v9d-ov-head-fit"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill={TONE.fit} />
        </marker>
        <marker
          id="v9d-ov-head-love"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill={TONE.love} />
        </marker>
      </defs>

      <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="url(#v9d-ov-show)" />
      <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="url(#v9d-ov-guest)" />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="url(#v9d-ov-dots)"
        fillOpacity={0.75}
        mask="url(#v9d-ov-outside-show)"
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill={TONE.love}
        fillOpacity={0.3}
        clipPath="url(#v9d-ov-inside-show)"
      />

      {[44, 80, 112].map((radius, index) => (
        <circle
          key={`show-${radius}`}
          cx={SHOW.x}
          cy={SHOW.y}
          r={radius}
          fill="none"
          stroke={TONE.fit}
          strokeOpacity={0.5 - index * 0.13}
          strokeDasharray={index === 1 ? "1 5" : undefined}
          strokeLinecap="round"
        />
      ))}
      {[44, 80, 112].map((radius, index) => (
        <circle
          key={`guest-${radius}`}
          cx={GUEST.x}
          cy={GUEST.y}
          r={radius}
          fill="none"
          stroke={TONE.reach}
          strokeOpacity={0.5 - index * 0.13}
          strokeDasharray={index === 1 ? "1 5" : undefined}
          strokeLinecap="round"
        />
      ))}
      <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="none" stroke={TONE.fit} strokeWidth={2} />
      <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="none" stroke={TONE.reach} strokeWidth={2} />

      <path
        id="v9d-ov-fit"
        d={FIT_PATH}
        fill="none"
        stroke={TONE.fit}
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#v9d-ov-head-fit)"
      />
      <path
        id="v9d-ov-love"
        d={LOVE_PATH}
        fill="none"
        stroke={TONE.love}
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#v9d-ov-head-love)"
      />
      <circle r={5} fill="#fff4ec" className={styles.traveler}>
        <animateMotion dur="2.6s" repeatCount="indefinite" rotate="auto">
          <mpath href="#v9d-ov-fit" />
        </animateMotion>
      </circle>
      <circle r={5} fill="#fff4ec" className={styles.traveler}>
        <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" rotate="auto">
          <mpath href="#v9d-ov-love" />
        </animateMotion>
      </circle>

      <circle cx={SHOW.x} cy={SHOW.y} r={11} fill={TONE.fit} />
      <circle cx={GUEST.x} cy={GUEST.y} r={11} fill={TONE.reach} />

      <g className={styles.display} fontWeight={600}>
        <text x={(SHOW.x + GUEST.x) / 2} y={76} textAnchor="middle" fontSize={20} fill={TONE.fit} style={halo}>
          Fit
        </text>
        <text x={(SHOW.x + GUEST.x) / 2} y={444} textAnchor="middle" fontSize={20} fill={TONE.love} style={halo}>
          Love back
        </text>
        <text x={SHOW.x - 22} y={SHOW.y + 6} textAnchor="end" fontSize={17} fill="#fff4ec" style={halo}>
          Your show
        </text>
        <text x={GUEST.x + 22} y={GUEST.y + 6} textAnchor="start" fontSize={17} fill="#fff4ec" style={halo}>
          Guest
        </text>
        <text x={552} y={62} textAnchor="end" fontSize={20} fill={TONE.reach}>
          Reach
        </text>
      </g>
      <path d="M530 74 C 522 112, 498 152, 458 186" fill="none" stroke={TONE.reach} strokeWidth={1.6} />
      <circle cx={455} cy={189} r={4.5} fill={TONE.reach} />

      <g fontSize={16} fill="#dcc7cc">
        <text x={SHOW.x - 46} y={490} textAnchor="middle">
          Your listeners
        </text>
        <text x={GUEST.x + 46} y={490} textAnchor="middle">
          The guest&apos;s fans
        </text>
      </g>
    </svg>
  );
}
