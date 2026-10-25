"use client";

import { useState, type CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { Keyed, Marker } from "./marks";
import { GROUND, INK, LABEL_NAME, LINE, MUTED, TONE, out100, ordinal } from "./palette";
import { useWidth } from "./runs";

type Box = { left: number; top: number; width: number; height: number };
type Dot = { guest: Guest; rank: number; cx: number; cy: number; r: number };
type Note = { dot: Dot; lead: string; rest: string };
type Placed = Note & { box: Box; align: "left" | "right"; anchor: { x: number; y: number } };

const TICKS = [0, 0.25, 0.5, 0.75, 1];

export function FitLoveChart({ guests }: { guests: Guest[] }) {
  const [measure, width] = useWidth();
  const [active, setActive] = useState<string | null>(null);
  const measured = width > 0 ? width : 1000;
  const wide = measured >= 760;
  const radiusMax = wide ? 17 : 12;
  const left = 30;
  const right = 6;
  const top = 10;
  const bottom = 26;
  const plotWidth = measured - left - right;
  const plotHeight = wide
    ? Math.min(500, Math.max(340, plotWidth * 0.44))
    : Math.min(400, Math.max(280, plotWidth * 1.02));
  const height = top + plotHeight + bottom;
  const pad = radiusMax + 2;
  const x = (value: number) => left + pad + value * (plotWidth - pad * 2);
  const y = (value: number) => top + pad + (1 - value) * (plotHeight - pad * 2);
  const plotRight = left + plotWidth;
  const plotBottom = top + plotHeight;

  const dots: Dot[] = guests.map((guest, index) => ({
    guest,
    rank: index + 1,
    cx: x(guest.scores.fit),
    cy: y(guest.scores.love_back),
    r: guest.scores.reach === null ? 6 : Math.max(3, radiusMax * Math.sqrt(guest.scores.reach)),
  }));
  const drawOrder = [...dots].sort((a, b) => b.r - a.r);

  const zoneLabel: Box = { left: x(0.5) + 8, top: top + 8, width: wide ? 196 : 150, height: 36 };
  const notes = pickNotes(dots);
  const annotated = new Set(notes.map((note) => note.dot.guest.ref));
  const named = dots.filter((dot) => dot.guest.label === "sweet_spot" && !annotated.has(dot.guest.ref));
  const nameBoxes = named.map((dot) => nameBox(dot, plotRight));
  const placed = wide && width > 0 ? place(notes, dots, [zoneLabel, ...nameBoxes], { left, top, right: plotRight, bottom: plotBottom }) : [];
  const hovered = dots.find((dot) => dot.guest.ref === active) ?? null;

  return (
    <div>
      <p className="mb-2 text-[0.84rem] font-semibold">
        <Keyed part="love">Love back</Keyed>
        {wide ? ": the guest's fans lean toward your show" : ""} ↑
      </p>
      <div ref={measure} className="relative">
        <svg
          viewBox={`0 0 ${measured} ${height}`}
          className="block h-auto w-full overflow-visible"
          role="group"
          aria-label="Fit against love back for each guest. Dot size is reach."
        >
          <rect
            x={x(0.5)}
            y={top}
            width={plotRight - x(0.5)}
            height={y(0.33) - top}
            fill={INK}
            fillOpacity={0.05}
          />
          {TICKS.map((tick) => (
            <g key={tick}>
              <line x1={x(tick)} y1={top} x2={x(tick)} y2={plotBottom} stroke={LINE} strokeWidth={1} />
              <line x1={left} y1={y(tick)} x2={plotRight} y2={y(tick)} stroke={LINE} strokeWidth={1} />
              <text
                x={x(tick)}
                y={plotBottom + 17}
                textAnchor="middle"
                fontSize={11.5}
                fill={MUTED}
                className="w5-numbers"
              >
                {Math.round(tick * 100)}
              </text>
              <text
                x={left - 6}
                y={y(tick)}
                dy="0.35em"
                textAnchor="end"
                fontSize={11.5}
                fill={MUTED}
                className="w5-numbers"
              >
                {Math.round(tick * 100)}
              </text>
            </g>
          ))}
          <line x1={left} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={INK} strokeOpacity={0.6} strokeWidth={1} />
          <line x1={x(0.5)} y1={top} x2={x(0.5)} y2={plotBottom} stroke={INK} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="3 3" />
          <line x1={left} y1={y(0.33)} x2={plotRight} y2={y(0.33)} stroke={INK} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="3 3" />
          <text x={left - 6} y={y(0.33)} dy="0.35em" textAnchor="end" fontSize={11.5} fontWeight={700} fill={INK} className="w5-numbers">
            33
          </text>

          <text x={zoneLabel.left} y={zoneLabel.top + 12} fontSize={13} fontWeight={700} fill={INK}>
            Sweet spot zone
          </text>
          <text x={zoneLabel.left} y={zoneLabel.top + 29} fontSize={12} fill={INK} fillOpacity={0.8}>
            {wide ? "Fit 50+, love back 33+, and reach 33+" : "Fit 50+, love back 33+"}
          </text>

          {drawOrder.map((dot) => (
            <GuestDot
              key={dot.guest.ref}
              dot={dot}
              active={active === dot.guest.ref}
              onActive={setActive}
            />
          ))}

          {named.map((dot, index) => {
            const box = nameBoxes[index];
            return (
              <text
                key={dot.guest.ref}
                x={box.left}
                y={box.top + 12}
                fontSize={12.5}
                fontWeight={700}
                fill={INK}
                stroke={GROUND}
                strokeWidth={3}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {dot.guest.name}
              </text>
            );
          })}

          {placed.map((note) => (
            <line
              key={note.dot.guest.ref}
              x1={edge(note.dot, note.anchor).x}
              y1={edge(note.dot, note.anchor).y}
              x2={note.anchor.x}
              y2={note.anchor.y}
              stroke={INK}
              strokeWidth={1}
            />
          ))}

          {!wide &&
            width > 0 &&
            tagSpots(notes, dots, [zoneLabel, ...nameBoxes]).map((spot, index) => (
              <NumberTag key={notes[index].dot.guest.ref} dot={notes[index].dot} at={spot} number={index + 1} />
            ))}
        </svg>

        {placed.map((note) => (
          <p
            key={note.dot.guest.ref}
            className={`absolute text-[0.86rem] leading-[1.35] text-(--w5-soft) ${note.align === "right" ? "text-right" : ""}`}
            style={{ left: note.box.left, top: note.box.top, width: note.box.width }}
          >
            <strong className="font-semibold text-(--w5-ink)">{note.lead}</strong> {note.rest}
          </p>
        ))}

        {hovered && width > 0 && <Tooltip dot={hovered} width={measured} />}
      </div>
      <p className="mt-1 text-right text-[0.84rem] font-semibold">
        <Keyed part="fit">Fit</Keyed>
        {wide ? ": your listeners lean toward the guest" : ""} →
      </p>

      {!wide && width > 0 && notes.length > 0 && (
        <ol className="mt-4 flex flex-col gap-2.5 text-[0.92rem] leading-[1.4] text-(--w5-soft)">
          {notes.map((note, index) => (
            <li key={note.dot.guest.ref} className="flex gap-3">
              <Marker number={index + 1} className="mt-px" />
              <p className="min-w-0 flex-1">
                <strong className="font-semibold text-(--w5-ink)">{note.lead}</strong> {note.rest}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function SizeKey() {
  const big = 17;
  const mid = 17 * Math.sqrt(0.33);
  return (
    <svg viewBox="0 0 276 44" className="block h-auto w-[276px] shrink-0" role="img" aria-label="Dot size is reach: a full dot is reach 100, a smaller one reach 33, a dashed ring means reach was not scored.">
      <circle cx={big + 1} cy={20} r={big} fill={TONE.reach} fillOpacity={0.22} stroke={TONE.reach} strokeOpacity={0.65} />
      <text x={big * 2 + 6} y={24} fontSize={12} fill={INK} className="w5-numbers">
        Reach 100
      </text>
      <circle cx={124} cy={20} r={mid} fill={TONE.reach} fillOpacity={0.22} stroke={TONE.reach} strokeOpacity={0.65} />
      <text x={124 + mid + 5} y={24} fontSize={12} fill={INK} className="w5-numbers">
        33
      </text>
      <circle cx={192} cy={20} r={6} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="2 2" />
      <text x={203} y={24} fontSize={12} fill={INK}>
        Not scored
      </text>
    </svg>
  );
}

function GuestDot({
  dot,
  active,
  onActive,
}: {
  dot: Dot;
  active: boolean;
  onActive: (ref: string | null) => void;
}) {
  const { guest, cx, cy, r } = dot;
  const sweet = guest.label === "sweet_spot";
  const unscored = guest.scores.reach === null;
  const reach = guest.scores.reach;
  return (
    <g
      tabIndex={0}
      role="img"
      aria-label={`${guest.name}, ranked ${ordinal(dot.rank)}, ${LABEL_NAME[guest.label]}: fit ${out100(guest.scores.fit)}, love back ${out100(guest.scores.love_back)}, reach ${reach === null ? "not scored" : out100(reach)}.`}
      className="w5-dot cursor-default outline-none"
      style={{ "--order": dot.rank } as CSSProperties}
      onMouseEnter={() => onActive(guest.ref)}
      onMouseLeave={() => onActive(null)}
      onFocus={() => onActive(guest.ref)}
      onBlur={() => onActive(null)}
    >
      <circle cx={cx} cy={cy} r={Math.max(r + 4, 12)} fill="transparent" />
      {unscored ? (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={GROUND}
          stroke={sweet ? INK : MUTED}
          strokeWidth={1.6}
          strokeDasharray="2 2"
        />
      ) : sweet ? (
        <circle cx={cx} cy={cy} r={r} fill={TONE.reach} stroke={GROUND} strokeWidth={2} />
      ) : (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={TONE.reach}
          fillOpacity={0.2}
          stroke={TONE.reach}
          strokeOpacity={0.6}
          strokeWidth={1}
        />
      )}
      {active && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={INK} strokeWidth={1.5} />}
    </g>
  );
}

function NumberTag({ dot, at, number }: { dot: Dot; at: { x: number; y: number }; number: number }) {
  const from = edge(dot, at);
  return (
    <g aria-hidden pointerEvents="none">
      <line x1={from.x} y1={from.y} x2={at.x} y2={at.y} stroke={INK} strokeWidth={1} />
      <circle cx={at.x} cy={at.y} r={9} fill={INK} stroke={GROUND} strokeWidth={2} />
      <text x={at.x} y={at.y} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={700} fill={GROUND} className="w5-numbers">
        {number}
      </text>
    </g>
  );
}

function tagSpots(notes: Note[], dots: Dot[], obstacles: Box[]) {
  const taken: Box[] = [];
  return notes.map((note) => {
    const { cx, cy, r } = note.dot;
    const reach = r * 0.72 + 10;
    const options = [
      { x: cx + reach, y: cy - reach },
      { x: cx - reach, y: cy - reach },
      { x: cx + reach, y: cy + reach },
      { x: cx - reach, y: cy + reach },
    ];
    let best = options[0];
    let bestCost = Infinity;
    options.forEach((option, order) => {
      const box = { left: option.x - 10, top: option.y - 10, width: 20, height: 20 };
      let cost = order * 4;
      for (const dot of dots) {
        if (dot === note.dot) continue;
        cost += overlap(box, { left: dot.cx - dot.r, top: dot.cy - dot.r, width: dot.r * 2, height: dot.r * 2 });
      }
      for (const obstacle of [...obstacles, ...taken]) cost += overlap(box, obstacle) * 3;
      if (cost < bestCost) {
        bestCost = cost;
        best = option;
      }
    });
    taken.push({ left: best.x - 10, top: best.y - 10, width: 20, height: 20 });
    return best;
  });
}

function Tooltip({ dot, width }: { dot: Dot; width: number }) {
  const { guest } = dot;
  const boxWidth = 250;
  const leftSide = dot.cx + dot.r + 12 + boxWidth > width;
  const reach = guest.scores.reach;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 border border-(--w5-ink) bg-(--w5-paper) px-3 py-2 text-[0.82rem] leading-snug"
      style={{
        width: boxWidth,
        top: Math.max(0, dot.cy - 30),
        left: leftSide ? dot.cx - dot.r - 12 - boxWidth : dot.cx + dot.r + 12,
      }}
    >
      <p className="font-bold text-(--w5-ink)">
        {guest.name}
        <span className="font-normal text-(--w5-muted)">
          , ranked {ordinal(dot.rank)}. {LABEL_NAME[guest.label]}
        </span>
      </p>
      <p className="w5-numbers mt-1 flex flex-wrap gap-x-3 text-(--w5-soft)">
        <Keyed part="fit">Fit {out100(guest.scores.fit)}</Keyed>
        <Keyed part="love">Love back {out100(guest.scores.love_back)}</Keyed>
        <Keyed part="reach">Reach {reach === null ? "n/a" : out100(reach)}</Keyed>
      </p>
    </div>
  );
}

function nameBox(dot: Dot, plotRight: number): Box {
  const width = dot.guest.name.length * 7.4 + 4;
  const rightSide = dot.cx + dot.r + 6 + width < plotRight;
  return {
    left: rightSide ? dot.cx + dot.r + 5 : dot.cx - dot.r - 5 - width,
    top: dot.cy - 8,
    width,
    height: 16,
  };
}

function pickNotes(dots: Dot[]): Note[] {
  const notes: Note[] = [];
  const sweet =
    dots.find((dot) => dot.guest.label === "sweet_spot" && dot.guest.scores.reach !== null) ??
    dots.find((dot) => dot.guest.label === "sweet_spot");
  if (sweet) {
    const { fit, love_back, reach } = sweet.guest.scores;
    notes.push({
      dot: sweet,
      lead: `${sweet.guest.name},`,
      rest:
        reach === null
          ? `ranked ${ordinal(sweet.rank)}: fit ${out100(fit)} and love back ${out100(love_back)}, reach not scored.`
          : `ranked ${ordinal(sweet.rank)}, clears all three bars: fit ${out100(fit)}, love back ${out100(love_back)}, reach ${out100(reach)}.`,
    });
  }
  const safe = dots.find((dot) => dot.guest.label === "safe");
  if (safe) {
    notes.push({
      dot: safe,
      lead: `${safe.guest.name}:`,
      rest: `loved both ways, but adds few new ears. Reach ${out100(safe.guest.scores.reach ?? 0)}.`,
    });
  }
  const far = dots
    .filter((dot) => dot.guest.label === "far")
    .sort((a, b) => (b.guest.scores.reach ?? 0) - (a.guest.scores.reach ?? 0))[0];
  if (far) {
    const topReach = Math.max(...dots.map((dot) => dot.guest.scores.reach ?? 0));
    const most = (far.guest.scores.reach ?? 0) >= topReach;
    notes.push({
      dot: far,
      lead: `${far.guest.name}:`,
      rest: `${most ? "the most new ears in the run" : "many new ears"}, but love back is ${out100(far.guest.scores.love_back)}. They may not stay.`,
    });
  }
  const long = dots
    .filter((dot) => dot.guest.label === "long_shot")
    .sort((a, b) => b.guest.scores.love_back - a.guest.scores.love_back)[0];
  if (long) {
    notes.push({
      dot: long,
      lead: `${long.guest.name}:`,
      rest: `their fans lean toward your show (love back ${out100(long.guest.scores.love_back)}), but your listeners don't lean their way (fit ${out100(long.guest.scores.fit)}).`,
    });
  }
  return notes;
}

function overlap(a: Box, b: Box) {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

function place(
  notes: Note[],
  dots: Dot[],
  obstacles: Box[],
  frame: { left: number; top: number; right: number; bottom: number },
): Placed[] {
  const width = 206;
  const placed: Placed[] = [];
  for (const note of notes) {
    const characters = note.lead.length + note.rest.length + 1;
    const height = Math.ceil((characters * 6.7) / width) * 18.5 + 2;
    const { cx, cy, r } = note.dot;
    const near = r + 16;
    const far = r + 44;
    const right = (gap: number, top: number) => ({
      box: { left: cx + gap, top, width, height },
      align: "left" as const,
      anchor: { x: cx + gap - 3, y: top + 9 },
    });
    const left = (gap: number, top: number) => ({
      box: { left: cx - gap - width, top, width, height },
      align: "right" as const,
      anchor: { x: cx - gap + 3, y: top + 9 },
    });
    const candidates = [
      right(near, cy - r - 22),
      right(near, cy + r * 0.4 + 6),
      left(near, cy - r - 22),
      left(near, cy + r * 0.4 + 6),
      right(far, cy - r - 40),
      right(far, cy + r + 18),
      left(far, cy - r - 40),
      left(far, cy + r + 18),
    ];
    let best = candidates[0];
    let bestCost = Infinity;
    candidates.forEach((candidate, order) => {
      const { box } = candidate;
      if (box.left < frame.left + 4 || box.top < frame.top + 2) return;
      if (box.left + box.width > frame.right - 2 || box.top + box.height > frame.bottom - 4) return;
      let cost = order * 6;
      for (const dot of dots) {
        cost += overlap(box, { left: dot.cx - dot.r - 4, top: dot.cy - dot.r - 4, width: dot.r * 2 + 8, height: dot.r * 2 + 8 });
      }
      for (const obstacle of obstacles) cost += overlap(box, obstacle) * 3;
      for (const other of placed) cost += overlap(box, { ...other.box, left: other.box.left - 8, top: other.box.top - 8, width: other.box.width + 16, height: other.box.height + 16 }) * 6;
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
      }
    });
    placed.push({ ...note, ...best });
  }
  return placed;
}

function edge(dot: Dot, toward: { x: number; y: number }) {
  const dx = toward.x - dot.cx;
  const dy = toward.y - dot.cy;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: dot.cx + (dx / distance) * (dot.r + 2), y: dot.cy + (dy / distance) * (dot.r + 2) };
}
