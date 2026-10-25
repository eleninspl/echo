import { INK, LIME, PINK, SKY } from "./palette";
import { StampMark } from "./parts";

type Point = [number, number];

const DISPLAY = { fontFamily: "var(--font-d05-display)" };
const MONO = { fontFamily: "var(--font-d05-mono)" };

function lensPath(
  leftX: number,
  rightX: number,
  centerY: number,
  radius: number,
) {
  const middle = (leftX + rightX) / 2;
  const half = Math.sqrt(radius * radius - ((rightX - leftX) / 2) ** 2);
  const top = (centerY - half).toFixed(2);
  const bottom = (centerY + half).toFixed(2);
  return `M${middle} ${top} A${radius} ${radius} 0 0 1 ${middle} ${bottom} A${radius} ${radius} 0 0 1 ${middle} ${top}Z`;
}

function Arrow({
  from,
  bend,
  to,
  color,
  width,
  head,
}: {
  from: Point;
  bend: Point;
  to: Point;
  color: string;
  width: number;
  head: number;
}) {
  const dx = to[0] - bend[0];
  const dy = to[1] - bend[1];
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const tip: Point = [to[0] + ux * head * 0.66, to[1] + uy * head * 0.66];
  const base: Point = [tip[0] - ux * head, tip[1] - uy * head];
  const half = head * 0.62;
  const corners: Point[] = [
    tip,
    [base[0] - uy * half, base[1] + ux * half],
    [base[0] + uy * half, base[1] - ux * half],
  ];
  const points = corners
    .map((corner) => corner.map((value) => value.toFixed(1)).join(","))
    .join(" ");
  const path = `M${from.join(" ")} Q${bend.join(" ")} ${to.join(" ")}`;
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={INK}
        strokeWidth={width + width * 0.9}
        strokeLinecap="round"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={points}
        fill={color}
        stroke={INK}
        strokeWidth={width * 0.45}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Tag({
  x,
  y,
  width,
  text,
  fill,
  color = INK,
  rotate = 0,
  size = 24,
}: {
  x: number;
  y: number;
  width: number;
  text: string;
  fill: string;
  color?: string;
  rotate?: number;
  size?: number;
}) {
  const height = size * 1.7;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect
        x={-width / 2 + 5}
        y={-height / 2 + 5}
        width={width}
        height={height}
        fill={INK}
      />
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill}
        stroke={INK}
        strokeWidth={3.5}
      />
      <text
        y={size * 0.34}
        textAnchor="middle"
        fontSize={size}
        fontWeight={800}
        fill={color}
        style={DISPLAY}
      >
        {text}
      </text>
    </g>
  );
}

