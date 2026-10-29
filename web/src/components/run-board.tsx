"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import type { Analysis, Guest, MapRow, Step } from "@/lib/echo";
import { category, LABELS } from "@/lib/format";

import { Picture } from "./guest-list";
import { Equalizer } from "./show-finder";
import { categoryHue, Chip, LABEL_HUE, Lamp, rank, SectionHead } from "./hud";
import { TasteImage } from "./taste-side";
import { Voiceprint } from "./voiceprint";

const SHOWN_GUESTS = 10;
const SHOWN_TASTES = 8;
const STRUCK = 3;
// A step that takes longer than this shows how long it has taken so far, so a slow one visibly moves.
const SLOW_MS = 3000;

// What the picture beside the steps shows: the latest step's result, one at a time.
type View = "radar" | "tastes" | "left" | "scope" | "guests";

// How many left-out people the picture shows; the rest are counted.
const SHOWN_LEFT = 12;

export function Rundown({ analysis }: { analysis: Analysis }) {
  const { steps, audience_map: map, guests } = analysis;
  const current = steps.findIndex((step) => !step.done);
  const done = steps.filter((step) => step.done).length;
  const finished = (key: string) => steps.some((step) => step.key === key && step.done);
  const view: View = finished("evidence")
    ? "guests"
    : guests.length
      ? "scope"
      : finished("clean") && analysis.left_out.length
        ? "left"
        : map.some((row) => row.items.length > 0)
          ? "tastes"
          : "radar";
  return (
    <section aria-labelledby="running" className="flex flex-col gap-4">
      <SectionHead id="running" title="Echo is running" />
      {/* On a phone the steps sit below the picture, so the one running is named here too. */}
      <p aria-hidden className="-mt-2 flex items-center gap-2 text-sm text-ink-soft md:hidden">
        <Lamp color="var(--accent)" on className="pulse size-2 shrink-0" />
        {current >= 0 ? `Step ${current + 1} of ${steps.length} · ${steps[current].label}` : "Finishing"}
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-8 md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col">
            {steps.map((step, index) => {
              const on = index === current;
              const found = detail(step, analysis);
              return (
                <li
                  key={step.key}
                  aria-current={on ? "step" : undefined}
                  className={`flex min-h-14 items-center gap-4 border-b border-steel py-2 last:border-b-0 ${
                    step.done || on ? "text-ink" : "text-ink-dim"
                  }`}
                >
                  <span className="readout w-6 text-sm text-ink-dim">{String(index + 1).padStart(2, "0")}</span>
                  <Lamp
                    color={step.done ? "var(--ink-soft)" : "var(--accent)"}
                    on={step.done || on}
                    className={`size-2.5 shrink-0 ${on ? "pulse" : ""}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={`leading-snug text-balance ${on ? "font-semibold" : ""}`}>{step.label}</span>
                    {found && <span className="fade line-clamp-2 text-xs text-ink-dim">{found}</span>}
                  </span>
                  {on && <Elapsed key={step.key} />}
                  <span className="sr-only">{step.done ? "(done)" : on ? "(running)" : "(waiting)"}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-sm text-pretty text-ink-dim">
            {current >= 0 ? `Step ${current + 1} of ${steps.length}. ` : "Done. "}
            It usually takes under a minute, and the page opens by itself.
          </p>
        </div>
        <div className="@container order-first flex min-h-[22rem] flex-col gap-4 md:order-none md:h-[31rem]">
          {/* Keyed by view, so each step's picture arrives with its own entrance. */}
          <div key={view} className="fade flex min-h-0 flex-1 flex-col gap-4">
            {view === "radar" ? (
              <Radar label={current >= 0 ? steps[current].label : "Finishing"} done={done} total={steps.length} />
            ) : view === "tastes" ? (
              <Tastes map={map} />
            ) : view === "left" ? (
              <LeftOut people={analysis.left_out} />
            ) : view === "scope" ? (
              <MiniScope guests={guests} />
            ) : (
              <FirstGuests
                guests={guests}
                writing={steps.some((step) => step.key === "ideas" && !step.done)}
              />
            )}
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {current >= 0 ? `${steps[current].label}, step ${current + 1} of ${steps.length}.` : "Finishing."}
      </p>
    </section>
  );
}

function detail(step: Step, analysis: Analysis): ReactNode {
  const { audience_map: map, guests, left_out: leftOut } = analysis;
  switch (step.key) {
    case "map": {
      const rows = map.filter((row) => row.items.length > 0);
      if (!rows.length) return null;
      const count = rows.reduce((sum, row) => sum + row.items.length, 0);
      return `${count} tastes in ${rows.length} categories`;
    }
    case "clean": {
      if (!step.done) return null;
      const people = distinct(leftOut);
      if (!people.length) return "Nobody to leave out";
      const struck = people.slice(0, STRUCK);
      const more = people.length - struck.length;
      return (
        <>
          Left out{" "}
          {struck.map(({ name }, index) => (
            <span key={`${name}-${index}`}>
              <s className="text-ink-soft decoration-ink-dim/70">{name}</s>
              {index < struck.length - 1 ? ", " : ""}
            </span>
          ))}
          {more > 0 && ` and ${more} more`}
        </>
      );
    }
    case "score": {
      if (!guests.length) return null;
      const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
      return `${guests.length} guests, ${sweet} sweet ${sweet === 1 ? "spot" : "spots"}`;
    }
    case "evidence":
      return step.done ? `What both audiences love, for the top ${Math.min(guests.length, SHOWN_GUESTS)}` : null;
    default:
      return null;
  }
}

type Lit = { name: string; category: string; place: number };

function Tastes({ map }: { map: MapRow[] }) {
  const [lit, setLit] = useState<Lit | null>(null);
  const rows = map.filter((row) => row.items.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <Caption title="What your listeners love" />
      <ul className="flex flex-col gap-2.5">
        {rows.map((row, rowIndex) => {
          const color = categoryHue(row.category);
          return (
            <li key={row.category} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
              <Chip color={color}>{category(row.category)}</Chip>
              <ul className="grid max-w-[30rem] grid-cols-8 gap-1.5">
                {row.items.slice(0, SHOWN_TASTES).map((item, place) => {
                  const on = lit?.name === item.name && lit.category === row.category;
                  const show = () => setLit({ name: item.name, category: row.category, place });
                  return (
                    <li key={`${item.name}-${place}`}>
                      <span
                        role="img"
                        tabIndex={0}
                        aria-label={`${item.name}, number ${place + 1} in ${category(row.category)}`}
                        onPointerEnter={show}
                        onPointerLeave={() => setLit(null)}
                        onFocus={show}
                        onBlur={() => setLit(null)}
                        className={`taste-pop relative block aspect-square w-full overflow-hidden rounded-full bg-well outline-offset-2 transition-[scale] duration-200 ease-(--ease-out) ${on ? "z-10 scale-125" : ""}`}
                        style={
                          {
                            boxShadow: `0 0 0 1.5px ${color}`,
                            animationDelay: `${(rowIndex * SHOWN_TASTES + place) * 35}ms`,
                          } as CSSProperties
                        }
                      >
                        <TasteImage item={item} color={color} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="flex min-h-6 flex-wrap items-baseline gap-x-2 text-sm">
        {lit ? (
          <>
            <span className="font-semibold">{lit.name}</span>
            <span className="text-ink-dim">
              {category(lit.category)}, number {lit.place + 1} for your listeners
            </span>
          </>
        ) : (
          <span className="text-ink-dim">Point at a picture to see what it is. The strongest pull comes first.</span>
        )}
      </p>
    </div>
  );
}

function FirstGuests({ guests, writing }: { guests: Guest[]; writing: boolean }) {
  const shown = guests.slice(0, SHOWN_GUESTS);
  return (
    <div className="flex flex-col gap-3">
      <Caption title="Your first guests" />
      <p className="-mt-1 flex items-center gap-2.5 text-sm text-ink-soft">
        {writing && <Equalizer />}
        <span>{writing ? "Echo is writing an episode idea for each." : "The full page opens in a moment."}</span>
      </p>
      <ol className={`grid gap-x-8 @2xl:grid-cols-2 ${writing ? "writing" : ""}`}>
        {shown.map((guest, index) => (
          <GuestRow key={guest.ref} guest={guest} index={index} />
        ))}
      </ol>
      {guests.length > shown.length && (
        <p className="text-xs text-ink-dim">And {guests.length - shown.length} more on the page.</p>
      )}
    </div>
  );
}

function GuestRow({ guest, index }: { guest: Guest; index: number }) {
  const color = LABEL_HUE[guest.label];
  const sweet = guest.label === "sweet_spot";
  const { fit, love_back, reach } = guest.scores;
  const shared = guest.evidence?.shared_tastes.slice(0, 2) ?? [];
  return (
    <li
      className="rise grid h-16 grid-cols-[1.5rem_2.5rem_minmax(0,1fr)] items-center gap-x-3 border-b border-steel sm:grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_auto]"
      style={{ "--order": index } as CSSProperties}
    >
      <span className="readout text-sm text-ink-dim">{rank(index)}</span>
      <span
        className="relative size-10 rounded-full bg-well"
        style={{ boxShadow: sweet ? `0 0 0 2px var(--void), 0 0 0 3.5px ${color}` : "inset 0 0 0 1px var(--steel)" }}
      >
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <Picture guest={guest} sizes="40px" small />
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-display leading-tight font-semibold">{guest.name}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-dim">
          <Chip color={color}>{LABELS[guest.label].name}</Chip>
          {shared.length > 0 && <span className="truncate">Both love {shared.join(", ")}</span>}
        </span>
      </span>
      <Voiceprint
        fit={fit}
        love={love_back}
        reach={reach}
        bars={24}
        height={22}
        className="listen hidden w-20 sm:block"
      />
    </li>
  );
}

// The engine can list one person twice (two entities with one name); each name is shown once.
function distinct(people: Analysis["left_out"]): Analysis["left_out"] {
  return people.filter((person, index) => people.findIndex(({ name }) => name === person.name) === index);
}

function Caption({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="font-display text-lg leading-tight font-semibold">{title}</h3>
      {children && <span className="text-sm text-ink-dim">{children}</span>}
    </div>
  );
}

// The show's hosts and past guests as Echo takes them off the list: a count of each, then a badge per person with
// their initials, slashed through and faded one after another, hosts first.
function LeftOut({ people: all }: { people: Analysis["left_out"] }) {
  const people = distinct(all).sort((a, b) => Number(b.why === "host") - Number(a.why === "host"));
  const hosts = people.filter(({ why }) => why === "host").length;
  const past = people.length - hosts;
  const more = people.length > SHOWN_LEFT ? people.length - (SHOWN_LEFT - 1) : 0;
  const shown = more ? people.slice(0, SHOWN_LEFT - 1) : people;
  return (
    <div className="flex flex-col gap-5">
      <Caption title="Left out">Already on the show, so not new to your listeners</Caption>
      <dl className="flex gap-8">
        {[
          { term: hosts === 1 ? "host" : "hosts", count: hosts },
          { term: past === 1 ? "past guest" : "past guests", count: past },
        ].map(({ term, count }) => (
          <div key={term} className="flex items-baseline gap-2">
            <dd className="readout font-display text-3xl">{count}</dd>
            <dt className="text-sm text-ink-soft">{term}</dt>
          </div>
        ))}
      </dl>
      <ul className="grid max-w-[36rem] grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-x-3 gap-y-4">
        {shown.map(({ name, why }, index) => (
          <li
            key={`${name}-${index}`}
            className="rise flex flex-col items-center gap-1.5 text-center"
            style={{ "--order": index } as CSSProperties}
          >
            <span className="gone relative size-14" style={{ "--order": index } as CSSProperties}>
              <span
                className="flex size-full items-center justify-center rounded-full font-display font-semibold text-ink"
                style={{
                  background: why === "host" ? "color-mix(in srgb, var(--accent) 16%, var(--well))" : "var(--well)",
                  boxShadow: `inset 0 0 0 1px ${why === "host" ? "var(--ink-soft)" : "var(--steel-hi)"}`,
                }}
              >
                {initials(name)}
              </span>
              <svg aria-hidden viewBox="0 0 56 56" className="slash absolute inset-0 size-full overflow-visible">
                <line x1="10" y1="46" x2="46" y2="10" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="line-clamp-2 text-xs leading-tight text-ink-soft">{name}</span>
            <span className="-mt-1 text-[0.6875rem] text-ink-dim">{why === "host" ? "Host" : "Past guest"}</span>
          </li>
        ))}
        {more > 0 && (
          <li className="rise flex flex-col items-center gap-1.5" style={{ "--order": shown.length } as CSSProperties}>
            <span className="flex size-14 items-center justify-center rounded-full font-display text-sm font-semibold text-ink-soft shadow-[inset_0_0_0_1px_var(--steel)]">
              +{more}
            </span>
            <span className="text-xs text-ink-dim">more</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => /^\p{L}/u.test(word));
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? name).slice(0, 2)).toUpperCase();
}

// The guests as they're scored, dropping onto a small fit-by-reach chart: a dot per guest in its label's hue, bigger
// for more love back, with the box of high fit and reach where the sweet spots ring (components/scope.tsx).
function MiniScope({ guests }: { guests: Guest[] }) {
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const W = 300;
  const H = 180;
  const x = (reach: number) => 8 + reach * (W - 16);
  const y = (fit: number) => H - 8 - fit * (H - 16);
  return (
    <div className="flex flex-col gap-4">
      <Caption title={`${guests.length} guests, by fit and reach`}>
        {sweet ? `${sweet} sweet ${sweet === 1 ? "spot" : "spots"}, ringed` : "No sweet spot in this run"}
      </Caption>
      <div className="flex max-w-[34rem] gap-2">
        <span className="readout rotate-180 self-center text-xs text-fit [writing-mode:vertical-rl]">Fit →</span>
        <div className="flex flex-1 flex-col gap-1.5">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${guests.length} guests by fit and reach`}
            className="w-full overflow-visible"
          >
            <rect x="0" y="0" width={W} height={H} rx="10" fill="var(--steel)" fillOpacity="0.25" />
            <rect
              x={x(0.33)}
              y={4}
              width={W - 4 - x(0.33)}
              height={y(0.5) - 4}
              rx="8"
              fill="var(--sweet)"
              fillOpacity="0.1"
              stroke="var(--sweet)"
              strokeOpacity="0.45"
            />
            {guests.map((guest, index) => {
              const isSweet = guest.label === "sweet_spot";
              const cx = x(guest.scores.reach ?? 0);
              const cy = y(guest.scores.fit);
              const r = 3 + guest.scores.love_back * 4;
              return (
                <g key={guest.ref} className="dot-pop" style={{ animationDelay: `${index * 45}ms` }}>
                  {isSweet && (
                    <circle cx={cx} cy={cy} r={r + 2.5} fill="none" stroke="var(--sweet)" strokeWidth="1.2" />
                  )}
                  <circle cx={cx} cy={cy} r={r} fill={LABEL_HUE[guest.label]} fillOpacity={isSweet ? 1 : 0.85} />
                </g>
              );
            })}
          </svg>
          <span className="readout self-center text-xs text-reach">Reach →</span>
        </div>
      </div>
    </div>
  );
}

// How long the step on screen has run, once it's slower than SLOW_MS: the real time, counted from when it showed.
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  if (seconds * 1000 < SLOW_MS) return null;
  return <span className="fade readout shrink-0 text-xs text-ink-dim">{seconds} s</span>;
}

// Echo rings sounding from the show while it works, and the steps done as an arc around them.
function Radar({ label, done, total }: { label: string; done: number; total: number }) {
  const r = 120;
  const arc = 2 * Math.PI * (r + 14);
  return (
    <div aria-hidden className="relative m-auto size-72 shrink-0">
      <svg viewBox="-150 -150 300 300" className="absolute inset-0 size-full overflow-visible">
        {[0.33, 0.66, 1].map((t) => (
          <circle key={t} r={r * t} fill="none" stroke="var(--steel)" />
        ))}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="ring"
            r="12"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${i * 0.93}s` }}
          />
        ))}
        <circle r="7" fill="var(--accent)" />
        <circle r={r + 14} fill="none" stroke="var(--sweet)" strokeOpacity="0.16" strokeWidth="5" />
        <circle
          r={r + 14}
          fill="none"
          stroke="var(--sweet)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(arc * done) / Math.max(total, 1)} ${arc}`}
          transform="rotate(-90)"
          style={{ transition: "stroke-dasharray 600ms var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-x-0 -bottom-2 flex flex-col items-center">
        <span className="tag text-accent">{label}</span>
      </div>
    </div>
  );
}
