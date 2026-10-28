"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import type { Analysis, Guest, MapRow, Step } from "@/lib/echo";
import { category, LABELS } from "@/lib/format";

import { Picture } from "./guest-list";
import { categoryHue, Chip, LABEL_HUE, Lamp, rank, SectionHead } from "./hud";
import { TasteImage } from "./taste-side";
import { Voiceprint } from "./voiceprint";

const SHOWN_GUESTS = 10;
const SHOWN_TASTES = 8;
const STRUCK = 3;

type View = "tastes" | "guests";

export function Rundown({
  analysis,
  picked,
  onPick,
}: {
  analysis: Analysis;
  picked: string[];
  onPick: (guestRef: string) => void;
}) {
  const { steps, audience_map: map, guests } = analysis;
  const current = steps.findIndex((step) => !step.done);
  const done = steps.filter((step) => step.done).length;
  const [chosen, setChosen] = useState<View | null>(null);
  const tastes = map.some((row) => row.items.length > 0);
  const view: View | null = guests.length ? (chosen ?? "guests") : tastes ? "tastes" : null;
  return (
    <section aria-labelledby="running" className="flex flex-col gap-4">
      <SectionHead id="running" title="Echo is running">
        <span className="text-accent">
          {done} / {steps.length}
        </span>
      </SectionHead>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-8 md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <ol className="flex flex-col">
          {steps.map((step, index) => {
            const on = index === current;
            const found = detail(step, analysis);
            return (
              <li
                key={step.key}
                aria-current={on ? "step" : undefined}
                className={`flex h-14 items-center gap-4 border-b border-steel last:border-b-0 ${step.done || on ? "text-ink" : "text-ink-dim"}`}
              >
                <span className="readout w-6 text-sm text-ink-dim">{String(index + 1).padStart(2, "0")}</span>
                <Lamp
                  color={step.done ? "var(--ink-soft)" : "var(--accent)"}
                  on={step.done || on}
                  className={`size-2.5 shrink-0 ${on ? "pulse" : ""}`}
                />
                <span className="flex min-w-0 flex-col">
                  <span className={`truncate ${on ? "font-semibold" : ""}`}>{step.label}</span>
                  {found && <span className="fade truncate text-xs text-ink-dim">{found}</span>}
                </span>
                <span className="sr-only">{step.done ? "(done)" : on ? "(running)" : "(waiting)"}</span>
              </li>
            );
          })}
        </ol>
        <div className="@container order-first flex min-h-[22rem] flex-col gap-4 md:order-none md:h-[31rem]">
          {view === null ? (
            <Radar label={current >= 0 ? steps[current].label : "Finishing"} done={done} total={steps.length} />
          ) : (
            <>
              <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
                <Tab on={view === "tastes"} onClick={() => guests.length && setChosen("tastes")}>
                  What your listeners love
                </Tab>
                <Tab on={view === "guests"} disabled={!guests.length} onClick={() => setChosen("guests")}>
                  {guests.length ? `First guests · ${guests.length}` : "Guests on the way"}
                </Tab>
              </div>
              {view === "tastes" ? (
                <Tastes map={map} />
              ) : (
                <FirstGuests
                  guests={guests}
                  picked={picked}
                  onPick={onPick}
                  writing={steps.some((step) => step.key === "ideas" && !step.done)}
                />
              )}
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-ink-soft">
        It usually takes under a minute. The page opens by itself when it&apos;s done.
      </p>
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
      if (!leftOut.length) return "Nobody to leave out";
      const struck = leftOut.slice(0, STRUCK);
      const more = leftOut.length - struck.length;
      return (
        <>
          Left out{" "}
          {struck.map(({ name }, index) => (
            <span key={`${name}-${index}`}>
              <s className="decoration-ink-dim">{name}</s>
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

function Tab({
  on,
  disabled = false,
  onClick,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-9 items-center rounded-full px-3.5 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        on ? "bg-ink text-void" : "text-ink-soft ring-1 ring-steel hover:bg-deck-hi hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

type Lit = { name: string; category: string; place: number };

function Tastes({ map }: { map: MapRow[] }) {
  const [lit, setLit] = useState<Lit | null>(null);
  const rows = map.filter((row) => row.items.length > 0);
  return (
    <div className="flex flex-col gap-4">
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

function FirstGuests({
  guests,
  picked,
  onPick,
  writing,
}: {
  guests: Guest[];
  picked: string[];
  onPick: (guestRef: string) => void;
  writing: boolean;
}) {
  const shown = guests.slice(0, SHOWN_GUESTS);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        {writing ? "Echo is writing their episode ideas. " : ""}Pick anyone you like now: your picks stay when the page
        opens.
      </p>
      <ol className="grid gap-x-8 @2xl:grid-cols-2">
        {shown.map((guest, index) => (
          <GuestRow
            key={guest.ref}
            guest={guest}
            index={index}
            picked={picked.includes(guest.ref)}
            onPick={() => onPick(guest.ref)}
          />
        ))}
      </ol>
      {guests.length > shown.length && (
        <p className="text-xs text-ink-dim">And {guests.length - shown.length} more on the page.</p>
      )}
    </div>
  );
}

function GuestRow({
  guest,
  index,
  picked,
  onPick,
}: {
  guest: Guest;
  index: number;
  picked: boolean;
  onPick: () => void;
}) {
  const color = LABEL_HUE[guest.label];
  const sweet = guest.label === "sweet_spot";
  const { fit, love_back, reach } = guest.scores;
  const shared = guest.evidence?.shared_tastes.slice(0, 2) ?? [];
  return (
    <li
      className="rise grid h-16 grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_2.25rem] items-center gap-x-3 border-b border-steel sm:grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_auto_2.25rem]"
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
      <Voiceprint fit={fit} love={love_back} reach={reach} bars={24} height={22} className="hidden w-20 sm:block" />
      <button
        type="button"
        onClick={onPick}
        aria-pressed={picked}
        title={picked ? "Picked to invite" : "Pick to invite"}
        className={`flex size-9 items-center justify-center rounded-full transition-colors ${
          picked
            ? "bg-ink text-on-hue"
            : "text-ink-soft shadow-[inset_0_0_0_1px_var(--steel-hi)] hover:bg-deck-hi hover:text-ink"
        }`}
      >
        <span className="sr-only">
          {picked ? "Picked to invite" : "Pick to invite"} {guest.name}
        </span>
        <svg aria-hidden viewBox="0 0 12 12" className="size-3">
          {picked ? (
            <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          ) : (
            <path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          )}
        </svg>
      </button>
    </li>
  );
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