export function MatchDiagram() {
  const left = 205;
  const right = 355;
  const center = 250;
  const radius = 150;
  return (
    <svg
      viewBox="0 -24 568 540"
      role="img"
      aria-labelledby="d05-match-title d05-match-desc"
      className="block h-auto w-full"
    >
      <title id="d05-match-title">How Echo matches a guest to your show</title>
      <desc id="d05-match-desc">
        Two overlapping circles, your listeners and the guest&apos;s fans. Fit
        is an arrow from your show to the guest. Love back is an arrow from the
        guest to your show. Reach is the part of the guest&apos;s audience your
        show doesn&apos;t have yet. The sweet spot is high on all three.
      </desc>
      <defs>
        <pattern
          id="d05-hatch-hero"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="12" height="12" fill="#fff" />
          <rect width="3.5" height="12" fill={INK} />
        </pattern>
      </defs>

      <g transform="translate(10 10)" fill={INK}>
        <circle cx={left} cy={center} r={radius} />
        <circle cx={right} cy={center} r={radius} />
      </g>
      <circle cx={left} cy={center} r={radius} fill="#fff" />
      <circle cx={right} cy={center} r={radius} fill={LIME} />
      <path
        d={lensPath(left, right, center, radius)}
        fill="url(#d05-hatch-hero)"
      />
      <circle
        cx={left}
        cy={center}
        r={radius}
        fill="none"
        stroke={INK}
        strokeWidth={4.5}
      />
      <circle
        cx={right}
        cy={center}
        r={radius}
        fill="none"
        stroke={INK}
        strokeWidth={4.5}
      />

      <g textAnchor="middle" fill={INK}>
        <text
          x={128}
          y={214}
          fontSize={13}
          fontWeight={700}
          letterSpacing={1.5}
          style={MONO}
        >
          YOUR SHOW
        </text>
        <text x={128} y={250} fontSize={27} fontWeight={800} style={DISPLAY}>
          Your
        </text>
        <text x={128} y={278} fontSize={27} fontWeight={800} style={DISPLAY}>
          listeners
        </text>

        <text
          x={432}
          y={214}
          fontSize={13}
          fontWeight={700}
          letterSpacing={1.5}
          style={MONO}
        >
          THE GUEST
        </text>
        <text x={432} y={250} fontSize={25} fontWeight={800} style={DISPLAY}>
          Their fans,
        </text>
        <text x={432} y={278} fontSize={25} fontWeight={800} style={DISPLAY}>
          new to you
        </text>
      </g>

      <Tag
        x={432}
        y={322}
        width={104}
        text="Reach"
        fill={INK}
        color={LIME}
        size={21}
        rotate={-3}
      />

      <g transform="translate(280 250)">
        <rect
          x={-52}
          y={-30}
          width={104}
          height={60}
          fill="#fff"
          stroke={INK}
          strokeWidth={3.5}
        />
        <text
          y={-5}
          textAnchor="middle"
          fontSize={20}
          fontWeight={800}
          fill={INK}
          style={DISPLAY}
        >
          Shared
        </text>
        <text
          y={19}
          textAnchor="middle"
          fontSize={20}
          fontWeight={800}
          fill={INK}
          style={DISPLAY}
        >
          taste
        </text>
      </g>

      <Arrow
        from={[148, 98]}
        bend={[280, -22]}
        to={[398, 92]}
        color={SKY}
        width={9}
        head={32}
      />
      <Arrow
        from={[412, 404]}
        bend={[280, 522]}
        to={[162, 408]}
        color={PINK}
        width={9}
        head={32}
      />

      <Tag x={278} y={37} width={86} text="Fit" fill={SKY} rotate={-4} />
      <Tag
        x={282}
        y={464}
        width={150}
        text="Love back"
        fill={PINK}
        rotate={3}
      />

      <g transform="rotate(12 506 52)">
        <StampMark
          x={506}
          y={52}
          radius={54}
          lines={["SWEET", "SPOT"]}
          sizes={[19, 19]}
        />
      </g>
      <text
        x={564}
        y={127}
        textAnchor="end"
        fontSize={13}
        fontWeight={700}
        fill={INK}
        style={MONO}
      >
        all three high
      </text>
    </svg>
  );
}

export type ScoreKind = "fit" | "love_back" | "reach";

export function ScoreGlyph({
  kind,
  className = "",
}: {
  kind: ScoreKind;
  className?: string;
}) {
  const left = 70;
  const right = 130;
  const center = 75;
  const radius = 40;
  const hatch = `d05-hatch-${kind}`;
  return (
    <svg aria-hidden viewBox="0 0 206 152" className={className}>
      <defs>
        <pattern
          id={hatch}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="7" height="7" fill="#fff" />
          <rect width="2.2" height="7" fill={INK} />
        </pattern>
      </defs>
      <g transform="translate(5 5)" fill={INK}>
        <circle cx={left} cy={center} r={radius} />
        <circle cx={right} cy={center} r={radius} />
      </g>
      <circle cx={left} cy={center} r={radius} fill="#fff" />
      <circle
        cx={right}
        cy={center}
        r={radius}
        fill={kind === "reach" ? LIME : "#fff"}
      />
      <path d={lensPath(left, right, center, radius)} fill={`url(#${hatch})`} />
      <circle
        cx={left}
        cy={center}
        r={radius}
        fill="none"
        stroke={INK}
        strokeWidth={3}
      />
      <circle
        cx={right}
        cy={center}
        r={radius}
        fill="none"
        stroke={INK}
        strokeWidth={3}
      />
      <g
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={INK}
        style={MONO}
      >
        <text x={57} y={79}>
          YOU
        </text>
        <text x={143} y={79}>
          GUEST
        </text>
      </g>
      {kind === "fit" && (
        <Arrow
          from={[56, 30]}
          bend={[100, -6]}
          to={[143, 30]}
          color={SKY}
          width={6}
          head={20}
        />
      )}
      {kind === "love_back" && (
        <Arrow
          from={[144, 120]}
          bend={[100, 156]}
          to={[57, 120]}
          color={PINK}
          width={6}
          head={20}
        />
      )}
      {kind === "reach" && (
        <g stroke={INK} strokeWidth={4} strokeLinecap="round">
          <line x1={180} y1={52} x2={192} y2={44} />
          <line x1={184} y1={75} x2={199} y2={75} />
          <line x1={180} y1={98} x2={192} y2={106} />
        </g>
      )}
    </svg>
  );
}
