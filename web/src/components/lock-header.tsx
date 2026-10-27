"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import type { AgeBucket, Analysis, Fame, Filters } from "@/lib/echo";
import { AGES, filterPhrases, LABELS } from "@/lib/format";
import type { Pick } from "@/lib/picks";
import { AGE_ORDER, LABEL_ORDER, type Stats } from "@/lib/stats";
import type { Rerun } from "@/lib/use-analysis";

import { Chip, LABEL_HUE, RerunStatus } from "./hud";

// The show Echo has locked onto, with the filters it ran under. Used alone while a run goes, and as the
// left of the header once it's done.
// `filters` takes the place of the plain filter chips, for the finished run's controls.
export function ShowLock({
  analysis,
  filters: controls,
  children,
}: {
  analysis: Analysis;
  filters?: ReactNode;
  children?: ReactNode;
}) {
  const { show, filters } = analysis;
  const phrases = filterPhrases(filters);
  const unused = filters.episode_about && filters.episode_about.used === null && analysis.status === "done";
  return (
    <div className="flex min-w-0 items-start gap-5 sm:items-center sm:gap-6">
      <Cover>
        {show.image_url ? (
          <Image src={show.image_url} alt="" fill unoptimized sizes="128px" className="object-cover" />
        ) : (
          <span aria-hidden className="font-display text-5xl font-semibold text-ink-dim">
            {show.title.trim().charAt(0)}
          </span>
        )}
      </Cover>
      <div className="flex min-w-0 flex-col gap-2 py-1">
        <h1 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.01em] text-balance">
          {show.title}
        </h1>
        {show.description && <p className="line-clamp-2 max-w-[60ch] text-ink-soft">{show.description}</p>}
        {controls ??
          (phrases.length > 0 && (
            <ul aria-label="Filters" className="flex flex-wrap gap-1.5">
              {phrases.map((phrase) => (
                <li key={phrase}>
                  <Chip color="var(--accent)">{phrase}</Chip>
                </li>
              ))}
            </ul>
          ))}
        {unused && (
          <p className="text-sm text-ink-soft">
            Echo couldn&apos;t use &ldquo;{filters.episode_about?.query}&rdquo;, so these guests don&apos;t account for
            it.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

// The show's artwork, or its initial on a recessed surface.
function Cover({ children }: { children: ReactNode }) {
  return (
    <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-well shadow-pop sm:size-28">
      {children}
    </span>
  );
}

// The finished run at a glance: the show, its filters to change, how many guests are a sweet spot, and what
// that means.
export function LockHeader({
  analysis,
  stats,
  rerun,
  missing,
  onForget,
}: {
  analysis: Analysis;
  stats: Stats;
  rerun: Rerun;
  missing: Pick[];
  onForget: () => void;
}) {
  return (
    <section
      aria-label="This analysis"
      className="grid gap-x-16 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] @4xl:items-center"
    >
      <ShowLock
        analysis={analysis}
        filters={<FilterControls filters={analysis.filters} rerun={rerun} missing={missing} onForget={onForget} />}
      />
      <div className="flex flex-col gap-3">
        <p className="flex items-end gap-3">
          <span
            className="readout text-6xl leading-[0.8]"
            style={{ color: stats.sweet ? "var(--sweet)" : "var(--ink-soft)" }}
          >
            {stats.sweet}
          </span>
          <span className="font-display text-lg leading-tight font-semibold">
            sweet {stats.sweet === 1 ? "spot" : "spots"}
            <span className="block font-normal text-ink-dim">among {stats.guests} guests</span>
          </span>
        </p>
        <p className="text-sm text-ink-soft">
          A sweet spot is a guest your listeners already love, whose fans are new to you and likely to love your show
          back.
        </p>
      </div>
    </section>
  );
}

// How the guests split across the five labels: a block per guest in one row, and the legend.
export function LabelSpectrum({ stats, className = "" }: { stats: Stats; className?: string }) {
  const present = LABEL_ORDER.filter((label) => stats.labels[label] > 0);
  const blocks = LABEL_ORDER.flatMap((label) => Array.from({ length: stats.labels[label] }, () => label));
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div aria-hidden className="flex h-2 gap-1">
        {blocks.map((label, i) => (
          <span
            key={i}
            className="fade flex-1 rounded-full"
            style={
              { background: LABEL_HUE[label], opacity: label === "sweet_spot" ? 1 : 0.7, "--order": i } as CSSProperties
            }
          />
        ))}
      </div>
      <ul aria-label="Guests by label" className="flex flex-wrap gap-x-4 gap-y-1">
        {present.map((label) => (
          <li key={label} className="flex items-center gap-1.5 text-sm">
            <span aria-hidden className="size-2 rounded-full" style={{ background: LABEL_HUE[label] }} />
            <span className="text-ink-soft">{LABELS[label].name}</span>
            <span className="readout text-ink">{stats.labels[label]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The filters as a request, without what the engine filled in.
export function requestFilters(filters: Filters): Filters {
  const about = filters.episode_about;
  return { ...filters, episode_about: about && { query: about.query, type: about.type } };
}

const FAME_CHOICES: { value: Fame; name: string }[] = [
  { value: "any", name: "Any" },
  { value: "less_famous", name: "Less famous" },
  { value: "rising", name: "Rising" },
];

// Suggestions for the country field; the engine takes any place name it can find.
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Ireland",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Sweden",
  "Greece",
  "Brazil",
  "Mexico",
  "India",
  "Japan",
];

type Active = { key: string; phrase: string; without: Filters };

// Each filter that differs from the defaults, with the request that clears it.
function activeFilters(filters: Filters): Active[] {
  const base = requestFilters(filters);
  const phrase = (part: Partial<Filters>) => filterPhrases({ ...EMPTY, ...part })[0];
  const active: Active[] = [];
  if (base.fame !== "any")
    active.push({ key: "fame", phrase: phrase({ fame: base.fame }), without: { ...base, fame: "any" } });
  if (base.age) active.push({ key: "age", phrase: phrase({ age: base.age }), without: { ...base, age: null } });
  if (base.country)
    active.push({ key: "country", phrase: phrase({ country: base.country }), without: { ...base, country: null } });
  if (filters.episode_about)
    active.push({
      key: "about",
      phrase: phrase({ episode_about: filters.episode_about }),
      without: { ...base, episode_about: null },
    });
  if (base.theme)
    active.push({ key: "theme", phrase: phrase({ theme: base.theme }), without: { ...base, theme: null } });
  return active;
}

const EMPTY: Filters = { fame: "any", age: null, country: null, episode_about: null, theme: null };

const FROM = "filters";

// The run's filters as chips that each clear with a tap, and a small form to change fame, age and country.
// Either starts a new run of the same show; the page keeps these guests until it's done.
function FilterControls({
  filters,
  rerun,
  missing,
  onForget,
}: {
  filters: Filters;
  rerun: Rerun;
  missing: Pick[];
  onForget: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const active = activeFilters(filters);
  const busy = rerun.busy;

  // The form floats over the page (in its flow on a phone); a click outside it closes it.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={box} className="relative">
        <ul aria-label="Filters" className="flex flex-wrap items-center gap-1.5">
          {active.map(({ key, phrase, without }) => (
            <li key={key}>
              <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-deck py-0.5 pr-0.5 pl-3 text-xs font-medium text-ink ring-1 ring-steel">
                {phrase}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => rerun.start(without, FROM)}
                  aria-label={`Clear: ${phrase}`}
                  title="Clear"
                  className="flex size-7 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-deck-hi hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                >
                  <svg aria-hidden viewBox="0 0 12 12" className="size-2.5">
                    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-expanded={open}
              disabled={busy}
              onClick={() => setOpen(!open)}
              className={`btn btn-sm min-h-8 ${open ? "btn-solid" : ""}`}
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-3.5">
                <path
                  d="M2 4.5h7M13 4.5h1M2 11.5h1M7 11.5h7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="11" cy="4.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="5" cy="11.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {active.length ? "Change" : "Narrow the guests"}
            </button>
          </li>
        </ul>
        {open && (
          <FilterForm
            filters={filters}
            onRun={(next) => {
              setOpen(false);
              rerun.start(next, FROM);
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </div>
      <RerunStatus rerun={rerun} from={FROM} className="max-w-md" />
      {missing.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-soft">
          <span>
            {missing.length === 1 ? "Your pick" : "Your picks"} {listNames(missing.map(({ name }) => name))}{" "}
            {missing.length === 1 ? "isn't" : "aren't"} in this run
            {missing.every((pick) => pick.analysis && pick.ref)
              ? `. You can still invite ${missing.length === 1 ? "them" : "all of them"}.`
              : "."}
          </span>
          <button type="button" onClick={onForget} className="text-ink underline underline-offset-4 hover:text-brand">
            Unpick
          </button>
        </p>
      )}
    </div>
  );
}

function FilterForm({
  filters,
  onRun,
  onCancel,
}: {
  filters: Filters;
  onRun: (filters: Filters) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [fame, setFame] = useState<Fame>(filters.fame);
  const [age, setAge] = useState<AgeBucket | null>(filters.age);
  const [country, setCountry] = useState(filters.country ?? "");
  const place = country.trim();
  const changed = fame !== filters.fame || age !== filters.age || (place || null) !== filters.country;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || (place && place.length < 2)) return;
    onRun({ ...requestFilters(filters), fame, age, country: place || null });
  }

  return (
    <form
      data-filters
      onSubmit={submit}
      onKeyDown={(event) => event.key === "Escape" && onCancel()}
      className="rise mt-2 flex w-full flex-col sm:absolute sm:top-full sm:left-0 sm:z-30 sm:w-[34rem] gap-4 rounded-2xl bg-deck p-4 shadow-pop ring-1 ring-steel sm:p-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="tag mb-2 text-ink-dim">Fame</legend>
        <div className="flex flex-wrap gap-1">
          {FAME_CHOICES.map((choice) => (
            <label
              key={choice.value}
              className={`btn btn-sm cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-brand ${fame === choice.value ? "btn-solid" : ""}`}
            >
              <input
                type="radio"
                name={`${id}-fame`}
                value={choice.value}
                checked={fame === choice.value}
                onChange={() => setFame(choice.value)}
                className="sr-only"
              />
              {choice.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="tag text-ink-dim">Listeners&apos; age</span>
          <select
            value={age ?? ""}
            onChange={(event) => setAge((event.target.value || null) as AgeBucket | null)}
            className="field h-10 px-3 text-sm"
          >
            <option value="">Any age</option>
            {AGE_ORDER.map((bucket) => (
              <option key={bucket} value={bucket}>
                {AGES[bucket]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="tag text-ink-dim">Country</span>
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            list={`${id}-countries`}
            maxLength={60}
            placeholder="Any country"
            className="field h-10 px-3 text-sm"
          />
          <datalist id={`${id}-countries`}>
            {COUNTRIES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={!changed} className="btn btn-brand">
          Find new guests
        </button>
        <button type="button" onClick={onCancel} className="btn">
          Cancel
        </button>
      </div>
    </form>
  );
}

// Names as a sentence: "A", "A and B", "A, B and C".
function listNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
