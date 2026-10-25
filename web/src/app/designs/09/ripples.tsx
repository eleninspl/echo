import type { CSSProperties } from "react";

import { styles } from "./styles";
import { grain, TONE, toneAt } from "./wave";

const SIZE = 640;
const SHOW = { x: 218, y: 404 };
const GUEST = { x: 468, y: 206 };

const round = (value: number) => Math.round(value * 10) / 10;

function carriedWave() {
  const dx = GUEST.x - SHOW.x;
  const dy = GUEST.y - SHOW.y;
  const length = Math.hypot(dx, dy);
  const along = { x: dx / length, y: dy / length };
  const across = { x: -along.y, y: along.x };
  const steps = 160;
  const points: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const swell = Math.sin(Math.PI * t) ** 0.9 * (1 - 0.3 * t);
    const offset = 30 * swell * Math.sin(2 * Math.PI * 6.5 * t);
    const x = SHOW.x + dx * t + across.x * offset;
    const y = SHOW.y + dy * t + across.y * offset;
    points.push(`${step === 0 ? "M" : "L"}${round(x)} ${round(y)}`);
  }
  return points.join(" ");
}

const CARRIED = carriedWave();

const AWAY = Math.atan2(GUEST.y - SHOW.y, GUEST.x - SHOW.x);

const NEW_EARS = Array.from({ length: 26 }, (_, index) => {
  const angle = AWAY + (grain(index + 7) - 0.5) * 2.3;
  const distance = 118 + grain(index + 31) * 70;
  return {
    x: round(GUEST.x + Math.cos(angle) * distance),
    y: round(GUEST.y + Math.sin(angle) * distance),
    r: round(2.2 + grain(index + 53) * 2.6),
    opacity: round(0.45 + grain(index + 71) * 0.55),
  };
}).filter((dot) => dot.x > 8 && dot.x < SIZE - 8 && dot.y > 8 && dot.y < SIZE - 8);

const SHOW_RINGS = [64, 118, 172, 226, 280, 334];
const GUEST_RINGS = [34, 62, 92];

function ringStyle(duration: number, delay: number, peak: number, still: number): CSSProperties {
  return {
    "--ring-duration": `${duration}s`,
    "--ring-delay": `${delay}s`,
    "--ring-peak": peak,
    "--still-scale": still,
    "--still-opacity": peak * (1 - still) + 0.08,
  } as CSSProperties;
}

const percent = (value: number) => `${(value / SIZE) * 100}%`;

