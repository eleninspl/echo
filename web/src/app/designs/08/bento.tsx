"use client";

import type { CSSProperties, ReactNode } from "react";

import type { Analysis, Guest } from "@/lib/echo";
import { category } from "@/lib/format";

import { styles } from "./styles";
import { Overlap } from "./overlap";
import {
  Eyebrow,
  LabelPill,
  percent,
  rankedBy,
  ScoreBar,
  SCORES,
  ScoreCell,
  ScoreRing,
  sweetCount,
  type ScoreKey,
} from "./parts";
import { useLead } from "./runs";

const SCORE_COPY: Record<ScoreKey, { title: string; text: string }> = {
  fit: {
    title: "Your listeners over-index on the guest",
    text: "Adjusted for fame, so the most famous names don't win by default.",
  },
  love_back: {
    title: "The guest's fans over-index on your show",
    text: "The match runs both ways, so the fans who come over have a reason to stay.",
  },
  reach: {
    title: "The guest's fans are new to you",
    text: "Measured on the podcasts those fans love most, and how little your listeners care for them.",
  },
};

export function ScoreBento() {
  const lead = useLead();
  const analysis = lead.state === "ready" ? lead.analysis : null;
  const loading = lead.state === "loading";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Cell className="md:col-span-2 lg:row-span-2">
        <CellHead
          eyebrow="The overlap"
          title="Two audiences, scored in both directions"
          text="Echo reads both audiences on Qloo: your show's listeners and each guest's fans. The three scores come from where they meet and where they don't."
        />
        <div className="mt-6 flex flex-1 flex-col">
          <Overlap />
        </div>
      </Cell>

      {SCORES.map((score) => (
        <ScoreCard
          key={score.key}
          scoreKey={score.key}
          analysis={analysis}
          loading={loading}
          className={score.key === "reach" ? "lg:order-none" : ""}
        />
      ))}

      <SweetSpotCard analysis={analysis} loading={loading} />

      {analysis && <TensionCard analysis={analysis} />}
      {analysis && analysis.audience_map.length > 0 && <AudienceCard analysis={analysis} />}
    </div>
  );
}

function Cell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={`flex flex-col rounded-[20px] border border-(--line) bg-white p-5 shadow-(--shadow-sm) sm:p-6 ${className}`}
    >
      {children}
    </article>
  );
}

function CellHead({
  eyebrow,
  title,
  text,
  color,
}: {
  eyebrow: string;
  title: string;
  text: string;
  color?: string;
}) {
  return (
    <header className="flex flex-col gap-2.5">
      <Eyebrow color={color}>{eyebrow}</Eyebrow>
      <h3 className="text-[19px] leading-snug font-semibold tracking-[-0.02em] text-balance text-(--ink)">{title}</h3>
      <p className="max-w-[56ch] text-[14px] leading-relaxed text-(--ink-3)">{text}</p>
    </header>
  );
}

function Inset({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-(--line) bg-(--bg-soft) p-3">
      <p className={`${styles.mono} mb-2 px-1 text-[10.5px] tracking-[0.07em] text-(--ink-3) uppercase`}>{caption}</p>
      <div className="rounded-xl border border-(--line) bg-white px-3 py-1 shadow-(--shadow-sm)">{children}</div>
    </div>
  );
}

function ScoreCard({
  scoreKey,
  analysis,
  loading,
  className,
}: {
  scoreKey: ScoreKey;
  analysis: Analysis | null;
  loading: boolean;
  className: string;
}) {
  const score = SCORES.find((item) => item.key === scoreKey) ?? SCORES[0];
  const top = analysis ? rankedBy(analysis.guests, scoreKey).slice(0, 3) : [];
  return (
    <Cell className={className}>
      <CellHead eyebrow={score.name} title={SCORE_COPY[scoreKey].title} text={SCORE_COPY[scoreKey].text} color={score.color} />
      <div className="mt-auto pt-5">
        {analysis && top.length > 0 && (
          <Inset caption={`Highest ${score.name.toLowerCase()} · ${analysis.show.title}`}>
            <ul className="divide-y divide-(--line)">
              {top.map((guest, index) => (
                <li key={guest.ref} className="flex items-center gap-3 py-2">
                  <span className={`${styles.mono} w-5 text-[11px] text-(--ink-3)`}>0{index + 1}</span>
                  <span className="w-[5.5rem] truncate text-[13px] font-medium text-(--ink)">{guest.name}</span>
                  <span className="flex-1">
                    <ScoreBar value={guest.scores[scoreKey]} color={score.color} order={index} />
                  </span>
                  <span className={`${styles.mono} w-7 text-right text-[12px] font-medium text-(--ink)`}>
                    {percent(guest.scores[scoreKey])}
                  </span>
                </li>
              ))}
            </ul>
          </Inset>
        )}
        {loading && <span className={`block h-[9.5rem] rounded-2xl ${styles.skeleton}`} />}
        {!analysis && !loading && <ScaleLegend color={score.color} />}
      </div>
    </Cell>
  );
}

