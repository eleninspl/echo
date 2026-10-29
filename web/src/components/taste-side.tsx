"use client";

import Image from "next/image";
import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import { echo, type AgeBucket, type Analysis, type AnchorType, type Guest, type Lens, type MapItem } from "@/lib/echo";
import type { HostError } from "@/lib/errors";
import { AGES, category as categoryName, LABELS, SHORT_AGE } from "@/lib/format";
import type { Ask } from "@/lib/pointer";
import { AGE_ORDER } from "@/lib/stats";
import type { Side, Spot } from "@/lib/taste-layout";
import type { Rerun } from "@/lib/use-analysis";
import { useFetched } from "@/lib/use-fetched";

import { Picture } from "./guest-list";
import { categoryHue, Chip, hue, LABEL_HUE, Lamp, RerunStatus } from "./hud";
import { requestFilters } from "./lock-header";
import { Track } from "./spectrum";

const ANCHOR: Partial<Record<string, AnchorType>> = { music: "artist", film: "movie", tv: "tv_show", brands: "brand" };
export const FROM = "tastes";
const FANS_SHOWN = 5;
const STRIP = 10;
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Ireland",
  "New Zealand",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Sweden",
  "Brazil",
  "Mexico",
  "India",
  "Japan",
  "South Africa",
  "Nigeria",
];

export const pull = (affinity: number) => Math.round(affinity * 100);

const place = (rank: number) => (rank === 0 ? "Top" : (["2nd", "3rd"][rank - 1] ?? `${rank + 1}th`));

export function lensWords({ age, country }: Lens): string {
  if (!age && !country) return "Your listeners";
  const parts = ["Listeners"];
  if (age) parts.push(AGES[age].toLowerCase());
  if (country) parts.push(`in ${country}`);
  return parts.join(" ");
}

const SIDE_WORDS: Record<Side, { name: string; color: string; means: (guest: string) => string }> = {
  yours: {
    name: "Only your listeners",
    color: "var(--fit)",
    means: (guest) => `Your listeners lean to it; ${guest}'s fans don't, as much.`,
  },
  both: {
    name: "Both love it",
    color: "var(--sweet)",
    means: (guest) => `Your listeners and ${guest}'s fans both lean to it: common ground for the episode.`,
  },
  theirs: {
    name: "New to you",
    color: "var(--reach)",
    means: (guest) => `${guest}'s fans lean to it and your listeners don't yet: what they'd bring to your show.`,
  },
};

export function sideOf(where: Side) {
  return SIDE_WORDS[where];
}

