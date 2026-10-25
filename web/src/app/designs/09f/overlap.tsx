import { styles } from "./styles";
import { CREAM, TONE } from "./wave";

const SHOW = { x: 200, y: 270 };
const GUEST = { x: 380, y: 270 };
const RADIUS = 144;
const WIDTH = 580;
const HEIGHT = 540;
const GROUND = "#1b1020";

const FIT_PATH = `M ${SHOW.x + 4} ${SHOW.y - 22} C ${SHOW.x + 20} 70, ${GUEST.x - 20} 70, ${GUEST.x - 6} ${GUEST.y - 30}`;
const LOVE_PATH = `M ${GUEST.x - 4} ${GUEST.y + 22} C ${GUEST.x - 20} 470, ${SHOW.x + 20} 470, ${SHOW.x + 6} ${SHOW.y + 30}`;

const halo = { paintOrder: "stroke", stroke: GROUND, strokeWidth: 8, strokeLinejoin: "round" } as const;

export function Overlap() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-labelledby="v9f-overlap-title v9f-overlap-desc"
      className="h-auto w-full"
      focusable="false"
    >
      <title id="v9f-overlap-title">Your listeners and the guest&apos;s fans, overlapping</title>
      <desc id="v9f-overlap-desc">
        Fit runs from your show to the guest. Love back runs from the guest to your show. Reach is the part of the
        guest&apos;s audience your show doesn&apos;t have yet.
      </desc>
      <defs>
        <clipPath id="v9f-ov-inside-show">
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} />
        </clipPath>
        <mask id="v9f-ov-outside-show">
          <rect width={WIDTH} height={HEIGHT} fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS + 4} fill="black" />
        </mask>
        <pattern id="v9f-ov-dots" width="13" height="13" patternUnits="userSpaceOnUse">
          <circle cx="6.5" cy="6.5" r="2.6" fill={TONE.reach} />
        </pattern>
        <marker
          id="v9f-ov-head-fit"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill={TONE.fit} />
        </marker>
        <marker
          id="v9f-ov-head-love"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill={TONE.love} />
        </marker>
      </defs>

      <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill={TONE.fit} fillOpacity={0.16} />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="url(#v9f-ov-dots)"
        fillOpacity={0.9}
        mask="url(#v9f-ov-outside-show)"
      />
      <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={TONE.love} clipPath="url(#v9f-ov-inside-show)" />

      <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="none" stroke={TONE.fit} strokeWidth={5} />
      <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="none" stroke={TONE.reach} strokeWidth={5} />

      <path
        id="v9f-ov-fit"
        d={FIT_PATH}
        fill="none"
        stroke={TONE.fit}
        strokeWidth={7}
        strokeLinecap="round"
        markerEnd="url(#v9f-ov-head-fit)"
      />
      <path
        id="v9f-ov-love"
        d={LOVE_PATH}
        fill="none"
        stroke={TONE.love}
        strokeWidth={7}
        strokeLinecap="round"
        markerEnd="url(#v9f-ov-head-love)"
      />
      <circle r={7} fill={CREAM} className={styles.traveler}>
        <animateMotion dur="2.6s" repeatCount="indefinite" rotate="auto">
          <mpath href="#v9f-ov-fit" />
        </animateMotion>
      </circle>
      <circle r={7} fill={CREAM} className={styles.traveler}>
        <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" rotate="auto">
          <mpath href="#v9f-ov-love" />
        </animateMotion>
      </circle>

      <circle cx={SHOW.x} cy={SHOW.y} r={14} fill={TONE.fit} stroke={GROUND} strokeWidth={4} />
      <circle cx={GUEST.x} cy={GUEST.y} r={14} fill={TONE.reach} stroke={GROUND} strokeWidth={4} />

      <g className={styles.poster} style={{ textTransform: "uppercase" }}>
        <text x={(SHOW.x + GUEST.x) / 2} y={62} textAnchor="middle" fontSize={40} fill={TONE.fit} style={halo}>
          Fit
        </text>
        <text
          x={(SHOW.x + GUEST.x) / 2}
          y={510}
          textAnchor="middle"
          fontSize={40}
          fill={TONE.love}
          style={halo}
        >
          Love back
        </text>
        <text x={572} y={92} textAnchor="end" fontSize={40} fill={TONE.reach}>
          Reach
        </text>
        <text x={SHOW.x - 26} y={SHOW.y + 8} textAnchor="end" fontSize={26} fill={CREAM} style={halo}>
          Your show
        </text>
        <text x={GUEST.x + 26} y={GUEST.y + 8} textAnchor="start" fontSize={26} fill={CREAM} style={halo}>
          Guest
        </text>
      </g>
      <path d="M548 104 C 540 140, 520 170, 488 196" fill="none" stroke={TONE.reach} strokeWidth={3} />
      <circle cx={485} cy={199} r={6} fill={TONE.reach} />
    </svg>
  );
}
