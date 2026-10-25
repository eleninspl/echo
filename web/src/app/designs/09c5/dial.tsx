import type { CSSProperties } from "react";

import type { Guest, Show } from "@/lib/echo";

import { GROUND, INK, LINE, MUTED, PARTS, TONE, scoreOf, type Part } from "./palette";

const GAP = Math.PI / 9;
const SPACER = 1.3;

export type DialFrame = { cx: number; cy: number; radius: number; count: number };

const round = (value: number) => Math.round(value * 100) / 100;

export function dialShape({ radius, count }: DialFrame) {
  const base = radius * 0.44;
  const length = radius * 0.5;
  const span = Math.PI * 2 - GAP;
  const step = span / (Math.max(count, 1) * (3 + SPACER));
  const start = -Math.PI / 2 + GAP / 2;
  const thickness = Math.max(1.2, Math.min(radius * 0.034, step * base * 0.74));
  return { base, length, step, start, thickness };
}

export function polar(frame: DialFrame, distance: number, angle: number) {
  return {
    x: round(frame.cx + Math.cos(angle) * distance),
    y: round(frame.cy + Math.sin(angle) * distance),
  };
}

export function barAngle(frame: DialFrame, guestIndex: number, partIndex: number) {
  const { step, start } = dialShape(frame);
  return start + (guestIndex * (3 + SPACER) + SPACER / 2 + partIndex + 0.5) * step;
}

export function barTip(frame: DialFrame, guest: Guest, guestIndex: number, part: Part) {
  const { base, length } = dialShape(frame);
  const value = scoreOf(guest, part) ?? 0;
  return polar(
    frame,
    base + Math.max(value, 0.03) * length,
    barAngle(frame, guestIndex, PARTS.indexOf(part)),
  );
}

export function spokeTip(frame: DialFrame, guest: Guest, guestIndex: number) {
  const { base, length } = dialShape(frame);
  const top = Math.max(...PARTS.map((part) => scoreOf(guest, part) ?? 0));
  return polar(frame, base + top * length + 6, barAngle(frame, guestIndex, 1));
}

export function sweetMark(frame: DialFrame, guestIndex: number) {
  const { base } = dialShape(frame);
  return polar(frame, base - frame.radius * 0.045, barAngle(frame, guestIndex, 1));
}

