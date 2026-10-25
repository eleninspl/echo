"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import type { Guest, Show } from "@/lib/echo";

import { DialMarks, sweetMark, spokeTip, type DialFrame } from "./dial";
import { Keyed, Marker } from "./marks";
import {
  INK,
  LINE,
  MUTED,
  PARTS,
  PART_NAME,
  TONE,
  barFor,
  capital,
  countLabel,
  ordinal,
  out100,
  plural,
  runHref,
  scoreOf,
  word,
} from "./palette";
import { useLeadRun, useWidth } from "./runs";

type Note = { key: string; body: ReactNode; target: { x: number; y: number } | null };

export function RunOverview() {
  const run = useLeadRun();
  const [measure, width] = useWidth();
  const ready = run.state === "ready";
  const guests = ready ? run.guests : [];
  const show = ready ? run.item.show : null;
  const sweet = countLabel(guests, "sweet_spot");

  return (
    <figure aria-labelledby="w5-overview-title" className="min-w-0">
      <div className="border-t-2 border-(--w5-ink) pt-3">
        <p id="w5-overview-title" className="text-[1.2rem] leading-snug font-bold text-balance">
          {ready
            ? `${show?.title}: ${guests.length} guests, ${sweet} in the sweet spot`
            : run.state === "loading"
              ? "Loading the latest run"
              : "No finished run to show yet"}
        </p>
        <p className="mt-1 max-w-[60ch] text-[0.98rem] leading-snug text-(--w5-soft)">
          Each spoke is one guest, ranked clockwise from the top. Its bars are <Keyed part="fit">fit</Keyed>,{" "}
          <Keyed part="love">love back</Keyed> and <Keyed part="reach">reach</Keyed>, from 0 at the inner ring to
          100 at the outer.
        </p>
      </div>

      <div ref={measure} className="relative mt-5">
        <OverviewChart width={width} guests={guests} show={show} state={run.state} />
      </div>

      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-(--w5-line) pt-2.5 text-[0.82rem] text-(--w5-muted)">
        <span>
          Source: {ready ? `Echo's run for ${show?.title}` : "Echo"}, from Qloo taste data. Scores are
          percentiles within the run.
        </span>
        {ready && (
          <Link
            href={runHref(run.item.analysis_id)}
            className="font-semibold text-(--w5-ink) underline decoration-1 underline-offset-[3px] hover:decoration-2"
          >
            Open the full run
          </Link>
        )}
      </figcaption>
    </figure>
  );
}

