import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import type { Analysis } from "@/lib/echo";
import { filterPhrases, LABELS } from "@/lib/format";
import { LABEL_ORDER, type Stats } from "@/lib/stats";

import { categoryHue, Chip, Lamp, LABEL_HUE } from "./hud";

// The show Echo has locked onto, with the filters it ran under. Used alone while a run goes, and as the
// left of the lock header once it's done.
export function ShowLock({ analysis, children }: { analysis: Analysis; children?: ReactNode }) {
  const { show, filters } = analysis;
  const phrases = filterPhrases(filters);
  const unused = filters.episode_about && filters.episode_about.used === null && analysis.status === "done";
  return (
    <div className="flex min-w-0 gap-4">
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
        <h1 className="font-display text-[clamp(1.625rem,2.6vw,2.375rem)] leading-[0.95] font-semibold text-balance">
          {show.title}
        </h1>
        {show.description && <p className="line-clamp-2 max-w-[60ch] text-sm text-ink-soft">{show.description}</p>}
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
    <span className="screen relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:size-28">
      {children}
    </span>
  );
}

// The finished run at a glance: the show, how many guests lock, the label spectrum and what went into it.
// Every figure is computed from the analysis.
export function LockHeader({ analysis, stats, line }: { analysis: Analysis; stats: Stats; line: string }) {
  return (
    <section aria-label="This analysis" className="zone">
      <div className="grid gap-x-8 gap-y-6 p-5 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center lg:grid-cols-[minmax(0,1.15fr)_auto_minmax(0,1fr)]">
        <div className="md:col-span-2 lg:col-span-1">
          <ShowLock analysis={analysis} />
        </div>
        <LockDial stats={stats} line={line} />
        <div className="flex min-w-0 flex-col gap-5">
          <LabelSpectrum stats={stats} />
          <dl className="grid grid-cols-2 gap-3">
            <Instrument name="Tastes" value={stats.tastes} note={`${stats.categories} categories`}>
              <span aria-hidden className="flex h-1.5 gap-1">
                {stats.bands.map((band) => (
                  <span
                    key={band.category}
                    className="rounded-full"
                    style={{ flexGrow: band.n, background: categoryHue(band.category) }}
                  />
                ))}
              </span>
            </Instrument>
            <Instrument
              name="Left out"
              value={stats.hosts + stats.pastGuests}
              note={`${stats.hosts} ${stats.hosts === 1 ? "host" : "hosts"} · ${stats.pastGuests} past`}
            >
              <span aria-hidden className="flex h-1.5 gap-1">
                {Array.from({ length: stats.hosts }, (_, i) => (
                  <Lamp key={`h${i}`} color="var(--long-shot)" className="h-1.5 w-3" />
                ))}
                {Array.from({ length: stats.pastGuests }, (_, i) => (
                  <Lamp key={`p${i}`} color="var(--balanced)" className="h-1.5 w-3" />
                ))}
              </span>
            </Instrument>
          </dl>
        </div>
      </div>
    </section>
  );
}

// The lock: a ring filled to the share of guests that are sweet spots, the count in the middle.
function LockDial({ stats, line }: { stats: Stats; line: string }) {
  const size = 160;
  const c = size / 2;
  const r = 66;
  const length = 2 * Math.PI * r;
  const share = stats.guests ? stats.sweet / stats.guests : 0;
  return (
    <figure className="flex items-center gap-4 md:flex-col md:gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--sweet)" strokeOpacity="0.16" strokeWidth="12" />
          {share > 0 && (
            <circle
              className="arc"
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke="var(--sweet)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${length * share} ${length}`}
              style={{ "--length": `${length * share}` } as CSSProperties}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="readout text-5xl" style={{ color: stats.sweet ? "var(--sweet)" : "var(--ink-soft)" }}>
            {stats.sweet}
          </span>
          <span className="tag mt-1 text-center leading-snug text-ink-dim">
            sweet {stats.sweet === 1 ? "spot" : "spots"}
            <br />
            of {stats.guests}
          </span>
        </div>
      </div>
      <figcaption className="max-w-48 text-sm leading-snug text-ink-soft md:text-center">{line}</figcaption>
    </figure>
  );
}

// How the guests split across the five labels: a block per guest in one row, and the legend.
function LabelSpectrum({ stats }: { stats: Stats }) {
  const present = LABEL_ORDER.filter((label) => stats.labels[label] > 0);
  const blocks = LABEL_ORDER.flatMap((label) => Array.from({ length: stats.labels[label] }, () => label));
  return (
    <div className="flex flex-col gap-2.5">
      <p className="tag text-ink-dim">Guests by label</p>
      <div aria-hidden className="flex h-3 gap-1">
        {blocks.map((label, i) => (
          <span
            key={i}
            className="fade flex-1 rounded-full"
            style={
              {
                background: LABEL_HUE[label],
                opacity: label === "sweet_spot" ? 1 : 0.7,
                "--order": i,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
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

// A figure about the run, with a small gauge drawn from the same data and a note under it.
function Instrument({
  name,
  value,
  note,
  children,
}: {
  name: string;
  value: number;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-well p-3.5">
      <dt className="tag text-ink-dim">{name}</dt>
      <dd className="flex flex-col gap-1.5">
        <span className="readout text-3xl">{value}</span>
        {children}
        <span className="text-xs text-ink-soft sm:truncate">{note}</span>
      </dd>
    </div>
  );
}
