import type { ReactNode } from "react";

import { styles } from "./styles";
import { Kicker } from "./kicker";
import { Stamp } from "./stamp";
import { CARD, FRAME, INK, INK_SOFT, RED } from "./tokens";

const SHOW = { x: 205, y: 232, r: 136 };
const GUEST = { x: 355, y: 232, r: 136 };

const HALO = { paintOrder: "stroke" as const, stroke: CARD, strokeWidth: 7, strokeLinejoin: "round" as const };

export function HowItScores() {
  return (
    <section id="scoring" aria-labelledby="d06-scoring" className={`${FRAME} mt-24 scroll-mt-6 sm:mt-32`}>
      <div className="grid grid-cols-1 gap-x-14 gap-y-4 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Kicker>The scoring</Kicker>
          <h2
            id="d06-scoring"
            className={`${styles.serif} mt-3 text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.015em] text-balance`}
          >
            How Echo scores a guest
          </h2>
        </div>
        <p className="max-w-[46ch] text-[1.125rem] leading-relaxed text-(--d-ink-soft) lg:col-span-5">
          Two audiences: your show&apos;s listeners and the guest&apos;s fans. Echo reads on Qloo how much they like
          each other, in both directions, and how much of the guest&apos;s crowd would be new to you.
        </p>
      </div>

      <div className={`${styles.card} relative mt-10 rounded-[8px] px-5 pt-8 pb-7 sm:px-10 sm:pt-10 sm:pb-9`}>
        <div className="grid grid-cols-1 items-center gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="relative lg:col-span-7">
            <OverlapDiagram />
            <Stamp
              angle={-9}
              sub="High on all three"
              className="absolute right-[2%] bottom-[1%] text-[clamp(0.95rem,2.4vw,1.4rem)]"
            >
              Sweet spot
            </Stamp>
          </div>
          <dl className="flex flex-col lg:col-span-5">
            <Entry mark={<ArrowMark />} term="Fit">
              Your listeners over-index on the guest, beyond what the guest&apos;s fame alone would predict.
            </Entry>
            <Entry mark={<ArrowMark back />} term="Love back">
              The guest&apos;s fans over-index on your show. The people they bring are likely to enjoy it.
            </Entry>
            <Entry mark={<DotsMark />} term="Reach">
              The guest&apos;s fans are new to you: your listeners don&apos;t share the podcasts those fans love most.
            </Entry>
            <Entry mark={<StampMark />} term="Sweet spot" accent>
              High on all three. Reach and love back pull against each other, so it&apos;s rare: 1 to 4 guests in
              20. Echo tells you how many it found.
            </Entry>
          </dl>
        </div>
        <p
          className={`${styles.typed} mt-8 flex flex-col gap-1 border-t border-dashed border-(--d-ink-faint)/40 pt-5 text-[0.9rem] leading-relaxed text-(--d-ink-soft) sm:flex-row sm:gap-4`}
        >
          <span className="shrink-0 font-bold tracking-[0.06em] text-(--d-red) uppercase">Booker&apos;s note</span>
          <span>
            High fit with low reach is safe, but adds nobody. High reach with low love back brings people who
            won&apos;t stay.
          </span>
        </p>
      </div>
    </section>
  );
}

function Entry({
  mark,
  term,
  accent = false,
  children,
}: {
  mark: ReactNode;
  term: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[2.75rem_1fr] gap-x-3 border-b border-dotted border-(--d-ink-faint)/50 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <span aria-hidden className="flex h-7 items-center">
        {mark}
      </span>
      <div>
        <dt
          className={`${styles.typed} text-[0.95rem] leading-7 font-bold tracking-[0.08em] uppercase ${accent ? "text-(--d-red)" : ""}`}
        >
          {term}
        </dt>
        <dd className="mt-1 text-[1.05rem] leading-relaxed text-(--d-ink-soft)">{children}</dd>
      </div>
    </div>
  );
}