function OverviewChart({
  width,
  guests,
  show,
  state,
}: {
  width: number;
  guests: Guest[];
  show: Show | null;
  state: "loading" | "empty" | "ready";
}) {
  const [notesNode, setNotesNode] = useState<HTMLDivElement | null>(null);
  const [tops, setTops] = useState<number[]>([]);
  useEffect(() => {
    if (!notesNode) return;
    const read = () => {
      const next = Array.from(notesNode.children).map((child) => (child as HTMLElement).offsetTop);
      setTops((previous) =>
        previous.length === next.length && previous.every((top, index) => top === next[index]) ? previous : next,
      );
    };
    const observer = new ResizeObserver(read);
    observer.observe(notesNode);
    Array.from(notesNode.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [notesNode, state, guests.length]);
  const measured = width > 0 ? width : 640;
  const wide = measured >= 560;
  const notesWidth = measured >= 660 ? 224 : 200;
  const gap = 28;
  const size = wide ? Math.min(measured - notesWidth - gap, 470) : Math.min(measured, 440);
  const frame: DialFrame = {
    cx: wide ? size / 2 : measured / 2,
    cy: size / 2,
    radius: size / 2 - 2,
    count: guests.length || 14,
  };
  const sweet = countLabel(guests, "sweet_spot");
  const caption = guests.length
    ? `${guests.length} guests · ${sweet} sweet ${plural(sweet, "spot", "spots")}`
    : undefined;

  const notes = state === "ready" ? buildNotes(frame, guests) : [];
  const placeholder =
    state === "loading"
      ? "Loading the latest run Echo has finished."
      : "There's no finished run to draw right now. Search for your show to start one of your own.";
  const label =
    state === "ready"
      ? `Dial of ${guests.length} guests for ${show?.title}, ${sweet} of them sweet spots.`
      : placeholder;
  const dial = (
    <DialMarks frame={frame} guests={guests} show={show} axis caption={caption} id="w5-overview" animate />
  );

  if (wide) {
    return (
      <div className="relative flex" style={{ gap }}>
        <svg
          role="img"
          aria-label={label}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block shrink-0 overflow-visible"
        >
          {dial}
        </svg>
        <div
          ref={setNotesNode}
          className="flex flex-col justify-between gap-7 text-[0.9rem] leading-[1.4] text-(--w5-soft)"
          style={{ width: notesWidth, minHeight: state === "ready" ? size : undefined }}
        >
          {state === "ready" ? (
            notes.map((note) => <div key={note.key}>{note.body}</div>)
          ) : (
            <p className={`pt-1 ${state === "loading" ? "w5-waiting" : ""}`}>{placeholder}</p>
          )}
        </div>
        {width > 0 && tops.length === notes.length && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
            {notes.map((note, index) =>
              note.target ? (
                <g key={note.key}>
                  <line
                    x1={size + gap - 6}
                    y1={tops[index] + 10}
                    x2={note.target.x}
                    y2={note.target.y}
                    stroke={INK}
                    strokeOpacity={0.7}
                    strokeWidth={1}
                  />
                  <circle cx={note.target.x} cy={note.target.y} r={2.5} fill={INK} />
                </g>
              ) : null,
            )}
          </svg>
        )}
      </div>
    );
  }

  return (
    <>
      <svg role="img" aria-label={label} viewBox={`0 0 ${measured} ${size}`} className="block h-auto w-full overflow-visible">
        {dial}
        {width > 0 &&
          notes.map((note, index) =>
            note.target ? (
              <NumberMark key={note.key} number={index + 1} at={note.target} center={{ x: frame.cx, y: frame.cy }} />
            ) : null,
          )}
      </svg>
      {state === "ready" ? (
        width > 0 && (
          <ol className="mt-5 flex flex-col gap-3 text-[0.92rem] leading-[1.4] text-(--w5-soft)">
            {notes.map((note, index) => (
              <li key={note.key} className="flex gap-3">
                {note.target ? <Marker number={index + 1} className="mt-px" /> : <span className="w-[18px]" />}
                <div className="min-w-0 flex-1">{note.body}</div>
              </li>
            ))}
          </ol>
        )
      ) : (
        <p className={`mt-4 text-[0.95rem] leading-snug text-(--w5-soft) ${state === "loading" ? "w5-waiting" : ""}`}>
          {placeholder}
        </p>
      )}
    </>
  );
}

function pickInset(guests: Guest[]) {
  const sweet = guests.findIndex((guest) => guest.label === "sweet_spot" && guest.scores.reach !== null);
  if (sweet >= 0) return sweet;
  const scored = guests.findIndex((guest) => guest.scores.reach !== null);
  return scored >= 0 ? scored : guests.length ? 0 : -1;
}

function buildNotes(frame: DialFrame, guests: Guest[]): Note[] {
  const notes: Note[] = [];
  const first = guests[0];
  notes.push({
    key: "first",
    target: spokeTip(frame, first, 0),
    body: (
      <p>
        <strong className="font-semibold text-(--w5-ink)">{first.name}</strong> ranks first. The other{" "}
        {guests.length - 1} follow clockwise.
      </p>
    ),
  });

  const insetIndex = pickInset(guests);
  if (insetIndex >= 0) {
    const guest = guests[insetIndex];
    notes.push({
      key: "inset",
      target: spokeTip(frame, guest, insetIndex),
      body: <SpokeInset guest={guest} rank={insetIndex + 1} />,
    });
  }

  let lastSweet = -1;
  guests.forEach((guest, index) => {
    if (guest.label === "sweet_spot") lastSweet = index;
  });
  const sweet = countLabel(guests, "sweet_spot");
  notes.push({
    key: "sweet",
    target: lastSweet >= 0 ? sweetMark(frame, lastSweet) : null,
    body:
      sweet > 0 ? (
        <p>
          A dark arc under a spoke marks a{" "}
          <strong className="font-semibold text-(--w5-ink)">sweet spot</strong>: high on all three.{" "}
          {capital(word(sweet))} of {guests.length} here. Paler spokes miss at least one bar.
        </p>
      ) : (
        <p>
          No guest in this run reached the{" "}
          <strong className="font-semibold text-(--w5-ink)">sweet spot</strong>. Echo says so rather than
          stretch the bar.
        </p>
      ),
  });
  return notes;
}

function NumberMark({
  number,
  at,
  center,
}: {
  number: number;
  at: { x: number; y: number };
  center: { x: number; y: number };
}) {
  const dx = at.x - center.x;
  const dy = at.y - center.y;
  const distance = Math.hypot(dx, dy) || 1;
  const x = at.x + (dx / distance) * 12;
  const y = at.y + (dy / distance) * 12;
  return (
    <g aria-hidden>
      <line x1={at.x} y1={at.y} x2={x} y2={y} stroke={INK} strokeWidth={1} />
      <circle cx={x} cy={y} r={9} fill={INK} />
      <text
        x={x}
        y={y}
        dy="0.35em"
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#fff0e8"
        className="w5-numbers"
      >
        {number}
      </text>
    </g>
  );
}

function SpokeInset({ guest, rank }: { guest: Guest; rank: number }) {
  const labelWidth = 70;
  const valueWidth = 28;
  const total = 220;
  const track = total - labelWidth - valueWidth;
  const row = 22;
  return (
    <div>
      <p>
        <strong className="font-semibold text-(--w5-ink)">{guest.name}</strong>, ranked {ordinal(rank)}, with
        its spoke laid flat:
      </p>
      <svg
        viewBox={`0 0 ${total} ${row * 3 + 22}`}
        className="mt-2 block h-auto w-full max-w-[220px]"
        role="img"
        aria-label={PARTS.map((part) => {
          const value = scoreOf(guest, part);
          return `${PART_NAME[part]} ${value === null ? "not scored" : out100(value)}`;
        }).join(", ")}
      >
        {PARTS.map((part, index) => {
          const value = scoreOf(guest, part);
          const bar = barFor(guest, part);
          const y = index * row + 6;
          return (
            <g key={part}>
              <text x={0} y={y + 6} dy="0.35em" fontSize={12} fill={INK}>
                {PART_NAME[part]}
              </text>
              <line x1={labelWidth} y1={y + 6} x2={labelWidth + track} y2={y + 6} stroke={LINE} strokeWidth={1} />
              {value !== null && (
                <rect x={labelWidth} y={y + 2} width={Math.max(1, value * track)} height={8} fill={TONE[part]} />
              )}
              {bar !== null && (
                <line
                  x1={labelWidth + bar * track}
                  y1={y - 1}
                  x2={labelWidth + bar * track}
                  y2={y + 13}
                  stroke={INK}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}
              <text
                x={total}
                y={y + 6}
                dy="0.35em"
                textAnchor="end"
                fontSize={12}
                fontWeight={700}
                fill={INK}
                className="w5-numbers"
              >
                {value === null ? "n/a" : out100(value)}
              </text>
            </g>
          );
        })}
        {[0, 0.5, 1].map((tick) => (
          <text
            key={tick}
            x={labelWidth + tick * track}
            y={row * 3 + 16}
            textAnchor={tick === 0 ? "start" : tick === 1 ? "end" : "middle"}
            fontSize={10.5}
            fill={MUTED}
            className="w5-numbers"
          >
            {Math.round(tick * 100)}
          </text>
        ))}
      </svg>
      <p className="mt-1.5 text-[0.82rem] text-(--w5-muted)">Dashed ticks are the sweet-spot bars.</p>
    </div>
  );
}

export function RunLead() {
  const run = useLeadRun();
  return (
    <p className="w5-serif mt-4 text-[1.3rem] leading-[1.45] text-(--w5-soft)">
      {run.state === "empty"
        ? "Search for your show and Echo will run it: every guest scored three ways, best first."
        : "Here is one finished run, drawn to scale. Search for your show to run your own."}
    </p>
  );
}