export function LensBar({
  lens,
  onLens,
  problem,
}: {
  lens: Lens;
  onLens: (lens: Lens) => void;
  problem: HostError | null;
}) {
  const stops: (AgeBucket | null)[] = [null, ...AGE_ORDER];
  const index = stops.indexOf(lens.age);
  const [typed, setTyped] = useState(lens.country ?? "");
  const [seen, setSeen] = useState(lens.country);
  if (lens.country !== seen) {
    setSeen(lens.country);
    setTyped(lens.country ?? "");
  }

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(Math.max(index + step, 0), stops.length - 1);
    onLens({ ...lens, age: stops[next] });
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
  }

  function setCountry(value: string) {
    const country = value.trim().replace(/\s+/g, " ");
    if (country.length === 1 || country.length > 60) return;
    onLens({ ...lens, country: country || null });
  }

  return (
    <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-end @2xl:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span id="lens-age" className="tag text-ink-dim">
          Listeners by age
        </span>
        <div
          role="radiogroup"
          aria-labelledby="lens-age"
          onKeyDown={keys}
          className="relative grid grid-cols-7 rounded-full bg-deck p-1 shadow-[inset_0_0_0_1px_var(--steel)]"
        >
          <span
            aria-hidden
            className="absolute inset-y-1 rounded-full bg-accent transition-[left] duration-300 ease-(--ease-out) motion-reduce:transition-none"
            style={{ left: `calc(0.25rem + ${index} * (100% - 0.5rem) / 7)`, width: "calc((100% - 0.5rem) / 7)" }}
          />
          {stops.map((age, i) => {
            const on = i === index;
            return (
              <button
                key={age ?? "all"}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={age ? AGES[age] : "All ages"}
                tabIndex={on ? 0 : -1}
                onClick={() => onLens({ ...lens, age })}
                className={`relative min-h-10 rounded-full px-1 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm ${on ? "text-on-hue" : "text-ink-soft hover:text-ink"}`}
              >
                {age ? SHORT_AGE[age] : "All"}
              </button>
            );
          })}
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setCountry(typed);
        }}
        className="flex flex-col gap-1.5 @2xl:w-64"
      >
        <label htmlFor="lens-country" className="tag text-ink-dim">
          Listeners in
        </label>
        <div className="flex min-h-12 items-center gap-1 rounded-full bg-deck py-1 pr-1 pl-4 shadow-[inset_0_0_0_1px_var(--steel)] focus-within:shadow-[inset_0_0_0_1px_var(--accent)]">
          <input
            id="lens-country"
            list="lens-countries"
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              if (COUNTRIES.includes(event.target.value)) setCountry(event.target.value);
            }}
            placeholder="Every country"
            maxLength={60}
            aria-invalid={problem?.code === "unknown_country" || undefined}
            aria-describedby={problem ? "lens-problem" : undefined}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-dim focus-visible:outline-none!"
          />
          <datalist id="lens-countries">
            {COUNTRIES.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
          {lens.country ? (
            <button
              type="button"
              onClick={() => {
                setTyped("");
                onLens({ ...lens, country: null });
              }}
              aria-label={`Every country, not only ${lens.country}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-deck-hi hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 12 12" className="size-3">
                <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={typed.trim().length < 2}
              className="rounded-full px-3 py-2 text-sm font-semibold text-accent disabled:text-ink-dim"
            >
              Show
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export function EchoNote({ names, onClear }: { names: string[]; onClear: () => void }) {
  return (
    <p
      role="status"
      className="rise flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-brand/10 px-4 py-2.5 text-sm shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_35%,transparent)]"
    >
      <Lamp color="var(--brand)" className="pulse size-2" />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">Ask Echo lit up</span> {joined(shortened(names))}.
      </span>
      <button type="button" onClick={onClear} className="font-semibold text-accent underline-offset-2 hover:underline">
        Clear
      </button>
    </p>
  );
}

export function Overview({
  rows,
  focus,
  onFocus,
  guests,
  onBridge,
}: {
  rows: { category: string; items: MapItem[] }[];
  focus: string | null;
  onFocus: (category: string | null) => void;
  guests: Guest[];
  onBridge: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-soft">
        Each circle is something your listeners like more than most people do. The closer to your show and the bigger,
        the stronger the pull. Pick one to see whose fans like it too.
      </p>
      <ul className="flex flex-col border-t border-steel">
        {rows.map((row) => {
          const on = focus === row.category;
          return (
            <li key={row.category} className="border-b border-steel">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onFocus(on ? null : row.category)}
                className={`flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-deck/70 ${on ? "bg-deck/70" : ""}`}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: categoryHue(row.category) }}
                />
                <span className="font-display font-semibold">{categoryName(row.category)}</span>
                <span className="min-w-0 flex-1 truncate text-right text-sm text-ink-dim">{row.items[0].name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <GuestStrip guests={guests} current={null} onBridge={onBridge} />
    </div>
  );
}

export function GuestStrip({
  guests,
  current,
  onBridge,
}: {
  guests: Guest[];
  current: string | null;
  onBridge: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex flex-col gap-0.5">
        <span className="font-display font-semibold">Their fans next to yours</span>
        <span className="text-sm text-ink-dim">Pick a guest to see what both audiences love and what theirs adds.</span>
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {guests.slice(0, STRIP).map((guest) => {
          const on = guest.id === current;
          return (
            <li key={guest.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onBridge(guest.id)}
                title={guest.name}
                className={`group relative block size-11 overflow-hidden rounded-full bg-well transition-[box-shadow,scale] duration-200 ease-(--ease-out) hover:scale-110 ${on ? "scale-110" : ""}`}
                style={{
                  boxShadow: on
                    ? `0 0 0 2px var(--void), 0 0 0 4px var(--reach)`
                    : `inset 0 0 0 1px var(--steel), 0 0 0 1.5px ${LABEL_HUE[guest.label]}`,
                }}
              >
                <Picture guest={guest} sizes="44px" small />
                <span className="sr-only">{guest.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LensSide({
  lens,
  fresh,
  gone,
  loading,
  problem,
  onRetry,
  onClear,
}: {
  lens: Lens;
  fresh: string[];
  gone: string[];
  loading: boolean;
  problem: HostError | null;
  onRetry: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={onClear}>All listeners</BackButton>
      <div>
        <p className="tag text-ink-dim">The map for</p>
        <p className="mt-1 font-display text-2xl leading-tight font-semibold text-balance">{lensWords(lens)}</p>
      </div>
      {problem ? (
        <div id="lens-problem" role="alert" className="flex flex-col items-start gap-2">
          <p className="font-semibold text-alert">{problem.title}</p>
          <p className="text-sm text-ink-soft">{problem.message}</p>
          {problem.next === "retry" && (
            <button type="button" onClick={onRetry} className="btn">
              Try again
            </button>
          )}
        </div>
      ) : loading ? (
        <p aria-busy className="flex items-center gap-3 text-ink-soft">
          <Lamp color="var(--brand)" className="pulse size-2" />
          Mapping these listeners…
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            What this group of your listeners likes more than most people do. Circles that moved in grew stronger here;
            ones that drifted out matter less to them.
          </p>
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-semibold">
              <span aria-hidden className="size-2.5 rounded-full bg-sweet" />
              New for this group
              <span className="readout text-sm text-ink-dim">{fresh.length}</span>
            </p>
            {fresh.length ? (
              <span className="flex flex-wrap gap-1.5">
                {fresh.slice(0, 8).map((name) => (
                  <Chip key={name} color="var(--sweet)" plain>
                    {name}
                  </Chip>
                ))}
              </span>
            ) : (
              <p className="text-sm text-ink-dim">The same tastes as all your listeners.</p>
            )}
          </div>
          {gone.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Less of a pull for them</p>
              <p className="text-sm text-ink-dim">{joined(gone.slice(0, 6))}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BridgeSide({
  guest,
  totals,
  focus,
  categories,
  loading,
  problem,
  onRetry,
  onFocus,
  onBack,
  onOpen,
  guests,
  onBridge,
}: {
  guest: Guest;
  totals: Record<Side, number> | null;
  focus: string | null;
  categories: string[];
  loading: boolean;
  problem: HostError | null;
  onRetry: () => void;
  onFocus: (category: string | null) => void;
  onBack: () => void;
  onOpen: (ref: string) => void;
  guests: Guest[];
  onBridge: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={onBack}>Only your listeners</BackButton>
      <div className="flex items-center gap-4">
        <span
          className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-well"
          style={{ boxShadow: `inset 0 0 0 1px var(--steel)` }}
        >
          <Picture guest={guest} sizes="64px" />
        </span>
        <div className="min-w-0">
          <Chip color={LABEL_HUE[guest.label]}>{LABELS[guest.label].name}</Chip>
          <p className="mt-1 font-display text-2xl leading-tight font-semibold text-balance">{guest.name}</p>
        </div>
      </div>
      {problem ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="font-semibold text-alert">{problem.title}</p>
          <p className="text-sm text-ink-soft">{problem.message}</p>
          {problem.next === "retry" && (
            <button type="button" onClick={onRetry} className="btn">
              Try again
            </button>
          )}
        </div>
      ) : loading || !totals ? (
        <p aria-busy className="flex items-center gap-3 text-ink-soft">
          <Lamp color="var(--brand)" className="pulse size-2" />
          Mapping their fans…
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            {(["both", "yours", "theirs"] as Side[]).map((where) => (
              <div
                key={where}
                className="flex flex-col gap-1 border-t-2 pt-2"
                style={{ borderColor: SIDE_WORDS[where].color }}
              >
                <dt className="text-xs leading-tight text-ink-dim">{SIDE_WORDS[where].name}</dt>
                <dd className="readout text-3xl">{totals[where]}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-ink-soft">
            Left, what only your listeners love; in the middle, what both audiences love; right, what {guest.name}
            &apos;s fans would bring. {focus ? "" : "The top three of each category; pick one for more."}
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
            {[null, ...categories].map((key) => {
              const on = focus === key;
              return (
                <button
                  key={key ?? "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onFocus(key)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${on ? "bg-accent text-on-hue" : "bg-deck text-ink-soft hover:bg-deck-hi hover:text-ink"}`}
                >
                  {key && <span aria-hidden className="size-2 rounded-full" style={{ background: categoryHue(key) }} />}
                  {key ? categoryName(key) : "All"}
                </button>
              );
            })}
          </div>
        </>
      )}
      <button type="button" onClick={() => onOpen(guest.ref)} className="btn self-start">
        Open {guest.name}
      </button>
      <div className="border-t border-steel pt-5">
        <GuestStrip guests={guests} current={guest.id} onBridge={onBridge} />
      </div>
    </div>
  );
}

