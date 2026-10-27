"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { VOICE_STEP, VOICE_THICK, voiceBars } from "./hud";

const LENS = 5;
const SWELL = 0.35;
const RIPPLE = 0.14;
const RIPPLE_PERIOD = 1.1;
const RIPPLE_LENGTH = 9;
const SETTLE = 0.1;
const DIM = 0.35;

const lobeAt = (along: number) => Math.min(Math.floor(along * 3), 2);

// A guest's three scores as one voiceprint: a lobe each for fit, love back and reach, as tall as the score.
// With no reach score the last third is a dotted line, never a made-up lobe. Under the pointer the bars swell
// and ripple, and the lobe there stays lit while the other two dim.
export function Voiceprint({
  fit,
  love,
  reach,
  bars = 36,
  height = 32,
  className = "",
  lit = null,
  onLobe,
}: {
  fit: number;
  love: number;
  reach: number | null;
  bars?: number;
  height?: number;
  className?: string;
  lit?: number | null;
  onLobe?: (lobe: number | null) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const pointer = useRef<number | null>(null);
  const frame = useRef(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = lit ?? hovered;
  const middle = height / 2;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useEffect(() => {
    if (hovered === null) return;
    const away = () => {
      pointer.current = null;
      setHovered(null);
      onLobe?.(null);
    };
    window.addEventListener("scroll", away, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", away, { capture: true });
  }, [hovered, onLobe]);

  function hover(lobe: number | null) {
    if (lobe === hovered) return;
    setHovered(lobe);
    onLobe?.(lobe);
  }

  function run() {
    const element = svg.current;
    if (frame.current || !element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rects = Array.from(element.querySelectorAll<SVGRectElement>("rect"));
    let last = performance.now();
    let lens = 0;
    let centre = pointer.current ?? 0;
    const tick = (now: number) => {
      const ease = 1 - Math.exp(-Math.min(now - last, 100) / 1000 / SETTLE);
      last = now;
      const target = pointer.current;
      lens += ((target === null ? 0 : 1) - lens) * ease;
      if (target !== null) centre += (target - centre) * ease;
      const time = now / 1000;
      rects.forEach((rect) => {
        const base = Number(rect.dataset.h);
        const distance = Math.abs(Number(rect.dataset.i) - centre);
        const near = Math.exp(-((distance / LENS) ** 2));
        const wave = Math.cos(2 * Math.PI * (time / RIPPLE_PERIOD - distance / RIPPLE_LENGTH));
        const reachOut = Math.exp(-((distance / (LENS * 2.5)) ** 2));
        const swollen = Math.min(base * (1 + lens * (SWELL * near + RIPPLE * wave * reachOut)), height);
        rect.setAttribute("y", String(middle - swollen / 2));
        rect.setAttribute("height", String(swollen));
      });
      if (target === null && lens < 0.01) {
        rects.forEach((rect) => {
          rect.setAttribute("y", String(middle - Number(rect.dataset.h) / 2));
          rect.setAttribute("height", rect.dataset.h ?? "0");
        });
        frame.current = 0;
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  function follow(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const along = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 0.999);
    pointer.current = along * bars - 0.5;
    hover(lobeAt(along));
    run();
  }

  function leave() {
    pointer.current = null;
    hover(null);
  }

  return (
    <svg
      ref={svg}
      aria-hidden
      viewBox={`0 0 ${bars * VOICE_STEP} ${height}`}
      className={`block h-auto touch-pan-y ${className}`}
      onPointerMove={follow}
      onPointerDown={follow}
      onPointerLeave={leave}
      onPointerCancel={leave}
    >
      {voiceBars(fit, love, reach, bars, height).map(({ x, height: h, color, silent }, index) => {
        const dim = active !== null && lobeAt((index + 0.5) / bars) !== active;
        const style = { opacity: (silent ? 0.55 : 1) * (dim ? DIM : 1), transition: "opacity 200ms ease-out" };
        return silent ? (
          <circle key={index} cx={x + VOICE_THICK / 2} cy={middle} r={VOICE_THICK / 2.4} fill={color} style={style} />
        ) : (
          <rect
            key={index}
            data-i={index}
            data-h={h}
            x={x}
            y={middle - h / 2}
            width={VOICE_THICK}
            height={h}
            rx={VOICE_THICK / 2}
            fill={color}
            style={style}
          />
        );
      })}
    </svg>
  );
}