function ScaleLegend({ color }: { color: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--bg-soft) p-4">
      <ScoreBar value={1} color={color} />
      <p className={`${styles.mono} flex justify-between text-[11px] text-(--ink-3)`}>
        <span>0</span>
        <span>Percentile within the show&apos;s guests</span>
        <span>100</span>
      </p>
    </div>
  );
}

function SweetSpotCard({ analysis, loading }: { analysis: Analysis | null; loading: boolean }) {
  const sweet = analysis ? sweetCount(analysis.guests) : 0;
  const best = analysis ? rankedBy(analysis.guests.filter((guest) => guest.label === "sweet_spot"), "echo")[0] : null;
  return (
    <Cell className="relative overflow-hidden md:col-span-2">
      <div aria-hidden className={`pointer-events-none absolute inset-0 ${styles.softAurora}`} />
      <div className="relative grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col">
          <CellHead
            eyebrow="The sweet spot"
            title="High on all three. Rare, and Echo says so."
            text="Reach and love back pull against each other, so most guests win on one or two. Usually 1 to 4 guests in 20 land here, and Echo tells you how many."
            color="var(--accent)"
          />
          {analysis && (
            <p className="mt-auto flex items-baseline gap-2 pt-6">
              <span className={`pr-1 text-[72px] leading-[0.9] font-semibold tracking-[-0.05em] ${styles.gradientText}`}>
                {sweet}
              </span>
              <span className="text-[15px] text-(--ink-2)">
                of {analysis.guests.length} guests for {analysis.show.title}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-col justify-end gap-3">
          {analysis && (
            <>
              <div className="rounded-2xl border border-(--line) bg-white/80 p-4 backdrop-blur">
                <p className={`${styles.mono} mb-3 text-[10.5px] tracking-[0.07em] text-(--ink-3) uppercase`}>
                  Every guest, by score shape
                </p>
                <ul className="grid grid-cols-7 gap-2" aria-label="Guests, sweet spots in colour">
                  {analysis.guests.map((guest, index) => (
                    <li
                      key={guest.ref}
                      className={`${styles.rise} flex justify-center`}
                      style={{ "--i": index } as CSSProperties}
                      title={`${guest.name}${guest.label === "sweet_spot" ? ", sweet spot" : ""}`}
                    >
                      <ScoreRing
                        scores={guest.scores}
                        name={guest.name}
                        size={36}
                        muted={guest.label !== "sweet_spot"}
                      />
                      <span className="sr-only">
                        {guest.name}
                        {guest.label === "sweet_spot" ? ", sweet spot" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {best && <GuestStrip guest={best} />}
            </>
          )}
          {loading && <span className={`block h-48 rounded-2xl ${styles.skeleton}`} />}
        </div>
      </div>
    </Cell>
  );
}

function GuestStrip({ guest }: { guest: Guest }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-(--line) bg-white p-4 shadow-(--shadow-md)">
      <span className="flex min-w-0 items-center gap-3">
        <ScoreRing scores={guest.scores} name={guest.name} size={40} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-(--ink)">{guest.name}</span>
            <LabelPill label={guest.label} small />
          </span>
          {guest.description && <span className="block truncate text-[12px] text-(--ink-3)">{guest.description}</span>}
        </span>
        <span className={`${styles.mono} ml-auto shrink-0 text-right text-[11px] leading-tight text-(--ink-3)`}>
          Echo
          <span className="block text-[15px] font-semibold text-(--ink)">{Math.round(guest.scores.echo * 100)}</span>
        </span>
      </span>
      <span className="grid grid-cols-3 gap-4">
        {SCORES.map((score, index) => (
          <span key={score.key} className="flex flex-col gap-1">
            <span className="text-[11px] text-(--ink-3)">{score.name}</span>
            <ScoreCell value={guest.scores[score.key]} color={score.color} order={index} />
          </span>
        ))}
      </span>
    </div>
  );
}

type Frame = { id: string; width: number; height: number; left: number; right: number; top: number; bottom: number };

const WIDE: Frame = { id: "wide", width: 560, height: 300, left: 40, right: 18, top: 30, bottom: 40 };
const NARROW: Frame = { id: "narrow", width: 340, height: 300, left: 34, right: 12, top: 30, bottom: 40 };

function TensionCard({ analysis }: { analysis: Analysis }) {
  const plotted = analysis.guests.filter((guest) => guest.scores.reach !== null);
  const unplotted = analysis.guests.length - plotted.length;

  return (
    <Cell className="md:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <CellHead
          eyebrow="The trade-off"
          title="Reach and love back pull against each other"
          text={`Each dot is a guest Echo scored for ${analysis.show.title}. New fans tend to care less about your show, which is why a guest high on both is worth finding.`}
          color="var(--love)"
        />
        <p className="flex shrink-0 items-center gap-4 text-[12px] text-(--ink-3)">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2.5 rounded-full ${styles.sweetFill}`} /> Sweet spot
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-[#c4c4cf]" /> Other guests
          </span>
        </p>
      </div>
      <Plot frame={WIDE} guests={plotted} show={analysis.show.title} className="mt-5 hidden sm:block" />
      <Plot frame={NARROW} guests={plotted} show={analysis.show.title} className="mt-5 sm:hidden" />
      {unplotted > 0 && (
        <p className="mt-2 text-[12px] text-(--ink-3)">
          {unplotted === 1 ? "One guest has" : `${unplotted} guests have`} too little data for a reach score and
          {unplotted === 1 ? " isn't" : " aren't"} plotted.
        </p>
      )}
    </Cell>
  );
}

function AudienceCard({ analysis }: { analysis: Analysis }) {
  const rows = analysis.audience_map
    .map((row) => ({ category: row.category, top: [...row.items].sort((a, b) => b.affinity - a.affinity)[0] }))
    .filter((row) => row.top)
    .slice(0, 6);
  return (
    <Cell>
      <CellHead
        eyebrow="Where it starts"
        title="What your listeners love, across categories"
        text={`Qloo's taste data for ${analysis.show.title}'s audience: the top pick in each category, before any guest is scored.`}
        color="var(--reach)"
      />
      <ul className="mt-6 flex flex-col gap-4">
        {rows.map((row, index) => (
          <li key={row.category} className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate">
                <span className={`${styles.mono} mr-2 text-[10.5px] tracking-[0.06em] text-(--ink-3) uppercase`}>
                  {category(row.category)}
                </span>
                <span className="font-medium text-(--ink)">{row.top.name}</span>
              </span>
              <span className={`${styles.mono} text-[12px] text-(--ink-2)`}>{percent(row.top.affinity)}</span>
            </span>
            <ScoreBar value={row.top.affinity} color="#8b8b99" order={index} height={4} />
          </li>
        ))}
      </ul>
      <p className="mt-auto pt-4 text-[12px] text-(--ink-3)">Affinity out of 100. It describes the audience as a group.</p>
    </Cell>
  );
}

function Plot({ frame, guests, show, className }: { frame: Frame; guests: Guest[]; show: string; className: string }) {
  const innerWidth = frame.width - frame.left - frame.right;
  const innerHeight = frame.height - frame.top - frame.bottom;
  const x = (value: number) => frame.left + value * innerWidth;
  const y = (value: number) => frame.top + (1 - value) * innerHeight;
  const ordered = [...guests].sort((a, b) => Number(a.label === "sweet_spot") - Number(b.label === "sweet_spot"));
  const gradient = `d08-dot-${frame.id}`;
  return (
    <svg
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        role="img"
        aria-label={`Love back against reach for ${guests.length} guests of ${show}.`}
        className={`h-auto w-full ${className}`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0b8ae6" />
            <stop offset="0.5" stopColor="#5b3df5" />
            <stop offset="1" stopColor="#d2369c" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={frame.left}
              x2={frame.width - frame.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--line)"
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <line
              y1={frame.top}
              y2={frame.height - frame.bottom}
              x1={x(tick)}
              x2={x(tick)}
              stroke="var(--line)"
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <text x={frame.left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" className={styles.mono}>
              {tick * 100}
            </text>
            <text x={x(tick)} y={frame.height - frame.bottom + 18} textAnchor="middle" fontSize="11" fill="var(--ink-3)" className={styles.mono}>
              {tick * 100}
            </text>
          </g>
        ))}
        <text x={frame.width - frame.right} y={frame.height - 4} textAnchor="end" fontSize="12" fontWeight="500" fill="var(--ink-2)">
          Reach →
        </text>
        <text x={frame.left - 30} y="13" fontSize="12" fontWeight="500" fill="var(--ink-2)">
          ↑ Love back
        </text>
        {ordered.map((guest) => {
          const sweet = guest.label === "sweet_spot";
          const cx = x(guest.scores.reach ?? 0);
          const cy = y(guest.scores.love_back);
          const flip = cx > frame.width - 100;
          return (
            <g key={guest.ref}>
              <title>{`${guest.name}: reach ${percent(guest.scores.reach)}, love back ${percent(guest.scores.love_back)}`}</title>
              {sweet && <circle cx={cx} cy={cy} r="12" fill="rgb(91 61 245 / 0.1)" />}
              <circle
                cx={cx}
                cy={cy}
                r={sweet ? 6.5 : 5}
                fill={sweet ? `url(#${gradient})` : "#c4c4cf"}
                stroke="#fff"
                strokeWidth="2"
              />
              {sweet && (
                <text
                  x={flip ? cx - 16 : cx + 16}
                  y={cy + 4}
                  textAnchor={flip ? "end" : "start"}
                  fontSize="12"
                  fontWeight="600"
                  fill="var(--ink)"
                >
                  {guest.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
  );
}