export function TasteSide({
  analysis,
  spot,
  lens,
  bridged,
  rerun,
  onBack,
  onAsk,
  onOpen,
}: {
  analysis: Analysis;
  spot: Spot;
  lens: Lens;
  bridged: Guest | null;
  rerun: Rerun;
  onBack: () => void;
  onAsk: (ask: Ask) => void;
  onOpen: (ref: string) => void;
}) {
  const color = categoryHue(spot.category);
  const anchor = spot.side === "theirs" ? undefined : ANCHOR[spot.category];
  const busy = rerun.busy && rerun.from === FROM;
  const ours = spot.side !== "theirs";
  const where = spot.side ? SIDE_WORDS[spot.side] : null;
  return (
    <div key={spot.key} className="rise flex flex-col gap-5">
      <BackButton onClick={onBack}>All tastes</BackButton>
      <div className="flex items-center gap-4">
        <span
          className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-well"
          style={{ boxShadow: `inset 0 0 0 1px var(--steel)` }}
        >
          <TasteImage item={spot.item} color={color} large />
        </span>
        <div className="min-w-0">
          <Chip color={color}>{categoryName(spot.category)}</Chip>
          <p className="mt-1 font-display text-2xl leading-tight font-semibold text-balance">{spot.item.name}</p>
        </div>
      </div>
      {where && bridged ? (
        <p className="text-sm text-ink-soft">
          <span className="font-semibold" style={{ color: where.color }}>
            {where.name}.
          </span>{" "}
          {where.means(bridged.name)}
        </p>
      ) : (
        <div className="flex flex-col gap-1" style={hue(color)}>
          <p className="flex items-baseline justify-between gap-3">
            <span className="tag text-ink-dim">How strongly {lensWords(lens).toLowerCase()} lean to it</span>
            <span className="readout text-3xl">{pull(spot.item.affinity)}</span>
          </p>
          <Track share={spot.item.affinity} order={0} />
          <p className="mt-1.5 text-sm text-ink-dim">
            {place(spot.rank)} of {spot.count} in {categoryName(spot.category)}.
          </p>
        </div>
      )}
      {ours && (
        <TasteFans analysis={analysis} name={spot.item.name} category={spot.category} lens={lens} onOpen={onOpen} />
      )}
      {ours && (
        <button
          type="button"
          onClick={() =>
            onAsk({
              text: `Whose fans like ${spot.item.name} too, and what episode could we build on it?`,
              taste: { category: spot.category, name: spot.item.name, age: lens.age, country: lens.country },
            })
          }
          className="btn self-start"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-4">
            <path
              d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          Ask Echo about it
        </button>
      )}
      {anchor ? (
        <div className="flex flex-col gap-2.5 border-t border-steel pt-5">
          <button
            type="button"
            disabled={rerun.busy}
            onClick={() =>
              rerun.start(
                { ...requestFilters(analysis.filters), episode_about: { query: spot.item.name, type: anchor } },
                FROM,
              )
            }
            className="btn btn-brand min-h-12 px-5 text-base text-balance"
          >
            {busy ? "Finding guests…" : `Find guests for an episode about ${spot.item.name}`}
          </button>
          {busy || (rerun.from === FROM && rerun.error) ? (
            <RerunStatus rerun={rerun} from={FROM} />
          ) : (
            <p className="text-sm text-ink-dim">Echo runs again with {spot.item.name} as the episode&apos;s subject.</p>
          )}
        </div>
      ) : (
        ours && (
          <p className="border-t border-steel pt-5 text-sm text-ink-dim">
            Echo can build an episode around a film, a TV show, an artist or a brand.
          </p>
        )
      )}
    </div>
  );
}

