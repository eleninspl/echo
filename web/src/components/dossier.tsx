"use client";

import { useState } from "react";

import type { AgeBucket, Guest, Scores as GuestScores } from "@/lib/echo";
import { AGES, SHORT_AGE } from "@/lib/format";
import { AGE_ORDER } from "@/lib/stats";

import { Chip, hue, out100, SCORE_HUE } from "./hud";
import { Voiceprint } from "./voiceprint";

const SITES: Record<string, string> = {
  wikipedia: "Wikipedia",
  imdb: "IMDb",
  spotify: "Spotify",
  musicbrainz: "MusicBrainz",
  website: "Website",
};

export function Scores({
  scores,
  bars = 60,
  height = 36,
  readout = "text-2xl",
}: {
  scores: GuestScores;
  bars?: number;
  height?: number;
  readout?: string;
}) {
  const [lobe, setLobe] = useState<number | null>(null);
  const levels = [
    { name: "Fit", value: scores.fit, color: SCORE_HUE.fit },
    { name: "Love back", value: scores.love_back, color: SCORE_HUE.love_back },
    { name: "Reach", value: scores.reach, color: SCORE_HUE.reach },
  ];
  return (
    <div className="flex flex-col">
      <Voiceprint
        fit={scores.fit}
        love={scores.love_back}
        reach={scores.reach}
        bars={bars}
        height={height}
        className="w-full"
        lit={lobe}
        onLobe={setLobe}
      />
      <dl className="grid grid-cols-3">
        {levels.map((level, index) => (
          <Level
            key={level.name}
            {...level}
            readout={readout}
            dimmed={lobe !== null && lobe !== index}
            onHover={(on) => setLobe(on ? index : null)}
          />
        ))}
      </dl>
    </div>
  );
}

// One score under its lobe of the voiceprint: a leader down from the lobe, the name and the figure.
function Level({
  name,
  value,
  color,
  readout,
  dimmed,
  onHover,
}: {
  name: string;
  value: number | null;
  color: string;
  readout: string;
  dimmed: boolean;
  onHover: (on: boolean) => void;
}) {
  return (
    <div
      className={`flex flex-col-reverse items-center gap-1 transition-opacity duration-200 ${dimmed ? "opacity-35" : ""}`}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <dt className="tag text-center" style={{ color }}>
        {name}
      </dt>
      <dd className="flex flex-col items-center">
        <span aria-hidden className="h-3 w-px" style={{ background: color }} />
        <span aria-hidden className="mb-1.5 size-1.5 rounded-full" style={{ background: color }} />
        <span className={`readout ${readout}`}>{out100(value)}</span>
        {value === null && <span className="text-[0.6875rem] leading-tight text-ink-dim">Too little data</span>}
      </dd>
    </div>
  );
}

export function PickButton({ guestName, picked, onPick }: { guestName: string; picked: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={`btn ${picked ? "btn-solid" : ""}`}
      style={hue("var(--ink)")}
    >
      <svg aria-hidden viewBox="0 0 12 12" className="size-3">
        {picked ? (
          <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        ) : (
          <path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        )}
      </svg>
      {picked ? "Picked" : "Pick to invite"}
      <span className="sr-only"> {guestName}</span>
    </button>
  );
}

export function TasteChips({ names, color }: { names: string[]; color: string }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <Chip key={name} color={color} plain>
          {name}
        </Chip>
      ))}
    </span>
  );
}

export function AgeLamps({ ages }: { ages: AgeBucket[] }) {
  if (!ages.length) return <span className="text-sm text-ink-dim">No age group stands out.</span>;
  return (
    <>
      <span className="sr-only">{ages.map((age) => AGES[age]).join(", ")}</span>
      <span aria-hidden className="grid grid-cols-6 gap-1">
        {AGE_ORDER.map((age) => {
          const on = ages.includes(age);
          return (
            <span key={age} className="flex flex-col items-center gap-1">
              <span className={`h-2 w-full ${on ? "lamp" : "lamp-off"}`} style={hue("var(--love)")} />
              <span className={`text-[0.6875rem] ${on ? "text-ink" : "text-ink-dim"}`}>{SHORT_AGE[age]}</span>
            </span>
          );
        })}
      </span>
    </>
  );
}

export function GuestLinks({ links }: { links: Guest["links"] }) {
  if (!Object.keys(links).length) return null;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {Object.entries(links).map(([site, url]) => (
        <a
          key={site}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-accent underline"
        >
          {SITES[site] ?? site}
          <svg aria-hidden viewBox="0 0 12 12" className="size-3">
            <path d="M4 2h6v6M10 2L3 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ))}
    </p>
  );
}
