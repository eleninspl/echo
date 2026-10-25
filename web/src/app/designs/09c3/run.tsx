"use client";

import Link from "next/link";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import type { Analysis, Featured, Guest, Label } from "@/lib/echo";
import { LABELS, score as out100 } from "@/lib/format";
import { LABEL_ORDER } from "@/lib/stats";

import { Cover, CoverDisc } from "./cover";
import { Dial } from "./dial";
import { INK, SCORES, SWEET_SPOT, TONE, type Part } from "./parts";
import { useRun } from "./runs";
import { OverlapDiagram } from "./scoring";

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";
const ROW =
  "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 lg:grid-cols-[1.75rem_minmax(0,1fr)_7.25rem_7.25rem_7.25rem_5.25rem]";

type SortKey = "rank" | (typeof SCORES)[number]["field"];

export function RunSection() {
  const featured = useFeatured();
  const [chosen, setChosen] = useState(0);

  if (featured && featured.length === 0) return <ScoresOnly />;

  const index = featured ? Math.min(chosen, featured.length - 1) : 0;
  const current = featured?.[index] ?? null;
  const tabbed = (featured?.length ?? 0) > 1;

  return (
    <section
      id="runs"
      aria-labelledby="w3-runs"
      className="scroll-mt-2 border-t border-(--w3-rule)"
    >
      <div className={`${FRAME} pt-10 pb-16 sm:pb-20`}>
        <h2
          id="w3-runs"
          className="text-[1.375rem] leading-tight font-semibold tracking-[-0.01em]"
        >
          Shows Echo has run
        </h2>
        <p className="mt-1 max-w-[62ch] text-(--w3-soft) xl:max-w-none">
          Real output, as the engine returned it. Search for your show above to
          get a shortlist like this one.
        </p>
        {featured && tabbed && (
          <RunTabs featured={featured} chosen={index} onChoose={setChosen} />
        )}
        <RunPanel
          key={current?.analysis_id ?? "waiting"}
          item={current}
          tabbed={tabbed}
          tabId={tabbed ? `w3-tab-${index}` : undefined}
        />
      </div>
    </section>
  );
}