function TasteFans({
  analysis,
  name,
  category,
  lens,
  onOpen,
}: {
  analysis: Analysis;
  name: string;
  category: string;
  lens: Lens;
  onOpen: (ref: string) => void;
}) {
  const taste = { category, name, age: lens.age, country: lens.country };
  const fans = useFetched(`${analysis.id}|fans|${category}|${name}|${lens.age ?? ""}|${lens.country ?? ""}`, (signal) =>
    echo.tasteFans(analysis.id, taste, signal),
  );
  const guests = new Map(analysis.guests.map((guest) => [guest.ref, guest]));
  const ranked = (fans.value?.guests ?? []).filter((fan) => guests.has(fan.ref));
  const values = ranked.map((fan) => fan.affinity);
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  return (
    <div className="flex flex-col gap-2.5 border-t border-steel pt-5">
      <p className="flex flex-col gap-0.5">
        <span className="font-display font-semibold">Guests its fans like most</span>
        <span className="text-sm text-ink-dim">
          Of these {analysis.guests.length} guests, the ones people who love it lean to.
        </span>
      </p>
      {fans.problem ? (
        <p role="alert" className="text-sm">
          <span className="font-semibold text-alert">{fans.problem.title}.</span>{" "}
          <span className="text-ink-soft">{fans.problem.message}</span>
        </p>
      ) : fans.loading ? (
        <ul aria-busy className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="h-11 animate-pulse rounded-xl bg-deck/70" />
          ))}
        </ul>
      ) : ranked.length ? (
        <ol className="flex flex-col">
          {ranked.slice(0, FANS_SHOWN).map((fan, index) => {
            const guest = guests.get(fan.ref) as Guest;
            return (
              <li key={fan.ref} className="rise" style={{ "--order": index } as CSSProperties}>
                <button
                  type="button"
                  onClick={() => onOpen(fan.ref)}
                  className="group flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-deck/70"
                >
                  <span className="readout w-5 text-xs text-ink-dim">{index + 1}</span>
                  <span
                    className="relative size-9 shrink-0 overflow-hidden rounded-full bg-well"
                    style={{ boxShadow: `0 0 0 1.5px ${LABEL_HUE[guest.label]}` }}
                  >
                    <Picture guest={guest} sizes="36px" small />
                  </span>
                  <span className="min-w-0 flex-1" style={hue("var(--fit)")}>
                    <span className="block truncate text-sm font-semibold group-hover:underline">{guest.name}</span>
                    <Track share={0.15 + 0.85 * ((fan.affinity - low) / span)} order={index} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-ink-dim">
          Echo can&apos;t tell whose fans like this one: there&apos;s too little data on it.
        </p>
      )}
    </div>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tag flex items-center gap-1.5 self-start text-ink-dim hover:text-ink"
    >
      <svg aria-hidden viewBox="0 0 12 12" className="size-3">
        <path d="M10 6H2M5.5 2.5L2 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {children}
    </button>
  );
}

export function TasteImage({ item, color, large = false }: { item: MapItem; color: string; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const picture = item.image_url && !broken;
  // The initial on the category's tint, under the picture until it loads and behind a logo's transparent parts.
  return (
    <>
      <span
        aria-hidden
        className={`flex size-full items-center justify-center font-display font-semibold text-ink ${large ? "text-4xl" : "text-xs"}`}
        style={{ background: `color-mix(in srgb, ${color} 30%, var(--well))` }}
      >
        {picture && loaded ? "" : item.name.charAt(0)}
      </span>
      {picture && (
        <Image
          src={item.image_url as string}
          alt=""
          fill
          unoptimized
          loading="eager"
          sizes={large ? "96px" : "64px"}
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
          className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}

function shortened(names: string[]): string[] {
  const short = names.map((name) => name.split(/[:(]/)[0].trim() || name);
  return short.length > 3 ? [...short.slice(0, 3), `${short.length - 3} more`] : short;
}

function joined(names: string[]): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
