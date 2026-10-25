import { EMBER, GOLD, hash, PARCHMENT, random, round, SILVER, SKY, starPath, css } from "./atlas";

type Star = { x: number; y: number; r: number };

const CENTER = 320;
const SHOW: Star = { x: 160, y: 300, r: 7 };
const GUEST: Star = { x: 321, y: 318, r: 15 };
const LEFT = { cx: 232, cy: 328, rx: 132, ry: 120 };
const RIGHT = { cx: 410, cy: 312, rx: 132, ry: 120 };

const LISTENERS: Star[] = [
  SHOW,
  { x: 198, y: 238, r: 4 },
  { x: 258, y: 262, r: 3.6 },
  { x: 214, y: 372, r: 4.6 },
  { x: 150, y: 398, r: 3 },
  { x: 272, y: 410, r: 3 },
  { x: 124, y: 344, r: 2.8 },
];

const GUEST_FANS: Star[] = [
  { x: 382, y: 246, r: 3.6 },
  { x: 446, y: 214, r: 4.2 },
  { x: 506, y: 258, r: 5.2 },
  { x: 478, y: 338, r: 4.2 },
  { x: 418, y: 396, r: 3 },
  { x: 528, y: 398, r: 3 },
  { x: 372, y: 362, r: 2.6 },
];

const SHARED: Star[] = [
  { x: 332, y: 262, r: 2.2 },
  { x: 304, y: 376, r: 2.4 },
];

const [, l2, l3, l4, l5, l6, l7] = LISTENERS;
const [g1, g2, g3, g4, g5, g6, g7] = GUEST_FANS;

const LISTENER_LINES: [Star, Star][] = [
  [l7, SHOW],
  [SHOW, l2],
  [l2, l3],
  [l3, GUEST],
  [SHOW, l4],
  [l4, l5],
  [l4, l6],
];

const FAN_LINES: [Star, Star][] = [
  [GUEST, g1],
  [g1, g2],
  [g2, g3],
  [g3, g4],
  [g4, g6],
  [g4, g5],
  [g5, g7],
  [g7, GUEST],
];

const NUMERALS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

type Point = { x: number; y: number };
type Arc = { from: Point; control: Point; to: Point };

const FIT_ARC: Arc = { from: SHOW, control: { x: 238, y: 196 }, to: { x: 313, y: 305 } };
const LOVE_ARC: Arc = { from: { x: 313, y: 331 }, control: { x: 246, y: 430 }, to: { x: 167, y: 310 } };

function arcPath(arc: Arc) {
  return `M${arc.from.x},${arc.from.y} Q${arc.control.x},${arc.control.y} ${arc.to.x},${arc.to.y}`;
}

function arrowHead(arc: Arc, size: number) {
  const dx = arc.to.x - arc.control.x;
  const dy = arc.to.y - arc.control.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const baseX = arc.to.x - ux * size;
  const baseY = arc.to.y - uy * size;
  const wing = size * 0.55;
  return `M${round(baseX - uy * wing)},${round(baseY + ux * wing)} L${arc.to.x},${arc.to.y} L${round(baseX + uy * wing)},${round(baseY - ux * wing)}`;
}

function polar(radius: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return { x: round(CENTER + radius * Math.sin(angle)), y: round(CENTER - radius * Math.cos(angle)) };
}

