"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { ECHO_EVENT, ECHO_LIFE, type EchoDetail } from "./echo-field";
import { SCORE_HUE, VOICE_STEP, VOICE_THICK, voiceBars } from "./hud";
import { useReveal } from "./reveal";

type Part = "fit" | "love" | "reach";

const TERMS: { part: Part; term: string; color: string; means: string }[] = [
  { part: "fit", term: "Fit", color: SCORE_HUE.fit, means: "Your listeners tend to love them" },
  { part: "love", term: "Love back", color: SCORE_HUE.love_back, means: "Their fans tend to love your show" },
  { part: "reach", term: "Reach", color: SCORE_HUE.reach, means: "Their fans are new to you" },
];

const BARS = 200;
const HEIGHT = 40;
const SHAPE = voiceBars(0.9, 0.9, 0.9, BARS, HEIGHT);
const RAISED = 0.85 * (HEIGHT - 2);
const WAVE_PERIOD = 2.4;
const WAVE_LAG = 0.025;
const RIPPLE_PERIOD = 1.2;
const RIPPLE_LENGTH = 50;
const LENS_WIDTH = 11;
const SETTLE = 0.12;
const KICK = 0.14;

export function ScoreTerms() {
  const svg = useRef<SVGSVGElement>(null);
  const pointer = useRef<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const voice = svg.current;
    if (!voice || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rects = Array.from(voice.querySelectorAll("rect"));
    let frame = 0;
    let last = performance.now();
    let lens = 0;
    let centre = 0;
    let echoes: (EchoDetail & { at: number })[] = [];

    const hear = (event: Event) => {
      const { detail } = event as CustomEvent<EchoDetail>;
      echoes = [...echoes, { ...detail, at: performance.now() / 1000 }];
    };
    window.addEventListener(ECHO_EVENT, hear);

    const tick = (now: number) => {
      const time = now / 1000;
      const ease = 1 - Math.exp(-Math.min(now - last, 100) / 1000 / SETTLE);
      last = now;
      const target = pointer.current;
      lens += ((target === null ? 0 : 1) - lens) * ease;
      if (target !== null) centre = lens < 0.02 ? target : centre + (target - centre) * ease;
      if (echoes.length && time - echoes[0].at > 2 * ECHO_LIFE) echoes = echoes.slice(1);
      const box = echoes.length ? voice.getBoundingClientRect() : null;

      rects.forEach((rect, index) => {
        const distance = Math.abs(index - centre);
        const wave = Math.cos((2 * Math.PI * (time - index * WAVE_LAG)) / WAVE_PERIOD);
        const ripple = Math.cos(2 * Math.PI * (time / RIPPLE_PERIOD - distance / RIPPLE_LENGTH));
        const swing = 0.775 + 0.225 * (wave + (ripple - wave) * lens);
        const base = SHAPE[index].height * swing;
        const pull = lens * Math.exp(-((distance / LENS_WIDTH) ** 2));
        const kick = box
          ? echoes.reduce((sum, { x, y, speed, at }) => {
              const arrival =
                Math.hypot(
                  box.left + scrollX + ((index + 0.5) / BARS) * box.width - x,
                  box.top + scrollY + box.height / 2 - y,
                ) / speed;
              const late = (time - at - arrival) / KICK;
              return sum + 0.5 * Math.exp(-late * late - arrival / ECHO_LIFE);
            }, 0)
          : 0;
        const lensed = base + (Math.max(SHAPE[index].height, RAISED) - base) * pull;
        const height = Math.min(lensed + (Math.min(SHAPE[index].height * 1.5 + 3, HEIGHT) - base) * kick, HEIGHT);
        rect.setAttribute("y", String((HEIGHT - height) / 2));
        rect.setAttribute("height", String(height));
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(ECHO_EVENT, hear);
    };
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
        className="block h-24 w-full md:h-48"
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
      <ol className="mt-6 grid grid-cols-1 gap-x-8 gap-y-8 px-4 sm:px-6 md:mt-0 md:grid-cols-3">
        {TERMS.map((entry, index) => (
          <Term key={entry.part} {...entry} order={index} dimmed={active !== null && active !== index} />
        ))}
      </ol>
    </div>
  );
}

const MOVE = "transition duration-700 ease-(--ease-out) motion-reduce:transition-none";

function Term({
  part,
  term,
  color,
  means,
  order,
  dimmed,
}: (typeof TERMS)[number] & { order: number; dimmed: boolean }) {
  const [ref, shown] = useReveal<HTMLLIElement>();
  const delay = order * 180;
  return (
    <li
      ref={ref}
      className="flex flex-col transition-opacity duration-300 md:items-center"
      style={{ opacity: dimmed ? 0.35 : 1 }}
    >
      <span
        aria-hidden
        className={`hidden h-5 w-px origin-top md:block ${MOVE} ${shown ? "scale-y-100" : "scale-y-0"}`}
        style={{ background: color, transitionDelay: `${delay}ms` }}
      />
      <span
        aria-hidden
        className={`hidden size-1.5 rounded-full md:block ${MOVE} ${shown ? "scale-100" : "scale-0"}`}
        style={{ background: color, transitionDelay: `${delay + 300}ms` }}
      />
      <div className="flex items-center gap-4 md:mt-4 md:flex-col md:gap-3 md:text-center">
        <Overlap part={part} shown={shown} delay={delay} className="h-24 w-auto shrink-0 md:h-32 xl:h-36" />
        <div
          className={`flex max-w-[40ch] flex-col md:items-center ${MOVE} ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
          style={{ transitionDelay: `${delay + 500}ms` }}
        >
          <h3 className="font-display text-xl leading-none font-semibold md:text-2xl" style={{ color }}>
            {term}
          </h3>
          <p className="mt-2 leading-snug text-ink-soft">{means}</p>
        </div>
      </div>
    </li>
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

function Overlap({
  part,
  shown,
  delay,
  className = "",
}: {
  part: Part;
  shown: boolean;
  delay: number;
  className?: string;
}) {
  const color = SCORE_HUE[part === "love" ? "love_back" : part];
  const id = `overlap-${part}`;
  const arrow = ARROW[part];
  const after = (wait: number) => ({ transitionDelay: `${delay + wait}ms` });
  const side = (shift: number) => ({
    ...after(150),
    transform: shown ? "none" : `translateX(${shift}px)`,
    opacity: shown ? 1 : 0,
    transitionDuration: "900ms",
  });
  return (
    <svg aria-hidden viewBox="36 6 168 148" className={`block overflow-visible ${className}`}>
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

      <g className={MOVE} style={{ ...after(800), opacity: shown ? 1 : 0 }}>
        {part === "reach" ? (
          <g mask={`url(#${id}-outside)`}>
            <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={color} fillOpacity="0.12" />
            <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={`url(#${id}-hatch)`} fillOpacity="0.7" />
          </g>
        ) : (
          <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={color} fillOpacity="0.2" clipPath={`url(#${id}-show)`} />
        )}
      </g>

      {[
        { at: SHOW, label: "You", labelX: SHOW.x - 36, shift: -24 },
        { at: GUEST, label: "Guest", labelX: GUEST.x + 36, shift: 24 },
      ].map(({ at, label, labelX, shift }) => (
        <g key={label} className={MOVE} style={side(shift)}>
          <circle
            cx={at.x}
            cy={at.y}
            r={RADIUS}
            fill="none"
            stroke="var(--ink-dim)"
            strokeOpacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={at.x} cy={at.y} r="5" fill="var(--ink)" />
          <text x={labelX} y="150" className="tag" fill="var(--ink-dim)" textAnchor="middle" style={{ fontSize: 18 }}>
            {label}
          </text>
        </g>
      ))}

      {arrow && (
        <>
          <path
            d={arrow}
            pathLength={1}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="1 1"
            className={MOVE}
            style={{
              ...after(1000),
              strokeDashoffset: shown ? 0 : 1,
              opacity: shown ? 1 : 0,
              transitionProperty: "stroke-dashoffset, opacity",
              transitionDuration: "600ms",
            }}
          />
          <path
            d={arrow}
            fill="none"
            stroke="none"
            strokeWidth="2"
            markerEnd={`url(#${id}-tip)`}
            className={MOVE}
            style={{ ...after(1450), opacity: shown ? 1 : 0, transitionDuration: "250ms" }}
          />
        </>
      )}
    </svg>
  );
}