function ArrowMark({ back = false }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 40 16" className="h-4 w-10" fill="none">
      <g transform={back ? "translate(40 0) scale(-1 1)" : undefined}>
        <path d="M2 8 H34" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeDasharray={back ? "4 3" : undefined} />
        <path d="M28 2.5 L36 8 L28 13.5" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function DotsMark() {
  return (
    <svg viewBox="0 0 40 20" className="h-5 w-10">
      {Array.from({ length: 10 }, (_, index) => (
        <circle key={index} cx={4 + (index % 5) * 8} cy={index < 5 ? 5 : 14} r="2.1" fill={RED} />
      ))}
    </svg>
  );
}

function StampMark() {
  return (
    <svg viewBox="0 0 40 22" className="h-[22px] w-10" style={{ filter: "url(#d06-ink)" }}>
      <g transform="rotate(-8 20 11)">
        <rect x="3" y="3" width="34" height="16" rx="2.5" fill="none" stroke={RED} strokeWidth="2.4" />
        <rect x="7.5" y="9.5" width="25" height="3" fill={RED} />
      </g>
    </svg>
  );
}

function OverlapDiagram() {
  return (
    <svg
      viewBox="0 0 560 430"
      role="img"
      aria-labelledby="d06-diagram-title d06-diagram-desc"
      className={`${styles.typed} block h-auto w-full`}
    >
      <title id="d06-diagram-title">Two audiences that overlap</title>
      <desc id="d06-diagram-desc">
        Your listeners and the guest&apos;s fans overlap. Fit runs from your show to the guest. Love back runs from
        the guest to your show. Reach is the part of the guest&apos;s fans your show doesn&apos;t have yet.
      </desc>
      <defs>
        <pattern id="d06-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="9" stroke={INK_SOFT} strokeWidth="1.3" opacity="0.5" />
        </pattern>
        <pattern id="d06-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="2" fill={RED} />
        </pattern>
        <clipPath id="d06-inside-show">
          <circle cx={SHOW.x} cy={SHOW.y} r={SHOW.r} />
        </clipPath>
        <mask id="d06-outside-show">
          <rect width="560" height="430" fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={SHOW.r + 1.5} fill="black" />
        </mask>
        <marker
          id="d06-head"
          viewBox="0 0 12 12"
          refX="9"
          refY="6"
          markerWidth="11"
          markerHeight="11"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M1.5 1.5 L10 6 L1.5 10.5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      <circle cx={GUEST.x} cy={GUEST.y} r={GUEST.r} fill="url(#d06-dots)" mask="url(#d06-outside-show)" opacity="0.62" />
      <circle cx={GUEST.x} cy={GUEST.y} r={GUEST.r} fill="url(#d06-hatch)" clipPath="url(#d06-inside-show)" />
      <circle cx={SHOW.x} cy={SHOW.y} r={SHOW.r} fill="none" stroke={INK} strokeWidth="2.6" />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={GUEST.r}
        fill="none"
        stroke={INK}
        strokeWidth="2.6"
        strokeDasharray="10 7"
      />

      <line x1="140" y1="72" x2="140" y2="110" stroke={INK} strokeWidth="1.4" />
      <text x="140" y="56" textAnchor="middle" fontSize="22" fontWeight="700" letterSpacing="1" fill={INK}>
        YOUR LISTENERS
      </text>
      <line x1="425" y1="72" x2="425" y2="115" stroke={INK} strokeWidth="1.4" />
      <text x="425" y="56" textAnchor="middle" fontSize="22" fontWeight="700" letterSpacing="1" fill={INK}>
        THE GUEST&apos;S FANS
      </text>

      <path d="M116 206 Q 268 118 412 188" fill="none" stroke={INK} strokeWidth="2.6" markerEnd="url(#d06-head)" />
      <text x="146" y="172" textAnchor="middle" fontSize="22" fontWeight="700" letterSpacing="1" fill={INK} style={HALO}>
        FIT
      </text>

      <path
        d="M414 272 Q 268 350 118 262"
        fill="none"
        stroke={INK}
        strokeWidth="2.6"
        strokeDasharray="8 6"
        markerEnd="url(#d06-head)"
      />
      <text x="172" y="314" textAnchor="middle" fontSize="21" fontWeight="700" fill={INK} style={HALO}>
        LOVE BACK
      </text>

      <text x="434" y="226" textAnchor="middle" fontSize="25" fontWeight="700" letterSpacing="1" fill={RED} style={HALO}>
        REACH
      </text>
      <text x="434" y="252" textAnchor="middle" fontSize="19" fontStyle="italic" fill={RED} style={HALO}>
        new ears
      </text>
    </svg>
  );
}
