import { AUBERGINE, INK, PAPER, PAPER_DEEP } from "./inks";

const WIDTH = 520;
const HEIGHT = 344;
const RADIUS = 100;
const SHOW = { x: 170, y: 172 };
const GUEST = { x: 282, y: 172 };
const REACH_X = 410;

const FIT_PATH = `M ${SHOW.x - 32} ${SHOW.y - 56} C ${SHOW.x - 10} 56, ${GUEST.x + 10} 56, ${GUEST.x + 30} ${GUEST.y - 58}`;
const LOVE_PATH = `M ${GUEST.x + 32} ${GUEST.y + 56} C ${GUEST.x + 10} 288, ${SHOW.x - 10} 288, ${SHOW.x - 30} ${SHOW.y + 58}`;

function Arrowhead({ id, colour }: { id: string; colour: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="7"
      refY="5"
      markerWidth="5"
      markerHeight="5"
      orient="auto"
    >
      <path d="M0 0 10 5 0 10z" fill={colour} />
    </marker>
  );
}

export function OverlapFigure() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="block h-auto w-full"
      role="img"
      aria-labelledby="w2-overlap-title"
    >
      <title id="w2-overlap-title">
        Two overlapping circles: your listeners and the guest&apos;s fans. Fit
        runs from your show to the guest, love back from the guest to your show,
        and reach is the part of the guest&apos;s fans outside your audience.
      </title>
      <defs>
        <pattern
          id="w2-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke={INK.reach}
            strokeWidth="1.1"
          />
        </pattern>
        <mask id="w2-outside-show">
          <rect width={WIDTH} height={HEIGHT} fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="black" />
        </mask>
        <clipPath id="w2-inside-show">
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} />
        </clipPath>
        <Arrowhead id="w2-head-fit" colour={INK.fit} />
        <Arrowhead id="w2-head-love" colour={INK.love} />
      </defs>

      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="url(#w2-hatch)"
        mask="url(#w2-outside-show)"
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill={PAPER_DEEP}
        clipPath="url(#w2-inside-show)"
      />
      <circle
        cx={SHOW.x}
        cy={SHOW.y}
        r={RADIUS}
        fill="none"
        stroke={AUBERGINE}
        strokeWidth={1.25}
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="none"
        stroke={AUBERGINE}
        strokeWidth={1.25}
      />

      <g fontSize={17} fill={AUBERGINE} className="w2-italic">
        <text x={SHOW.x - 46} y={SHOW.y} textAnchor="middle">
          <tspan x={SHOW.x - 46} dy="-0.2em">
            Your
          </tspan>
          <tspan x={SHOW.x - 46} dy="1.15em">
            listeners
          </tspan>
        </text>
        <text x={(SHOW.x + GUEST.x) / 2} y={SHOW.y} textAnchor="middle">
          <tspan x={(SHOW.x + GUEST.x) / 2} dy="-0.2em">
            in
          </tspan>
          <tspan x={(SHOW.x + GUEST.x) / 2} dy="1.15em">
            common
          </tspan>
        </text>
        <text
          x={GUEST.x + 46}
          y={GUEST.y}
          textAnchor="middle"
          stroke={PAPER}
          strokeWidth={7}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          <tspan x={GUEST.x + 46} dy="-0.2em">
            The guest&apos;s
          </tspan>
          <tspan x={GUEST.x + 46} dy="1.15em">
            fans
          </tspan>
        </text>
      </g>

      <path
        d={FIT_PATH}
        fill="none"
        stroke={INK.fit}
        strokeWidth={2}
        markerEnd="url(#w2-head-fit)"
      />
      <circle cx={SHOW.x - 32} cy={SHOW.y - 56} r={3.5} fill={INK.fit} />
      <path
        d={LOVE_PATH}
        fill="none"
        stroke={INK.love}
        strokeWidth={2}
        markerEnd="url(#w2-head-love)"
      />
      <circle cx={GUEST.x + 32} cy={GUEST.y + 56} r={3.5} fill={INK.love} />

      <g textAnchor="middle">
        <text
          x={(SHOW.x + GUEST.x) / 2}
          y={22}
          fontSize={16}
          fontWeight={600}
          fill={INK.fit}
          className="w2-sans"
        >
          Fit
          <tspan
            fontWeight={400}
            fill={AUBERGINE}
            className="w2-italic"
            dx="0.4em"
          >
            your show to the guest
          </tspan>
        </text>
        <text
          x={(SHOW.x + GUEST.x) / 2}
          y={HEIGHT - 10}
          fontSize={16}
          fontWeight={600}
          fill={INK.love}
          className="w2-sans"
        >
          Love back
          <tspan
            fontWeight={400}
            fill={AUBERGINE}
            className="w2-italic"
            dx="0.4em"
          >
            the guest to your show
          </tspan>
        </text>
      </g>

      <line
        x1={GUEST.x + 68}
        y1={GUEST.y - 40}
        x2={REACH_X - 6}
        y2={58}
        stroke={INK.reach}
        strokeWidth={1}
      />
      <g fontSize={16}>
        <text
          x={REACH_X}
          y={48}
          fontWeight={600}
          fill={INK.reach}
          className="w2-sans"
        >
          Reach
        </text>
        <text x={REACH_X} y={74} fill={AUBERGINE} className="w2-italic">
          <tspan x={REACH_X}>fans you</tspan>
          <tspan x={REACH_X} dy="1.2em">
            don&apos;t have yet
          </tspan>
        </text>
      </g>
    </svg>
  );
}