function RunTabs({
  featured,
  chosen,
  onChoose,
}: {
  featured: Featured[];
  chosen: number;
  onChoose: (index: number) => void;
}) {
  function move(event: KeyboardEvent<HTMLButtonElement>) {
    const shift =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!shift) return;
    event.preventDefault();
    const next = (chosen + shift + featured.length) % featured.length;
    onChoose(next);
    document.getElementById(`w3-tab-${next}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Shows Echo has run"
      className="mt-6 grid grid-cols-2 gap-1 sm:flex sm:gap-0"
    >
      {featured.map((item, index) => {
        const selected = index === chosen;
        return (
          <button
            key={item.analysis_id}
            id={`w3-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="w3-run"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChoose(index)}
            onKeyDown={move}
            className={`relative flex min-w-0 items-center gap-2.5 rounded-[3px] border px-3 py-2 text-left sm:max-w-[16rem] sm:rounded-b-none ${
              selected
                ? "z-10 border-(--w3-rule) bg-(--w3-paper) sm:-mb-px sm:border-b-(--w3-paper)"
                : "border-(--w3-line) text-(--w3-soft) hover:text-(--w3-ink) sm:border-transparent"
            }`}
          >
            <Cover show={item.show} size={28} />
            <span className="truncate text-[0.9375rem] font-semibold">
              {item.show.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RunPanel({
  item,
  tabbed,
  tabId,
}: {
  item: Featured | null;
  tabbed: boolean;
  tabId?: string;
}) {
  const run = useRun(item?.analysis_id ?? null);
  const [active, setActive] = useState<string | null>(null);
  const analysis = run.state === "ready" ? run.analysis : null;
  const guests = analysis?.guests ?? null;
  const sweet = guests?.filter((guest) => guest.label === "sweet_spot").length;

  return (
    <article
      id="w3-run"
      role={tabbed ? "tabpanel" : undefined}
      aria-labelledby={tabId}
      className={`mt-6 rounded-[3px] border border-(--w3-rule) bg-(--w3-paper) ${tabbed ? "sm:mt-0 sm:rounded-tl-none" : ""}`}
    >
      <PanelHead item={item} analysis={analysis} />
      <div className="grid grid-cols-1 xl:grid-cols-[28rem_minmax(0,1fr)]">
        <div className="border-b border-(--w3-line) px-4 py-6 sm:px-8 sm:py-8 xl:border-r xl:border-b-0">
          <figure className="md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-center md:gap-10 xl:sticky xl:top-6 xl:block">
            <div className="relative mx-auto aspect-square w-full max-w-[24rem]">
              <Dial
                guests={guests}
                active={active}
                label={
                  item && guests
                    ? `${shorten(item.show.title)} · ${guests.length} GUESTS · ${sweet} SWEET ${sweet === 1 ? "SPOT" : "SPOTS"} ·`
                    : undefined
                }
              />
              <div className="absolute top-1/2 left-1/2 w-[27%] -translate-x-1/2 -translate-y-1/2">
                <CoverDisc show={item?.show ?? null} />
              </div>
              {!guests && (
                <p className="absolute inset-x-0 bottom-[8%] text-center text-[0.875rem] text-(--w3-dim)">
                  {run.state === "failed"
                    ? "This run didn't load"
                    : "Loading the run"}
                </p>
              )}
            </div>
            <figcaption className="mt-5 text-[0.875rem] leading-relaxed text-(--w3-soft) md:mt-0 xl:mt-5">
              One spoke per guest, numbered by rank, clockwise from the top.
              Its three bars are <Word part="fit">fit</Word>,{" "}
              <Word part="love">love back</Word> and{" "}
              <Word part="reach">reach</Word>, out of 100. Sweet spots are drawn
              solid, with a bar at the base.{" "}
              <span className="hidden xl:inline">
                Point at a guest in the shortlist to find their spoke.
              </span>
            </figcaption>
          </figure>
        </div>
        <Shortlist
          run={run.state}
          item={item}
          guests={guests}
          active={active}
          onActive={setActive}
        />
      </div>
      <div className="grid grid-cols-1 border-t border-(--w3-rule) md:grid-cols-2 xl:grid-cols-[28rem_minmax(0,1fr)]">
        <div className="border-b border-(--w3-line) px-4 py-6 sm:px-8 sm:py-8 md:border-r md:border-b-0">
          <ScoreKey />
        </div>
        {analysis && (
          <Verdicts guests={analysis.guests} leftOut={analysis.left_out} />
        )}
      </div>
    </article>
  );
}

function shorten(title: string) {
  const clean = title.trim().toUpperCase();
  return clean.length > 24 ? `${clean.slice(0, 23).trimEnd()}…` : clean;
}

function Word({ part, children }: { part: Part; children: ReactNode }) {
  return (
    <span className="font-semibold" style={{ color: INK[part] }}>
      {children}
    </span>
  );
}

function PanelHead({
  item,
  analysis,
}: {
  item: Featured | null;
  analysis: Analysis | null;
}) {
  const guests = analysis?.guests;
  const leftOut = analysis?.left_out ?? [];
  const hosts = leftOut.filter((person) => person.why === "host").length;
  const past = leftOut.length - hosts;
  const leftOutNote = [
    hosts ? `${hosts} ${hosts === 1 ? "host" : "hosts"}` : null,
    past ? `${past} past ${past === 1 ? "guest" : "guests"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <header className="flex flex-col gap-6 border-b border-(--w3-rule) px-4 py-5 sm:px-8 sm:py-6 xl:flex-row xl:items-center xl:justify-between xl:gap-10">
      <div className="flex min-w-0 items-center gap-4">
        {item ? (
          <Cover show={item.show} size={60} />
        ) : (
          <span className="w3-wait size-[60px] shrink-0 rounded-[3px] bg-(--w3-well)" />
        )}
        <div className="min-w-0">
          <h3 className="w3-serif text-[1.625rem] leading-tight font-medium tracking-[-0.01em] sm:text-[1.875rem]">
            {item ? item.show.title : "Loading a run"}
          </h3>
          {item?.show.description && (
            <p className="mt-0.5 text-[0.9375rem] text-(--w3-soft)">
              {item.show.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 xl:justify-end">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:gap-0">
          <Stat term="Guests scored" value={guests?.length} first />
          <Stat
            term="Sweet spots"
            value={guests?.filter((guest) => guest.label === "sweet_spot").length}
          />
          <Stat
            term="Left out"
            value={analysis ? leftOut.length : undefined}
            note={leftOutNote || undefined}
          />
          <Stat term="Qloo calls" value={analysis?.qloo_calls.length} />
        </dl>
        {item && (
          <Link
            href={`/analyses/${encodeURIComponent(item.analysis_id)}`}
            className="group inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-[3px] bg-(--w3-ink) px-4 text-[0.9375rem] font-semibold text-(--w3-on-ink) transition-colors hover:bg-(--w3-ink-hover) sm:self-center"
          >
            Open the full run
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="size-4 transition-transform group-hover:translate-x-0.5"
              focusable="false"
            >
              <path
                d="M3 8h9.5M8.5 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
              />
            </svg>
          </Link>
        )}
      </div>
    </header>
  );
}

function Stat({
  term,
  value,
  note,
  first = false,
}: {
  term: string;
  value: number | undefined;
  note?: string;
  first?: boolean;
}) {
  return (
    <div
      className={`flex flex-col ${first ? "sm:pr-6" : "sm:border-l sm:border-(--w3-line) sm:px-6"}`}
    >
      <dt className="text-[0.8125rem] whitespace-nowrap text-(--w3-soft)">
        {term}
      </dt>
      <dd
        className={`w3-figure mt-0.5 text-[2rem] leading-none font-semibold ${value === undefined ? "w3-wait text-(--w3-dim)" : ""}`}
      >
        {value ?? "–"}
      </dd>
      {note && (
        <dd className="mt-1 text-[0.75rem] whitespace-nowrap text-(--w3-dim)">
          {note}
        </dd>
      )}
    </div>
  );
}

function ScoreKey() {
  return (
    <div id="scores" className="scroll-mt-6">
      <h4 className="text-[1.0625rem] font-semibold">How Echo scores a guest</h4>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-(--w3-soft)">
        Two audiences, measured in both directions.
      </p>
      <OverlapDiagram className="mt-4 block h-auto w-full max-w-[24rem]" />
    </div>
  );
}

function Shortlist({
  run,
  item,
  guests,
  active,
  onActive,
}: {
  run: "loading" | "ready" | "failed";
  item: Featured | null;
  guests: Guest[] | null;
  active: string | null;
  onActive: (ref: string | null) => void;
}) {
  const [sort, setSort] = useState<SortKey>("rank");
  const ranked = (guests ?? []).map((guest, index) => ({
    guest,
    rank: index + 1,
  }));
  const rows =
    sort === "rank"
      ? ranked
      : [...ranked].sort(
          (a, b) =>
            (b.guest.scores[sort] ?? -1) - (a.guest.scores[sort] ?? -1) ||
            a.rank - b.rank,
        );
  const sortedBy = SCORES.find((column) => column.field === sort);

  function toggle(key: SortKey) {
    setSort((current) => (current === key ? "rank" : key));
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-6 pb-3 sm:px-6">
        <h4 className="text-[1.0625rem] font-semibold">Shortlist</h4>
        <p
          aria-live="polite"
          className="text-[0.8125rem] text-(--w3-dim)"
        >
          {sortedBy ? (
            <>
              By {sortedBy.name.toLowerCase()}, highest first.{" "}
              <button
                type="button"
                onClick={() => setSort("rank")}
                className="font-semibold text-(--w3-ink) underline decoration-(--w3-rule) underline-offset-[3px] hover:decoration-(--w3-ink)"
              >
                Back to rank
              </button>
            </>
          ) : (
            "Best first, by Echo's rank"
          )}
        </p>
      </div>

      <div
        className={`${ROW} items-start border-y border-(--w3-rule) bg-(--w3-ground)/50 px-4 pt-3 pb-3.5 sm:px-6`}
      >
        <SortButton
          onClick={() => setSort("rank")}
          label="Sort by rank"
          className="hidden lg:inline-flex"
        >
          #
        </SortButton>
        <span className="hidden text-[0.8125rem] leading-5 font-semibold lg:block">
          Guest
        </span>
        <div className="col-span-2 col-start-2 grid grid-cols-3 gap-3 lg:contents">
          {SCORES.map((column) => (
            <div key={column.field}>
              <SortButton
                active={sort === column.field}
                onClick={() => toggle(column.field)}
                label={`Sort by ${column.name.toLowerCase()}`}
                color={INK[column.part]}
              >
                {column.name}
              </SortButton>
              <p className="mt-1 pr-1 text-[0.75rem] leading-snug text-(--w3-soft)">
                {column.means}
              </p>
            </div>
          ))}
        </div>
        <span className="hidden text-[0.8125rem] leading-5 font-semibold lg:block">
          Verdict
        </span>
      </div>

      {run === "failed" ? (
        <div className="px-4 py-8 sm:px-6">
          <p className="font-semibold">This run didn&apos;t load.</p>
          <p className="mt-1 text-[0.9375rem] text-(--w3-soft)">
            The engine didn&apos;t answer.{" "}
            {item && (
              <Link
                href={`/analyses/${encodeURIComponent(item.analysis_id)}`}
                className="font-semibold text-(--w3-ink) underline underline-offset-[3px]"
              >
                Open it on its own page
              </Link>
            )}
          </p>
        </div>
      ) : guests ? (
        <ol
          aria-label={item ? `Guests for ${item.show.title}` : "Guests"}
          onMouseLeave={() => onActive(null)}
        >
          {rows.map(({ guest, rank }) => (
            <GuestRow
              key={guest.ref}
              guest={guest}
              rank={rank}
              lit={active === guest.ref}
              onEnter={() => onActive(guest.ref)}
            />
          ))}
        </ol>
      ) : (
        <ol aria-hidden>
          {Array.from({ length: 8 }, (_, index) => (
            <li
              key={index}
              className={`${ROW} items-center gap-y-2 border-b border-(--w3-line) px-4 py-3.5 sm:px-6`}
            >
              <span className="w3-wait h-3 w-4 bg-(--w3-well)" />
              <span className="w3-wait h-4 w-2/3 bg-(--w3-well)" />
              <span className="w3-wait col-start-3 row-start-1 h-3 w-14 bg-(--w3-well) lg:col-start-auto lg:col-span-4 lg:w-full" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  label,
  color,
  className = "inline-flex",
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  color?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`group h-5 items-center gap-1 text-[0.8125rem] font-semibold ${className}`}
      style={color ? { color } : undefined}
    >
      <span className="underline decoration-transparent underline-offset-[3px] group-hover:decoration-current">
        {children}
      </span>
      {active !== undefined && (
        <svg
          aria-hidden
          viewBox="0 0 10 10"
          className={`size-2.5 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}
          focusable="false"
        >
          <path
            d="M1.5 3.5 5 7l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
          />
        </svg>
      )}
    </button>
  );
}

