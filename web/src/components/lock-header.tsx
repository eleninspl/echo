"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import type { Analysis, Filters } from "@/lib/echo";
import { filterPhrases, LABELS } from "@/lib/format";
import type { Pick } from "@/lib/picks";
import { LABEL_ORDER, type Stats } from "@/lib/stats";

import { Chip, LABEL_HUE } from "./hud";

// The show Echo has locked onto, with the filters it ran under. Used alone while a run goes, and as the
// left of the header once it's done. Filters change only through Ask Echo.
export function ShowLock({ analysis, children }: { analysis: Analysis; children?: ReactNode }) {
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
        {phrases.length > 0 && (
          <ul aria-label="Filters" className="flex flex-wrap gap-1.5">
            {phrases.map((phrase) => (
              <li key={phrase}>
                <Chip color="var(--accent)">{phrase}</Chip>
              </li>
            ))}
          </ul>
        )}
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

// The finished run at a glance: the show, its filters, how many guests are a sweet spot, and what that means.
export function LockHeader({
  analysis,
  stats,
  missing,
  onForget,
}: {
  analysis: Analysis;
  stats: Stats;
  missing: Pick[];
  onForget: () => void;
}) {
  return (
    <section
      aria-label="This analysis"
      className="grid gap-x-16 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] @4xl:items-center"
    >
      <ShowLock analysis={analysis}>
        <MissingPicks missing={missing} onForget={onForget} />
      </ShowLock>
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

function MissingPicks({ missing, onForget }: { missing: Pick[]; onForget: () => void }) {
  if (!missing.length) return null;
  return (
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
  );
}

// Names as a sentence: "A", "A and B", "A, B and C".
function listNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
