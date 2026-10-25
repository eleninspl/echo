"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { Analysis, Featured, Guest } from "@/lib/echo";

import { Cover } from "./cover";
import { useRun, useRuns } from "./runs";
import { styles } from "./styles";
import { MUTED, out100, PART_NAME, PARTS, TONE, Voiceprint, waveOf, type Wave } from "./wave";

const CARD =
  "relative flex min-h-[540px] flex-col rounded-[32px] bg-(--v9a-plum)/92 p-6 ring-1 ring-(--v9a-line) shadow-[0_50px_120px_-50px_rgb(255_92_147/0.55)] backdrop-blur-md sm:p-8";

function pickGuest(guests: Guest[]) {
  const whole = (guest: Guest) => guest.scores.reach !== null;
  return (
    guests.find((guest) => guest.label === "sweet_spot" && whole(guest)) ??
    guests.find(whole) ??
    guests[0]
  );
}

export function Spotlight() {
  const { featured } = useRuns();
  const first = featured?.[0];
  const run = useRun(first?.analysis_id);

  if (featured !== null && !first) return <Specimen />;
  if (run.state === "missing") return <Specimen />;
  if (!first || run.state === "loading") return <Waiting />;
  if (!run.analysis.guests.length) return <Specimen />;
  return <Pick item={first} analysis={run.analysis} />;
}

function Pick({ item, analysis }: { item: Featured; analysis: Analysis }) {
  const { guests } = analysis;
  const guest = pickGuest(guests);
  const rank = guests.indexOf(guest) + 1;
  const sweet = guests.filter((each) => each.label === "sweet_spot");
  const others = sweet.filter((each) => each.ref !== guest.ref).map((each) => each.name);
  const isSweet = guest.label === "sweet_spot";

  return (
    <Link
      href={`/analyses/${encodeURIComponent(item.analysis_id)}`}
      aria-label={`Open Echo's run for ${item.show.title}`}
      className={`${CARD} group transition-shadow hover:ring-(--v9a-dim)`}
    >
      <div className="flex items-center gap-4">
        <Cover show={item.show} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-(--v9a-soft)">From Echo&apos;s run for</p>
          <p className={`${styles.title} truncate text-xl leading-tight`}>{item.show.title}</p>
        </div>
        <p className="flex shrink-0 flex-col items-end">
          <span className={`${styles.figure} text-2xl leading-none`}>{guests.length}</span>
          <span className="mt-1 text-[15px] text-(--v9a-soft)">guests</span>
        </p>
      </div>

      <div className="mt-7 flex flex-col-reverse items-start gap-3 border-t border-(--v9a-line) pt-7 sm:flex-row sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className={`${styles.title} text-[2.4rem] leading-none tracking-[-0.01em]`}>{guest.name}</p>
          {guest.description && <p className="mt-2 truncate text-lg text-(--v9a-soft)">{guest.description}</p>}
        </div>
        <span
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[15px] font-semibold ${
            isSweet ? `${styles.gradientFill} text-(--v9a-on-hue)` : "text-(--v9a-ink) ring-1 ring-(--v9a-line)"
          }`}
        >
          {isSweet ? "Sweet spot" : `No. ${rank}`}
        </span>
      </div>

      <Voiceprint wave={waveOf(guest)} perSwell={11} width={440} height={124} grow className="mt-7 h-auto w-full" />
      <Readout wave={waveOf(guest)} />
      <span aria-hidden className="block h-7 shrink-0" />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-(--v9a-line) pt-5">
        <p className="max-w-[30ch] text-[15px] leading-snug text-(--v9a-soft)">
          {isSweet && sweet.length > 1
            ? `Ranked ${rank} of ${guests.length}. Also in the sweet spot: ${others.join(", ")}.`
            : `Ranked ${rank} of ${guests.length}. ${sweet.length} in the sweet spot.`}
        </p>
        <OpenArrow>See all {guests.length}</OpenArrow>
      </div>
    </Link>
  );
}

function Readout({ wave }: { wave: Wave }) {
  return (
    <dl className="mt-4 grid grid-cols-3 text-center">
      {PARTS.map((part) => {
        const value = wave[part];
        return (
          <div key={part} className="flex flex-col items-center gap-1.5">
            <dt className="text-[15px] font-semibold" style={{ color: TONE[part] }}>
              {PART_NAME[part]}
            </dt>
            <dd className={`${styles.figure} text-[2rem] leading-none`}>
              {value === null ? (
                <>
                  <span aria-hidden className="text-(--v9a-dim)">
                    –
                  </span>
                  <span className="sr-only">not scored</span>
                </>
              ) : (
                out100(value)
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function OpenArrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 font-semibold text-(--v9a-ink)">
      {children}
      <span
        aria-hidden
        className={`${styles.gradientFill} flex size-10 items-center justify-center rounded-full text-(--v9a-on-hue) transition-transform group-hover:translate-x-1`}
      >
        <svg viewBox="0 0 20 20" className="size-4" focusable="false">
          <path
            d="M4 10h11m-4-4 4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

function Waiting() {
  return (
    <div aria-hidden className={CARD}>
      <div className="flex items-center gap-4">
        <span className={`${styles.waiting} size-[52px] rounded-xl bg-(--v9a-plum-hi)`} />
        <span className={`${styles.waiting} h-6 w-40 rounded-full bg-(--v9a-plum-hi)`} />
      </div>
      <div className="mt-7 border-t border-(--v9a-line) pt-7">
        <span className={`${styles.waiting} block h-9 w-48 rounded-full bg-(--v9a-plum-hi)`} />
      </div>
      <div className={`${styles.waiting} mt-auto`}>
        <svg viewBox="0 0 440 124" className="h-auto w-full" focusable="false">
          {Array.from({ length: 33 }, (_, index) => (
            <rect key={index} x={index * 13.33 + 2.8} y={56} width={7.7} height={12} rx={3.85} fill={MUTED} />
          ))}
        </svg>
      </div>
    </div>
  );
}

function Specimen() {
  const wave: Wave = { fit: 0.86, love: 0.74, reach: 0.82 };
  return (
    <div className={CARD}>
      <p className={`${styles.title} text-2xl leading-tight`}>Every guest gets a wave</p>
      <p className="mt-2 text-lg text-(--v9a-soft)">Its three swells are its three scores, from 0 to 100.</p>
      <Voiceprint wave={wave} perSwell={11} width={440} height={124} grow className="mt-auto h-auto w-full" />
      <ul className="mt-4 grid grid-cols-3 text-center">
        {PARTS.map((part) => (
          <li key={part} className="text-[15px] font-semibold" style={{ color: TONE[part] }}>
            {PART_NAME[part]}
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-(--v9a-line) pt-5 text-[15px] text-(--v9a-soft)">
        Find your show to see the guests Echo picks for it.
      </p>
    </div>
  );
}
