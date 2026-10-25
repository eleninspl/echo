import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import type { Show } from "@/lib/echo";


export const css = {
  sky: "a07-sky",
  ruler: "a07-ruler",
  frame: "a07-frame",
  corners: "a07-corners",
  field: "a07-field",
  twinkle: "a07-twinkle",
  glow: "a07-glow",
  rise: "a07-rise",
  pulse: "a07-pulse",
  sweep: "a07-sweep",
};

export const SKY = "#0b1022";
export const SILVER = "#c6ccdc";
export const GOLD = "#d8c08c";
export const EMBER = "#f2a65e";
export const PARCHMENT = "#efe8d8";
export const MIST = "#a7adc2";

export const SERIF = "font-(family-name:--font-atlas-serif)";
export const SMALL_CAPS = "font-(family-name:--font-atlas-sc)";

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function hash(text: string): number {
  let state = 2166136261;
  for (let index = 0; index < text.length; index++) {
    state ^= text.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

export function random(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function starPath(x: number, y: number, radius: number): string {
  const corners: string[] = [];
  for (let index = 0; index < 16; index++) {
    const angle = (index * Math.PI) / 8 - Math.PI / 2;
    const length = index % 2 === 1 ? radius * 0.17 : index % 4 === 0 ? radius : radius * 0.48;
    corners.push(`${round(x + length * Math.cos(angle))},${round(y + length * Math.sin(angle))}`);
  }
  return `M${corners.join("L")}Z`;
}

export function Starfield({ seed, count }: { seed: string; count: number }) {
  const next = random(hash(seed));
  const stars = Array.from({ length: count }, (_, index) => {
    const bright = next() > 0.94;
    return {
      key: index,
      x: round(next() * 100),
      y: round(next() * 100),
      radius: round(bright ? 0.9 + next() * 0.7 : 0.35 + next() * 0.55),
      opacity: round(bright ? 0.7 + next() * 0.3 : 0.18 + next() * 0.5),
      gold: next() > 0.86,
      twinkles: next() > 0.82,
      delay: round(next() * 8),
      duration: round(4 + next() * 6),
    };
  });
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      {stars.map((star) => (
        <circle
          key={star.key}
          cx={`${star.x}%`}
          cy={`${star.y}%`}
          r={star.radius}
          fill={star.gold ? GOLD : SILVER}
          className={star.twinkles ? css.twinkle : undefined}
          style={
            {
              opacity: star.opacity,
              "--star-opacity": star.opacity,
              "--twinkle-delay": `${star.delay}s`,
              "--twinkle-duration": `${star.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`${SMALL_CAPS} text-[0.95rem] font-semibold tracking-[0.22em] text-(--atlas-gold) lowercase ${className}`}>
      {children}
    </p>
  );
}

export function SectionHead({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-end gap-x-12 gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="flex flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2
          id={id}
          className={`${SERIF} text-[clamp(2.1rem,3.6vw,3.25rem)] leading-[1.02] font-light text-balance text-(--atlas-parchment)`}
        >
          {title}
        </h2>
      </div>
      {children && <div className="text-[0.975rem] leading-relaxed text-(--atlas-mist)">{children}</div>}
    </div>
  );
}

export function Rule({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative ${className}`}>
      <div className="h-px bg-(--atlas-line)" />
      <div className={`${css.ruler} mt-px`} />
    </div>
  );
}

export function ShowMark({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <span
        className="relative block shrink-0 border border-(--atlas-line-strong) p-[3px]"
        style={{ width: size, height: size }}
      >
        <Image
          src={show.image_url}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  return <ShowConstellation seed={show.id + show.title} initial={show.title.trim().charAt(0)} size={size} />;
}

function ShowConstellation({ seed, initial, size }: { seed: string; initial: string; size: number }) {
  const next = random(hash(seed));
  const dust = Array.from({ length: 14 }, (_, index) => ({
    key: index,
    x: round(10 + next() * 80),
    y: round(10 + next() * 80),
    radius: round(0.5 + next() * 0.6),
  }));
  const count = 5 + Math.floor(next() * 3);
  const stars = Array.from({ length: count }, (_, index) => ({
    key: index,
    x: round(20 + next() * 60),
    y: round(20 + next() * 58),
    radius: round(2.2 + next() * 3.4),
  }));
  const chain = [stars[0]];
  const left = stars.slice(1);
  while (left.length) {
    const last = chain[chain.length - 1];
    let nearest = 0;
    left.forEach((star, index) => {
      const distance = (star.x - last.x) ** 2 + (star.y - last.y) ** 2;
      const best = (left[nearest].x - last.x) ** 2 + (left[nearest].y - last.y) ** 2;
      if (distance < best) nearest = index;
    });
    chain.push(left.splice(nearest, 1)[0]);
  }
  const brightest = stars.reduce((best, star) => (star.radius > best.radius ? star : best), stars[0]);
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="block shrink-0"
      style={{ width: size, height: size }}
    >
      <rect x="0.5" y="0.5" width="99" height="99" fill="#0e1430" stroke={SILVER} strokeOpacity="0.32" />
      <rect x="5" y="5" width="90" height="90" fill="none" stroke={SILVER} strokeOpacity="0.14" />
      {dust.map((star) => (
        <circle key={star.key} cx={star.x} cy={star.y} r={star.radius} fill={SILVER} opacity="0.35" />
      ))}
      <polyline
        points={chain.map((star) => `${star.x},${star.y}`).join(" ")}
        fill="none"
        stroke={GOLD}
        strokeOpacity="0.55"
        strokeWidth="0.8"
      />
      {stars.map((star) => (
        <path
          key={star.key}
          d={starPath(star.x, star.y, star.radius)}
          fill={star === brightest ? GOLD : SILVER}
          opacity={star === brightest ? 1 : 0.85}
        />
      ))}
      <text
        x="89"
        y="91"
        textAnchor="end"
        fill={GOLD}
        opacity="0.7"
        fontSize="13"
        className="font-(family-name:--font-atlas-sc)"
      >
        {initial.toLowerCase()}
      </text>
    </svg>
  );
}

export function StarGlyph({ size = 14, color = EMBER, className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <path d={starPath(10, 10, 9.5)} fill={color} />
    </svg>
  );
}