function GuestRow({
  guest,
  rank,
  lit,
  onEnter,
}: {
  guest: Guest;
  rank: number;
  lit: boolean;
  onEnter: () => void;
}) {
  const sweet = guest.label === "sweet_spot";
  return (
    <li
      onMouseEnter={onEnter}
      className={`${ROW} items-center gap-y-2.5 border-b border-(--w3-line) px-4 py-3 transition-colors sm:px-6 ${sweet ? "w3-sweet" : ""} ${lit ? "bg-(--w3-well)/70" : ""}`}
    >
      <span
        className={`w3-figure self-start pt-0.5 text-[0.9375rem] lg:self-center lg:pt-0 ${sweet ? "font-semibold" : "text-(--w3-dim)"}`}
      >
        {rank}
      </span>
      <div className="min-w-0">
        <p className="w3-serif truncate text-[1.0625rem] leading-snug font-medium">
          {guest.name}
        </p>
        {guest.description && (
          <p className="truncate text-[0.8125rem] text-(--w3-soft)">
            {guest.description}
          </p>
        )}
      </div>
      <div className="col-span-2 col-start-2 row-start-2 grid grid-cols-3 gap-3 lg:contents">
        {SCORES.map((column) => (
          <ScoreCell
            key={column.field}
            part={column.part}
            name={column.name}
            value={guest.scores[column.field]}
          />
        ))}
      </div>
      <span
        className={`col-start-3 row-start-1 self-start pt-0.5 text-right text-[0.8125rem] whitespace-nowrap lg:col-start-auto lg:row-start-auto lg:self-center lg:pt-0 lg:text-left ${sweet ? "font-semibold" : "text-(--w3-soft)"}`}
      >
        {LABELS[guest.label].name}
      </span>
    </li>
  );
}

