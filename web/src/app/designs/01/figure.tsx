import { styles } from "./styles";

const SHOW = { x: 270, y: 236, r: 150 };
const GUEST = { x: 450, y: 236, r: 150 };

function Marker({
  x,
  y,
  n,
  className = "",
}: {
  x: number;
  y: number;
  n: number;
  className?: string;
}) {
  return (
    <g className={className}>
      <circle cx={x} cy={y} r={16} fill="var(--ink)" />
      <text
        x={x}
        y={y + 7}
        textAnchor="middle"
        className={styles.display}
        fontSize={22}
        fill="var(--paper)"
      >
        {n}
      </text>
    </g>
  );
}

export function AudienceFigure() {
  return (
    <svg
      viewBox="0 0 720 476"
      role="img"
      aria-labelledby="d01-figure-title"
      className="block h-auto w-full overflow-visible"
    >
      <title id="d01-figure-title">
        Two overlapping circles, your show&apos;s audience and the guest&apos;s
        audience. An arrow runs from the show to the guest, marked fit. An arrow
        runs back from the guest to the show, marked love back. The part of the
        guest&apos;s audience outside the show&apos;s circle is shaded and
        marked reach.
      </title>
      <defs>
        <pattern
          id="d01-hatch"
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
            stroke="var(--ink)"
            strokeWidth="1.1"
            strokeOpacity="0.42"
          />
        </pattern>
        <mask id="d01-outside-show">
          <rect width="720" height="470" fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={SHOW.r} fill="black" />
        </mask>
        <clipPath id="d01-inside-show">
          <circle cx={SHOW.x} cy={SHOW.y} r={SHOW.r} />
        </clipPath>
        <marker
          id="d01-arrowhead"
          viewBox="0 0 12 12"
          refX="9"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path
            d="M1 1.5 L10 6 L1 10.5"
            fill="none"
            stroke="var(--red)"
            strokeWidth="1.8"
          />
        </marker>
      </defs>

      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={GUEST.r}
        fill="url(#d01-hatch)"
        mask="url(#d01-outside-show)"
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={GUEST.r}
        fill="var(--paper-deep)"
        clipPath="url(#d01-inside-show)"
      />
      <circle
        cx={SHOW.x}
        cy={SHOW.y}
        r={SHOW.r}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={GUEST.r}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />

      <text
        x="190"
        y="226"
        textAnchor="middle"
        className={`${styles.display} italic`}
        fontSize="28"
        fill="var(--ink)"
      >
        <tspan x="192">Your show&apos;s</tspan>
        <tspan x="192" dy="31">
          listeners
        </tspan>
      </text>
      <text
        x="530"
        y="226"
        textAnchor="middle"
        className={`${styles.display} ${styles.halo} italic`}
        fontSize="28"
        fill="var(--ink)"
      >
        <tspan x="530">The guest&apos;s</tspan>
        <tspan x="530" dy="31">
          fans
        </tspan>
      </text>
      <text
        x="360"
        y="238"
        textAnchor="middle"
        className={styles.sans}
        fontSize="11.5"
        fontWeight="600"
        letterSpacing="2"
        fill="var(--ink-soft)"
      >
        SHARED
      </text>
      <text
        x="360"
        y="255"
        textAnchor="middle"
        className={styles.sans}
        fontSize="11.5"
        fontWeight="600"
        letterSpacing="2"
        fill="var(--ink-soft)"
      >
        TASTE
      </text>

      <path
        d="M 196 150 C 270 30, 450 30, 524 150"
        fill="none"
        stroke="var(--red)"
        strokeWidth="1.8"
        pathLength={1}
        className={styles.draw}
      />
      <path
        d="M 196 150 C 270 30, 450 30, 524 150"
        fill="none"
        stroke="transparent"
        markerEnd="url(#d01-arrowhead)"
        className={styles.arrive}
      />
      <path
        d="M 524 322 C 450 442, 270 442, 196 322"
        fill="none"
        stroke="var(--red)"
        strokeWidth="1.8"
        pathLength={1}
        className={styles.drawLate}
      />
      <path
        d="M 524 322 C 450 442, 270 442, 196 322"
        fill="none"
        stroke="transparent"
        markerEnd="url(#d01-arrowhead)"
        className={styles.arriveLate}
      />

      <Marker x={360} y={60} n={1} />
      <text
        x="384"
        y="42"
        className={`${styles.display} ${styles.halo} italic`}
        fontSize="28"
        fill="var(--red)"
      >
        Fit
      </text>
      <Marker x={360} y={412} n={2} />
      <text
        x="384"
        y="450"
        className={`${styles.display} ${styles.halo} italic`}
        fontSize="28"
        fill="var(--red)"
      >
        Love back
      </text>

      <line
        x1="570"
        y1="156"
        x2="616"
        y2="106"
        stroke="var(--ink)"
        strokeWidth="1"
      />
      <Marker x={626} y={94} n={3} />
      <text
        x="650"
        y="103"
        className={`${styles.display} italic`}
        fontSize="28"
        fill="var(--ink)"
      >
        Reach
      </text>
    </svg>
  );
}