export function Ripples() {
  return (
    <div className="relative aspect-square w-full">
      <svg
        aria-hidden
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 size-full overflow-visible"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="e9-carry"
            gradientUnits="userSpaceOnUse"
            x1={SHOW.x}
            y1={SHOW.y}
            x2={GUEST.x}
            y2={GUEST.y}
          >
            <stop offset="0" stopColor={TONE.fit} />
            <stop offset="0.55" stopColor={TONE.love} />
            <stop offset="1" stopColor={TONE.reach} />
          </linearGradient>
          <radialGradient id="e9-show-glow">
            <stop offset="0" stopColor={TONE.fit} stopOpacity="0.55" />
            <stop offset="1" stopColor={TONE.fit} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="e9-guest-glow">
            <stop offset="0" stopColor={TONE.love} stopOpacity="0.5" />
            <stop offset="0.55" stopColor={TONE.reach} stopOpacity="0.16" />
            <stop offset="1" stopColor={TONE.reach} stopOpacity="0" />
          </radialGradient>
        </defs>

        {SHOW_RINGS.map((radius, index) => (
          <circle
            key={radius}
            cx={SHOW.x}
            cy={SHOW.y}
            r={radius}
            fill="none"
            stroke={TONE.fit}
            strokeOpacity={0.34 - index * 0.05}
            strokeWidth={1.2}
            strokeDasharray={index % 2 ? "1 6" : undefined}
            strokeLinecap="round"
          />
        ))}

        {[0, 1, 2, 3].map((index) => (
          <circle
            key={`show-${index}`}
            cx={SHOW.x}
            cy={SHOW.y}
            r={360}
            fill="none"
            stroke={toneAt(index / 6)}
            strokeWidth={2}
            className={styles.ring}
            style={ringStyle(8, -index * 2, 0.75, (index + 1) / 4.6)}
          />
        ))}

        <circle cx={GUEST.x} cy={GUEST.y} r={150} fill="url(#e9-guest-glow)" className={styles.glow} />

        {GUEST_RINGS.map((radius, index) => (
          <circle
            key={radius}
            cx={GUEST.x}
            cy={GUEST.y}
            r={radius}
            fill="none"
            stroke={TONE.reach}
            strokeOpacity={0.7 - index * 0.18}
            strokeWidth={1.4}
          />
        ))}

        {[0, 1, 2].map((index) => (
          <circle
            key={`guest-${index}`}
            cx={GUEST.x}
            cy={GUEST.y}
            r={200}
            fill="none"
            stroke={index === 1 ? TONE.love : TONE.reach}
            strokeWidth={1.6}
            className={styles.ring}
            style={ringStyle(6, -index * 2 - 1, 0.65, (index + 1) / 3.4)}
          />
        ))}

        {NEW_EARS.map((dot, index) => (
          <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill={TONE.reach} fillOpacity={dot.opacity} />
        ))}

        <path d={CARRIED} fill="none" stroke="url(#e9-carry)" strokeWidth={6} strokeOpacity={0.18} />
        <path d={CARRIED} fill="none" stroke="url(#e9-carry)" strokeWidth={2.4} strokeLinecap="round" />
        <path
          d={CARRIED}
          fill="none"
          stroke="#fff4ec"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeOpacity={0.75}
          className={styles.flow}
        />

        <circle cx={SHOW.x} cy={SHOW.y} r={70} fill="url(#e9-show-glow)" className={styles.glow} />
        <circle cx={SHOW.x} cy={SHOW.y} r={17} fill={TONE.fit} />
        <circle cx={SHOW.x} cy={SHOW.y} r={7} fill="#2a0f1f" />
        <circle cx={GUEST.x} cy={GUEST.y} r={14} fill={TONE.reach} />
        <circle cx={GUEST.x} cy={GUEST.y} r={5.5} fill="#2a0f1f" />
      </svg>

      <Tag x={SHOW.x} y={SHOW.y + 34} color={TONE.fit}>
        Your show
      </Tag>
      <Tag x={GUEST.x} y={GUEST.y - 62} color={TONE.reach}>
        A guest
      </Tag>
      <Tag x={496} y={318} color={TONE.love} quiet>
        Their fans, new to you
      </Tag>
    </div>
  );
}

function Tag({
  x,
  y,
  color,
  quiet = false,
  children,
}: {
  x: number;
  y: number;
  color: string;
  quiet?: boolean;
  children: string;
}) {
  return (
    <span
      aria-hidden
      className={`absolute -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap sm:text-sm ${
        quiet ? "bg-[#1b1020]/80" : "text-[#2a0f1f]"
      }`}
      style={{
        left: percent(x),
        top: percent(y),
        background: quiet ? undefined : color,
        color: quiet ? color : undefined,
        boxShadow: quiet ? `inset 0 0 0 1px ${color}66` : undefined,
      }}
    >
      {children}
    </span>
  );
}

export function Strip({ bars = 150 }: { bars?: number }) {
  const width = 1440;
  const height = 96;
  const step = width / bars;
  const thickness = step * 0.5;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className="block h-16 w-full sm:h-24"
      focusable="false"
    >
      {Array.from({ length: bars }, (_, index) => {
        const t = (index + 0.5) / bars;
        const phrase = Math.abs(Math.sin(t * Math.PI * 5.2 + 0.6)) * 0.7 + 0.3;
        const fade = Math.sin(Math.PI * t) ** 0.6;
        const level = Math.max(0.06, phrase * fade * (0.45 + 0.55 * grain(index + 11)));
        const size = level * (height - 4);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(height / 2 - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={toneAt(t)}
            className={styles.bar}
            style={
              {
                "--bar-delay": `${-round(grain(index + 97) * 2.6)}s`,
                "--bar-low": round(0.35 + grain(index + 3) * 0.4),
              } as CSSProperties
            }
          />
        );
      })}
    </svg>
  );
}