function ScoreCell({
  part,
  name,
  value,
}: {
  part: Part;
  name: string;
  value: number | null;
}) {
  return (
    <div className="flex min-w-0 items-center">
      <span className="sr-only">{name}</span>
      <span className="flex items-center gap-2">
        <span className="w3-figure w-7 text-right text-[1rem] font-medium">
          {value === null ? (
            <>
              <span aria-hidden>–</span>
              <span className="sr-only">not scored</span>
            </>
          ) : (
            out100(value)
          )}
        </span>
        <span
          aria-hidden
          className="relative h-[5px] w-10 shrink-0 bg-(--w3-track) sm:w-14 lg:w-[3.75rem]"
        >
          {value !== null && (
            <span
              className="absolute inset-y-0 left-0"
              style={{
                width: `${Math.max(3, value * 100)}%`,
                background: TONE[part],
              }}
            />
          )}
        </span>
      </span>
    </div>
  );
}

function Verdicts({
  guests,
  leftOut,
}: {
  guests: Guest[];
  leftOut: Analysis["left_out"];
}) {
  const counts = new Map<Label, number>();
  for (const guest of guests)
    counts.set(guest.label, (counts.get(guest.label) ?? 0) + 1);
  const present = LABEL_ORDER.filter((label) => counts.get(label));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <h4 className="text-[1.0625rem] font-semibold">Verdicts in this run</h4>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[0.8125rem] sm:grid-cols-[7rem_minmax(0,1fr)]">
        {present.map((label) => (
          <div key={label} className="contents">
            <dt className="flex justify-between gap-3 font-semibold">
              {LABELS[label].name}
              <span className="w3-figure text-(--w3-dim)">
                {counts.get(label)}
              </span>
            </dt>
            <dd className="text-(--w3-soft)">
              {label === "sweet_spot" ? SWEET_SPOT : LABELS[label].means}
            </dd>
          </div>
        ))}
      </dl>
      {leftOut.length > 0 && (
        <>
          <h4 className="mt-8 text-[1.0625rem] font-semibold">
            Left out before scoring
          </h4>
          <p className="mt-1 text-[0.8125rem] text-(--w3-soft)">
            Echo drops the show&apos;s own hosts and people who have already
            been on it.
          </p>
          <ul className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[0.8125rem] sm:grid-cols-[7rem_minmax(0,1fr)]">
            {leftOut.map((person) => (
              <li key={`${person.why}-${person.name}`} className="contents">
                <span className="w3-serif truncate text-[0.9375rem] font-medium">
                  {person.name}
                </span>
                <span className="self-center text-(--w3-soft)">
                  {person.why === "host" ? "Host" : "Past guest"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ScoresOnly() {
  return (
    <section
      id="scores"
      aria-labelledby="w3-scores"
      className="scroll-mt-2 border-t border-(--w3-rule)"
    >
      <div
        className={`${FRAME} grid grid-cols-1 gap-10 pt-10 pb-16 sm:pt-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16`}
      >
        <div>
          <h2
            id="w3-scores"
            className="text-[1.375rem] leading-tight font-semibold tracking-[-0.01em]"
          >
            How Echo scores a guest
          </h2>
          <p className="mt-1.5 text-(--w3-soft)">
            Two audiences, measured in both directions.
          </p>
          <OverlapDiagram className="mt-6 block h-auto w-full max-w-[24rem]" />
        </div>
        <dl className="self-center border-t border-(--w3-rule)">
          {SCORES.map((column) => (
            <div
              key={column.field}
              className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 border-b border-(--w3-line) py-4"
            >
              <dt
                className="font-semibold"
                style={{ color: INK[column.part] }}
              >
                {column.name}
              </dt>
              <dd className="text-(--w3-soft)">{column.means}</dd>
            </div>
          ))}
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-4">
            <dt className="font-semibold">Sweet spot</dt>
            <dd className="text-(--w3-soft)">{SWEET_SPOT}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
