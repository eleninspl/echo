"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { SCORE_HUE, VOICE_STEP, VOICE_THICK, voiceBars } from "./hud";

type Part = "fit" | "love" | "reach";

const TERMS: { part: Part; term: string; color: string; path: string; means: string }[] = [
  {
    part: "fit",
    term: "Fit",
    color: SCORE_HUE.fit,
    path: "Your show to the guest",
    means: "Your listeners over-index on the guest, beyond what the guest's fame alone explains.",
  },
  {
    part: "love",
    term: "Love back",
    color: SCORE_HUE.love_back,
    path: "The guest to your show",
    means: "The guest's fans over-index on your show, so the people they bring have a reason to stay.",
  },
  {
    part: "reach",
    term: "Reach",
    color: SCORE_HUE.reach,
    path: "Fans you don't have yet",
    means: "The guest's fans are new to you: the podcasts they favour are ones your audience doesn't.",
  },
];

const BARS = 144;
const HEIGHT = 40;
const SHAPE = voiceBars(0.9, 0.9, 0.9, BARS, HEIGHT);
const RAISED = 0.85 * (HEIGHT - 2);
const WAVE_PERIOD = 2.4;
const WAVE_LAG = 0.035;
const RIPPLE_PERIOD = 1.2;
const RIPPLE_LENGTH = 36;
const LENS_WIDTH = 8;
const SETTLE = 0.12;

export function ScoreTerms() {
  const svg = useRef<SVGSVGElement>(null);
  const pointer = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!svg.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rects = Array.from(svg.current.querySelectorAll("rect"));
    let frame = 0;
    let last = performance.now();
    let lens = 0;
    let centre = 0;

    const tick = (now: number) => {
      const time = now / 1000;
      const ease = 1 - Math.exp(-Math.min(now - last, 100) / 1000 / SETTLE);
      last = now;
      const target = pointer.current;
      lens += ((target === null ? 0 : 1) - lens) * ease;
      if (target !== null) centre = lens < 0.02 ? target : centre + (target - centre) * ease;

      rects.forEach((rect, index) => {
        const distance = Math.abs(index - centre);
        const wave = Math.cos((2 * Math.PI * (time - index * WAVE_LAG)) / WAVE_PERIOD);
        const ripple = Math.cos(2 * Math.PI * (time / RIPPLE_PERIOD - distance / RIPPLE_LENGTH));
        const swing = 0.775 + 0.225 * (wave + (ripple - wave) * lens);
        const base = SHAPE[index].height * swing;
        const pull = lens * Math.exp(-((distance / LENS_WIDTH) ** 2));
        const height = base + (Math.max(SHAPE[index].height, RAISED) - base) * pull;
        rect.setAttribute("y", String((HEIGHT - height) / 2));
        rect.setAttribute("height", String(height));
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  function follow(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const along = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 0.999);
    pointer.current = along * BARS - 0.5;
    setActive(Math.floor(along * TERMS.length));
  }

  function leave() {
    pointer.current = null;
    setActive(null);
  }

  return (
    <div className="flex flex-col">
      <svg
        ref={svg}
        aria-hidden
        viewBox={`0 0 ${BARS * VOICE_STEP} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-28 w-full"
        onPointerMove={follow}
        onPointerLeave={leave}
        onPointerCancel={leave}
      >
        {SHAPE.map(({ x, height, color }, index) => (
          <rect
            key={index}
            x={x}
            y={(HEIGHT - height) / 2}
            width={VOICE_THICK}
            height={height}
            rx={VOICE_THICK / 2}
            fill={color}
          />
        ))}
      </svg>
      <ol className="mt-6 grid grid-cols-1 gap-x-8 gap-y-8 md:mt-0 md:grid-cols-3">
        {TERMS.map(({ part, term, color, path, means }, index) => (
          <li
            key={part}
            className="flex flex-col items-center transition-opacity duration-300"
            style={{ opacity: active === null || active === index ? 1 : 0.35 }}
          >
            <span aria-hidden className="hidden h-5 w-px md:block" style={{ background: color }} />
            <span aria-hidden className="hidden size-1.5 rounded-full md:block" style={{ background: color }} />
            <div className="flex items-center gap-4 md:mt-4 md:flex-col md:gap-3 md:text-center">
              <Overlap part={part} className="h-24 w-auto shrink-0 md:h-32 xl:h-36" />
              <div className="flex max-w-[40ch] flex-col md:items-center">
                <h3 className="font-display text-xl leading-none font-semibold md:text-2xl" style={{ color }}>
                  {term}
                </h3>
                <p className="tag mt-1.5 text-ink-dim">{path}</p>
                <p className="mt-3 leading-snug text-ink-soft">{means}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SHOW = { x: 98, y: 75 };
const GUEST = { x: 142, y: 75 };
const RADIUS = 46;

const ARROW: Record<Part, string | null> = {
  fit: `M ${SHOW.x} ${SHOW.y - 8} C ${SHOW.x + 4} 0, ${GUEST.x - 4} 0, ${GUEST.x} ${GUEST.y - 10}`,
  love: `M ${GUEST.x} ${GUEST.y + 8} C ${GUEST.x - 4} 150, ${SHOW.x + 4} 150, ${SHOW.x} ${SHOW.y + 10}`,
  reach: null,
};

function Overlap({ part, className = "" }: { part: Part; className?: string }) {
  const color = SCORE_HUE[part === "love" ? "love_back" : part];
  const id = `overlap-${part}`;
  const arrow = ARROW[part];
  return (
    <svg aria-hidden viewBox="36 6 168 148" className={`block ${className}`}>
      <defs>
        <clipPath id={`${id}-show`}>
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} />
        </clipPath>
        <mask id={`${id}-outside`}>
          <rect width="240" height="150" fill="#fff" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="#000" />
        </mask>
        <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="1.4" />
        </pattern>
        <marker id={`${id}-tip`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0L10 5L0 10z" fill={color} />
        </marker>
      </defs>

      {part === "reach" ? (
        <g mask={`url(#${id}-outside)`}>
          <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={color} fillOpacity="0.12" />
          <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={`url(#${id}-hatch)`} fillOpacity="0.7" />
        </g>
      ) : (
        <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={color} fillOpacity="0.2" clipPath={`url(#${id}-show)`} />
      )}

      {[SHOW, GUEST].map(({ x, y }) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r={RADIUS}
          fill="none"
          stroke="var(--ink-dim)"
          strokeOpacity="0.7"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {arrow && (
        <path
          d={arrow}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          markerEnd={`url(#${id}-tip)`}
        />
      )}

      <circle cx={SHOW.x} cy={SHOW.y} r="5" fill="var(--ink)" />
      <circle cx={GUEST.x} cy={GUEST.y} r="5" fill="var(--ink)" />

      <g className="tag" fill="var(--ink-dim)" textAnchor="middle" style={{ fontSize: 18 }}>
        <text x={SHOW.x - 36} y="150">
          You
        </text>
        <text x={GUEST.x + 36} y="150">
          Guest
        </text>
      </g>
    </svg>
  );
}
