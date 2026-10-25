import type { CSSProperties } from "react";

import { SCORE_HUE, texture, voiceHue } from "./hud";

const SIZE = 640;
const SHOW = { x: 218, y: 404 };
const GUEST = { x: 468, y: 206 };

const round = (value: number) => Math.round(value * 10) / 10;

function carriedWave() {
  const dx = GUEST.x - SHOW.x;
  const dy = GUEST.y - SHOW.y;
  const length = Math.hypot(dx, dy);
  const across = { x: -dy / length, y: dx / length };
  const steps = 160;
  const points: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const swell = Math.sin(Math.PI * t) ** 0.9 * (1 - 0.3 * t);
    const offset = 30 * swell * Math.sin(2 * Math.PI * 6.5 * t);
    points.push(
      `${step === 0 ? "M" : "L"}${round(SHOW.x + dx * t + across.x * offset)} ${round(SHOW.y + dy * t + across.y * offset)}`,
    );
  }
  return points.join(" ");
}

const CARRIED = carriedWave();

const AWAY = Math.atan2(GUEST.y - SHOW.y, GUEST.x - SHOW.x);

const NEW_EARS = Array.from({ length: 26 }, (_, index) => {
  const angle = AWAY + (texture(index + 7) - 0.5) * 2.3;
  const distance = 118 + texture(index + 31) * 70;
  return {
    x: round(GUEST.x + Math.cos(angle) * distance),
    y: round(GUEST.y + Math.sin(angle) * distance),
    r: round(2.2 + texture(index + 53) * 2.6),
    opacity: round(0.45 + texture(index + 71) * 0.55),
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

export function Ripples({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-square ${className}`}>
      <svg aria-hidden viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient
            id="ripples-carry"
            gradientUnits="userSpaceOnUse"
            x1={SHOW.x}
            y1={SHOW.y}
            x2={GUEST.x}
            y2={GUEST.y}
          >
            <stop offset="0" stopColor={SCORE_HUE.fit} />
            <stop offset="0.55" stopColor={SCORE_HUE.love_back} />
            <stop offset="1" stopColor={SCORE_HUE.reach} />
          </linearGradient>
          <radialGradient id="ripples-show">
            <stop offset="0" stopColor={SCORE_HUE.fit} stopOpacity="0.55" />
            <stop offset="1" stopColor={SCORE_HUE.fit} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ripples-guest">
            <stop offset="0" stopColor={SCORE_HUE.love_back} stopOpacity="0.5" />
            <stop offset="0.55" stopColor={SCORE_HUE.reach} stopOpacity="0.16" />
            <stop offset="1" stopColor={SCORE_HUE.reach} stopOpacity="0" />
          </radialGradient>
        </defs>

        {SHOW_RINGS.map((radius, index) => (
          <circle
            key={radius}
            cx={SHOW.x}
            cy={SHOW.y}
            r={radius}
            fill="none"
            stroke={SCORE_HUE.fit}
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
            stroke={voiceHue(index / 6)}
            strokeWidth={2}
            className="ripple"
            style={ringStyle(8, -index * 2, 0.75, (index + 1) / 4.6)}
          />
        ))}

        <circle cx={GUEST.x} cy={GUEST.y} r={150} fill="url(#ripples-guest)" className="glow" />

        {GUEST_RINGS.map((radius, index) => (
          <circle
            key={radius}
            cx={GUEST.x}
            cy={GUEST.y}
            r={radius}
            fill="none"
            stroke={SCORE_HUE.reach}
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
            stroke={index === 1 ? SCORE_HUE.love_back : SCORE_HUE.reach}
            strokeWidth={1.6}
            className="ripple"
            style={ringStyle(6, -index * 2 - 1, 0.65, (index + 1) / 3.4)}
          />
        ))}

        {NEW_EARS.map((dot, index) => (
          <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill={SCORE_HUE.reach} fillOpacity={dot.opacity} />
        ))}

        <path d={CARRIED} fill="none" stroke="url(#ripples-carry)" strokeWidth={6} strokeOpacity={0.18} />
        <path d={CARRIED} fill="none" stroke="url(#ripples-carry)" strokeWidth={2.4} strokeLinecap="round" />
        <path
          d={CARRIED}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeOpacity={0.6}
          className="carry"
        />

        <circle cx={SHOW.x} cy={SHOW.y} r={70} fill="url(#ripples-show)" className="glow" />
        <circle cx={SHOW.x} cy={SHOW.y} r={17} fill={SCORE_HUE.fit} />
        <circle cx={SHOW.x} cy={SHOW.y} r={7} fill="var(--void)" />
        <circle cx={GUEST.x} cy={GUEST.y} r={14} fill={SCORE_HUE.reach} />
        <circle cx={GUEST.x} cy={GUEST.y} r={5.5} fill="var(--void)" />
      </svg>

      <Tag x={SHOW.x} y={SHOW.y + 34} color={SCORE_HUE.fit}>
        Your show
      </Tag>
      <Tag x={GUEST.x} y={GUEST.y - 62} color={SCORE_HUE.reach}>
        A guest
      </Tag>
      <Tag x={496} y={318} color={SCORE_HUE.love_back} quiet>
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
      className={`absolute -translate-x-1/2 rounded-full px-3 py-1 font-display text-xs font-semibold whitespace-nowrap sm:text-sm ${
        quiet ? "bg-void/80" : "text-on-hue"
      }`}
      style={{
        left: percent(x),
        top: percent(y),
        background: quiet ? undefined : color,
        color: quiet ? color : undefined,
        boxShadow: quiet ? `inset 0 0 0 1px color-mix(in srgb, ${color} 40%, transparent)` : undefined,
      }}
    >
      {children}
    </span>
  );
}