function Figure({ lines, opacity, color }: { lines: [Star, Star][]; opacity: number; color: string }) {
  return (
    <g stroke={color} strokeOpacity={opacity} strokeWidth="0.9" vectorEffect="non-scaling-stroke">
      {lines.map(([from, to], index) => (
        <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

function Stars({ stars, color, opacity }: { stars: Star[]; color: string; opacity: number }) {
  return (
    <g fill={color} opacity={opacity}>
      {stars.map((star, index) => (
        <path key={index} d={starPath(star.x, star.y, star.r * 1.5)} />
      ))}
    </g>
  );
}

function Regions({ id, strong }: { id: string; strong: boolean }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-left-fill`}>
          <stop offset="0%" stopColor={SILVER} stopOpacity={strong ? 0.09 : 0.06} />
          <stop offset="100%" stopColor={SILVER} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-right-fill`}>
          <stop offset="0%" stopColor={GOLD} stopOpacity={strong ? 0.09 : 0.06} />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse {...ellipse(LEFT)} fill={`url(#${id}-left-fill)`} />
      <ellipse {...ellipse(RIGHT)} fill={`url(#${id}-right-fill)`} />
      <ellipse
        {...ellipse(LEFT)}
        fill="none"
        stroke={SILVER}
        strokeOpacity="0.42"
        strokeWidth="1"
        strokeDasharray="1 4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <ellipse
        {...ellipse(RIGHT)}
        fill="none"
        stroke={GOLD}
        strokeOpacity="0.5"
        strokeWidth="1"
        strokeDasharray="1 4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function ellipse(shape: typeof LEFT) {
  return { cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry };
}

function BrightStar({ id, star, color, scale = 1 }: { id: string; star: Star; color: string; scale?: number }) {
  const ray = 36 * scale;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="35%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={star.x} cy={star.y} r={48 * scale} fill={`url(#${id}-glow)`} className={css.glow} />
      <g stroke={color} strokeWidth="0.7" strokeOpacity="0.6" vectorEffect="non-scaling-stroke">
        <line x1={star.x - ray} y1={star.y} x2={star.x + ray} y2={star.y} vectorEffect="non-scaling-stroke" />
        <line x1={star.x} y1={star.y - ray} x2={star.x} y2={star.y + ray} vectorEffect="non-scaling-stroke" />
      </g>
      <path d={starPath(star.x, star.y, star.r * scale)} fill={color} />
      <circle cx={star.x} cy={star.y} r={2.6 * scale} fill="#fff6e8" />
    </g>
  );
}

export function HeroChart() {
  const next = random(hash("echo-hero-sky"));
  const dust = Array.from({ length: 170 }, (_, index) => {
    const radius = Math.sqrt(next()) * 262;
    const angle = next() * 360;
    const point = polar(radius, angle);
    return { key: index, ...point, r: round(0.35 + next() * 0.9), opacity: round(0.2 + next() * 0.5) };
  });
  const ticks = Array.from({ length: 180 }, (_, index) => {
    const degrees = index * 2;
    const outer = degrees % 30 === 0 ? 284 : degrees % 10 === 0 ? 279 : 274;
    return { key: index, inner: polar(268, degrees), outer: polar(outer, degrees), major: degrees % 30 === 0 };
  });
  return (
    <svg
      viewBox="0 0 640 640"
      role="img"
      aria-label="Two constellations, your listeners and a guest's listeners, overlap. The guest is the bright star where they meet."
      className="block h-auto w-full"
    >
      <defs>
        <clipPath id="hero-disc">
          <circle cx={CENTER} cy={CENTER} r="267" />
        </clipPath>
        <radialGradient id="hero-depth">
          <stop offset="0%" stopColor="#1a2246" />
          <stop offset="70%" stopColor="#10162f" />
          <stop offset="100%" stopColor={SKY} />
        </radialGradient>
      </defs>

      <circle cx={CENTER} cy={CENTER} r="308" fill="none" stroke={SILVER} strokeOpacity="0.22" />
      <circle cx={CENTER} cy={CENTER} r="284" fill="none" stroke={GOLD} strokeOpacity="0.45" />
      <circle cx={CENTER} cy={CENTER} r="268" fill="url(#hero-depth)" stroke={GOLD} strokeOpacity="0.55" />

      <g stroke={GOLD}>
        {ticks.map((tick) => (
          <line
            key={tick.key}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            strokeOpacity={tick.major ? 0.7 : 0.35}
            strokeWidth={tick.major ? 0.9 : 0.6}
          />
        ))}
      </g>

      <g fill={GOLD} fontSize="12.5" textAnchor="middle" className="font-(family-name:--font-atlas-sc)">
        {NUMERALS.map((numeral, index) => {
          const point = polar(296, index * 30);
          return (
            <text
              key={numeral}
              x={point.x}
              y={point.y}
              dominantBaseline="central"
              opacity="0.8"
              transform={`rotate(${index * 30} ${point.x} ${point.y})`}
            >
              {numeral}
            </text>
          );
        })}
      </g>

      <g clipPath="url(#hero-disc)">
        <g fill="none" stroke={SILVER} strokeOpacity="0.1">
          <circle cx={CENTER} cy={CENTER} r="90" strokeDasharray="2 5" />
          <circle cx={CENTER} cy={CENTER} r="180" strokeDasharray="2 5" />
          {Array.from({ length: 6 }, (_, index) => {
            const from = polar(268, index * 30);
            const to = polar(268, index * 30 + 180);
            return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeOpacity="0.06" />;
          })}
        </g>
        <path
          d="M40,452 Q330,330 620,190"
          fill="none"
          stroke={GOLD}
          strokeOpacity="0.28"
          strokeDasharray="5 6"
        />
        {dust.map((star) => (
          <circle key={star.key} cx={star.x} cy={star.y} r={star.r} fill={SILVER} opacity={star.opacity} />
        ))}
        <Regions id="hero" strong />
        <Figure lines={LISTENER_LINES} opacity={0.5} color={SILVER} />
        <Figure lines={FAN_LINES} opacity={0.55} color={GOLD} />
        <Stars stars={LISTENERS} color={SILVER} opacity={0.95} />
        <Stars stars={GUEST_FANS} color={GOLD} opacity={0.95} />
        <Stars stars={SHARED} color={PARCHMENT} opacity={0.7} />
        <BrightStar id="hero" star={GUEST} color={EMBER} />
      </g>

      <g
        className="font-(family-name:--font-atlas-serif)"
        fontStyle="italic"
        stroke="#141a38"
        strokeWidth="5"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        <text x={SHOW.x} y={SHOW.y - 20} textAnchor="middle" fontSize="17" fill={PARCHMENT}>
          Your show
        </text>
        <text x={GUEST.x + 26} y={GUEST.y - 30} fontSize="19" fill={EMBER}>
          The guest
        </text>
        <text x="478" y="186" textAnchor="middle" fontSize="17" fill={GOLD}>
          New ears
        </text>
      </g>
      <g className="font-(family-name:--font-atlas-sc)" fontSize="13" letterSpacing="2.6">
        <text x="214" y="474" textAnchor="middle" fill={SILVER} opacity="0.85">
          your listeners
        </text>
        <text x="430" y="458" textAnchor="middle" fill={GOLD} opacity="0.9">
          {"the guest’s listeners"}
        </text>
      </g>
    </svg>
  );
}

export type PlateKind = "fit" | "love" | "reach" | "sweet";

export function Plate({ kind }: { kind: PlateKind }) {
  const id = `plate-${kind}`;
  const sweet = kind === "sweet";
  const showFit = kind === "fit" || sweet;
  const showLove = kind === "love" || sweet;
  const showReach = kind === "reach" || sweet;
  const dim = sweet ? 0.8 : 0.68;
  return (
    <svg viewBox="36 168 528 300" aria-hidden className="block h-auto w-full">
      <defs>
        <pattern id={`${id}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={GOLD} strokeWidth="1.1" strokeOpacity={sweet ? 0.4 : 0.7} />
        </pattern>
        <clipPath id={`${id}-right`}>
          <ellipse {...ellipse(RIGHT)} />
        </clipPath>
        <mask id={`${id}-beyond-left`}>
          <rect x="0" y="0" width="640" height="640" fill="white" />
          <ellipse {...ellipse(LEFT)} fill="black" />
        </mask>
      </defs>

      {showReach && (
        <g clipPath={`url(#${id}-right)`}>
          <rect x="0" y="0" width="640" height="640" fill={`url(#${id}-hatch)`} mask={`url(#${id}-beyond-left)`} />
        </g>
      )}
      <Regions id={id} strong={false} />
      <Figure lines={LISTENER_LINES} opacity={0.34 * dim + 0.1} color={SILVER} />
      <Figure lines={FAN_LINES} opacity={0.34 * dim + 0.1} color={GOLD} />
      <Stars stars={LISTENERS} color={SILVER} opacity={dim} />
      <Stars stars={GUEST_FANS} color={GOLD} opacity={kind === "reach" ? 1 : dim} />
      <Stars stars={SHARED} color={PARCHMENT} opacity={dim * 0.8} />

      {showFit && (
        <g stroke={SILVER} strokeWidth="1.6" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke">
          <path d={arcPath(FIT_ARC)} vectorEffect="non-scaling-stroke" />
          <path d={arrowHead(FIT_ARC, 13)} vectorEffect="non-scaling-stroke" />
        </g>
      )}
      {showLove && (
        <g stroke={GOLD} strokeWidth="1.6" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke">
          <path d={arcPath(LOVE_ARC)} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          <path d={arrowHead(LOVE_ARC, 13)} vectorEffect="non-scaling-stroke" />
        </g>
      )}

      {sweet ? (
        <BrightStar id={id} star={GUEST} color={EMBER} scale={0.9} />
      ) : (
        <path d={starPath(GUEST.x, GUEST.y, 11)} fill={PARCHMENT} />
      )}
      <path d={starPath(SHOW.x, SHOW.y, 12)} fill={PARCHMENT} />

      <g
        className="font-(family-name:--font-atlas-serif)"
        fontStyle="italic"
        fontSize="27"
        stroke="#111734"
        strokeWidth="8"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        <text x={SHOW.x - 17} y={SHOW.y + 8} textAnchor="end" fill={PARCHMENT}>
          Your show
        </text>
        <text x={GUEST.x + 18} y={GUEST.y - 26} fill={sweet ? EMBER : PARCHMENT}>
          {sweet ? "Sweet spot" : "The guest"}
        </text>
        {kind === "reach" && (
          <text x="494" y="300" textAnchor="middle" fill={GOLD} fontSize="28">
            New ears
          </text>
        )}
      </g>
    </svg>
  );
}