function shorten(text: string, limit: number) {
  const clean = text.trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1).trimEnd()}…` : clean;
}

type DialProps = {
  frame: DialFrame;
  guests: Guest[];
  show?: Show | null;
  axis?: boolean;
  caption?: string;
  id: string;
  animate?: boolean;
};

export function DialMarks({ frame, guests, show, axis = false, caption, id, animate = false }: DialProps) {
  const { cx, cy, radius } = frame;
  const { base, length, step, thickness } = dialShape(frame);
  const disc = radius * 0.25;
  const titleSize = radius * 0.085;
  const captionSize = Math.max(9, radius * 0.056);
  const titleRadius = radius * 0.285;
  const captionRadius = radius * 0.335;
  const titleRoom = Math.floor((Math.PI * titleRadius * 0.82) / (titleSize * 0.46));

  return (
    <g>
      <circle cx={cx} cy={cy} r={base} fill="none" stroke={INK} strokeOpacity={0.28} strokeWidth={1} />
      {[0.5, 1].map((level) => (
        <circle
          key={level}
          cx={cx}
          cy={cy}
          r={round(base + level * length)}
          fill="none"
          stroke={LINE}
          strokeWidth={1}
        />
      ))}

      {axis && <DialAxis frame={frame} />}

      {guests.map((guest, guestIndex) => {
        const sweet = guest.label === "sweet_spot";
        const from = polar(frame, base - radius * 0.045, barAngle(frame, guestIndex, 0) - step * 0.45);
        const to = polar(frame, base - radius * 0.045, barAngle(frame, guestIndex, 2) + step * 0.45);
        return (
          <g
            key={guest.ref}
            className={animate ? "w5-spoke" : undefined}
            style={
              animate
                ? ({ "--order": guestIndex, transformOrigin: `${cx}px ${cy}px` } as CSSProperties)
                : undefined
            }
          >
            {PARTS.map((part, partIndex) => {
              const angle = barAngle(frame, guestIndex, partIndex);
              const value = scoreOf(guest, part);
              const inner = polar(frame, base + 1, angle);
              if (value === null) {
                return (
                  <circle
                    key={part}
                    cx={polar(frame, base + thickness, angle).x}
                    cy={polar(frame, base + thickness, angle).y}
                    r={round(thickness * 0.45)}
                    fill="none"
                    stroke={MUTED}
                    strokeWidth={1}
                  />
                );
              }
              const outer = polar(frame, base + Math.max(0.02, value) * length, angle);
              return (
                <line
                  key={part}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={TONE[part]}
                  strokeOpacity={sweet ? 1 : 0.42}
                  strokeWidth={round(thickness)}
                />
              );
            })}
            {sweet && (
              <path
                d={`M ${from.x} ${from.y} A ${round(base - radius * 0.045)} ${round(base - radius * 0.045)} 0 0 1 ${to.x} ${to.y}`}
                fill="none"
                stroke={INK}
                strokeWidth={round(Math.max(1.5, radius * 0.013))}
              />
            )}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={round(disc)} fill={INK} />
      {show?.image_url ? (
        <>
          <clipPath id={`${id}-disc`}>
            <circle cx={cx} cy={cy} r={round(disc - 1)} />
          </clipPath>
          <image
            href={show.image_url}
            x={round(cx - disc)}
            y={round(cy - disc)}
            width={round(disc * 2)}
            height={round(disc * 2)}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${id}-disc)`}
          />
        </>
      ) : (
        show && (
          <text
            x={cx}
            y={cy}
            dy="0.34em"
            textAnchor="middle"
            fontSize={round(radius * 0.26)}
            fontWeight={500}
            fill={GROUND}
            className="w5-serif"
          >
            {show.title.trim().charAt(0).toUpperCase()}
          </text>
        )
      )}

      {show && caption !== undefined && (
        <>
          <path
            id={`${id}-top`}
            d={`M ${round(cx - titleRadius)} ${cy} A ${round(titleRadius)} ${round(titleRadius)} 0 0 1 ${round(cx + titleRadius)} ${cy}`}
            fill="none"
          />
          <path
            id={`${id}-bottom`}
            d={`M ${round(cx - captionRadius)} ${cy} A ${round(captionRadius)} ${round(captionRadius)} 0 0 0 ${round(cx + captionRadius)} ${cy}`}
            fill="none"
          />
          <text fontSize={round(titleSize)} fill={INK} className="w5-serif" fontStyle="italic" fontWeight={500}>
            <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
              {shorten(show.title, titleRoom)}
            </textPath>
          </text>
          <text
            fontSize={round(captionSize)}
            fill={INK}
            fillOpacity={0.78}
            fontWeight={600}
            className="w5-numbers"
          >
            <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
              {caption}
            </textPath>
          </text>
        </>
      )}
    </g>
  );
}

function DialAxis({ frame }: { frame: DialFrame }) {
  const { cx, cy } = frame;
  const { base, length } = dialShape(frame);
  const angle = -Math.PI / 2;
  const from = polar(frame, base, angle);
  const to = polar(frame, base + length, angle);
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={INK} strokeOpacity={0.55} strokeWidth={1} />
      {[0, 0.5, 1].map((level) => {
        const y = round(cy - base - level * length);
        return (
          <g key={level}>
            <line x1={cx - 4} y1={y} x2={cx} y2={y} stroke={INK} strokeOpacity={0.55} strokeWidth={1} />
            <text
              x={cx - 7}
              y={y}
              dy="0.35em"
              textAnchor="end"
              fontSize={10.5}
              fill={MUTED}
              className="w5-numbers"
            >
              {Math.round(level * 100)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
