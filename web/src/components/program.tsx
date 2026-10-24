import Image from "next/image";
import type { ReactNode } from "react";

import type { Analysis } from "@/lib/echo";
import { filterPhrases, LABELS } from "@/lib/format";
import { LABEL_ORDER, ms, type Stats } from "@/lib/stats";

import { categoryHue, Info, Lamp, LABEL_HUE, Meter, out100, PanelHead, SCORE_HUE } from "./gallery";

// Program (PGM): the show this gallery is cut for, on the biggest screen, with the filters it ran under.
export function ProgramMonitor({ analysis, children }: { analysis: Analysis; children?: ReactNode }) {
  const { show, filters } = analysis;
  const phrases = filterPhrases(filters);
  const unused = filters.episode_about && filters.episode_about.used === null && analysis.status === "done";
  const running = analysis.status === "running";
  return (
    <section aria-labelledby="program" className="panel flex h-full flex-col rounded-[4px]">
      <PanelHead title="PGM · Program">
        <span className="flex items-center gap-2 text-ink-soft">
          <Lamp color={running ? "var(--amber)" : "var(--pvw)"} className={running ? "cue size-2" : "size-2"} />
          {running ? "Running" : analysis.status === "failed" ? "Stopped" : "Ready"}
        </span>
      </PanelHead>
      <div className="monitor relative m-2 mb-0 flex aspect-video items-center justify-center overflow-hidden rounded-[2px]">
        {show.image_url ? (
          <>
            <Image
              src={show.image_url}
              alt=""
              fill
              unoptimized
              sizes="33vw"
              className="scale-125 object-cover opacity-40 blur-2xl"
            />
            <span className="relative aspect-square h-[78%] overflow-hidden rounded-[2px] shadow-[0_10px_30px_rgb(0_0_0/0.6)]">
              <Image src={show.image_url} alt="" fill unoptimized sizes="20vw" className="object-cover" />
            </span>
          </>
        ) : (
          <span aria-hidden className="font-cond text-[clamp(4rem,9vw,7rem)] leading-none font-medium text-ink-dim">
            {show.title.trim().charAt(0)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <h1
          id="program"
          className="font-cond text-[clamp(1.5rem,2.4vw,2.125rem)] leading-[0.95] font-semibold text-balance"
        >
          {show.title}
        </h1>
        {show.description && <p className="line-clamp-2 text-sm text-ink-soft">{show.description}</p>}
        {phrases.length > 0 && (
          <ul aria-label="Filters" className="flex flex-wrap gap-1.5">
            {phrases.map((phrase) => (
              <li
                key={phrase}
                className="rounded-[2px] border border-amber/50 bg-amber/10 px-2 py-0.5 font-cond text-sm font-semibold text-amber"
              >
                {phrase}
              </li>
            ))}
          </ul>
        )}
        {unused && (
          <p className="text-sm text-ink-soft">
            Qloo couldn&apos;t use &ldquo;{filters.episode_about?.query}&rdquo;, so these guests don&apos;t account for
            it.
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

// The desk readout: the run at a glance, every figure computed from it.
export function Readouts({ stats, line }: { stats: Stats; line: string }) {
  const median = ms(stats.medianCall);
  return (
    <section aria-labelledby="readout" className="panel flex h-full flex-col rounded-[4px]">
      <PanelHead id="readout" title="Desk readout">
        <Info>
          Scores are out of 100, ranked within these guests. Qloo time runs from the first call starting to the last one
          finishing; calls run in parallel.
        </Info>
      </PanelHead>
      <div className="grid flex-1 gap-5 p-4 sm:grid-cols-[auto_1fr] sm:gap-6">
        <OnAirRing stats={stats} line={line} />
        <div className="flex flex-col gap-5">
          <LabelMix stats={stats} />
          <dl className="grid grid-cols-3 gap-4">
            <Median name="Median fit" value={stats.medianFit} color={SCORE_HUE.fit} />
            <Median name="Median love" value={stats.medianLove} color={SCORE_HUE.love_back} />
            <Median name="Median reach" value={stats.medianReach} color={SCORE_HUE.reach} />
          </dl>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
            <Instrument
              name="Qloo calls"
              value={String(stats.calls)}
              note={`${stats.fresh} fresh · ${stats.cached} cached`}
            >
              <span aria-hidden className="flex h-2 gap-[2px]">
                {Array.from({ length: stats.calls }, (_, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-[1px]"
                    style={{
                      background: i < stats.fresh ? "var(--fit)" : "color-mix(in srgb, var(--fit) 25%, transparent)",
                    }}
                  />
                ))}
              </span>
            </Instrument>
            <Instrument
              name="Qloo time"
              value={timecode(stats.qlooTime)}
              note={`median call ${median.value} ${median.unit ?? ""}`}
            >
              <span aria-hidden className="relative block h-2 rounded-[1px] bg-reach/20">
                <span className="absolute inset-y-0 left-0 w-full rounded-[1px] bg-reach/70" />
                {stats.qlooTime !== null && stats.medianCall !== null && stats.qlooTime > 0 && (
                  <span
                    className="absolute -top-1 -bottom-1 w-0.5 bg-ink"
                    style={{ left: `${Math.min(stats.medianCall / stats.qlooTime, 1) * 100}%` }}
                  />
                )}
              </span>
            </Instrument>
            <Instrument name="Tastes" value={String(stats.tastes)} note={`in ${stats.categories} categories`}>
              <span aria-hidden className="flex h-2 gap-[2px]">
                {stats.bands.map((band) => (
                  <span
                    key={band.category}
                    className="rounded-[1px]"
                    style={{ flexGrow: band.n, background: categoryHue(band.category) }}
                  />
                ))}
              </span>
            </Instrument>
            <Instrument
              name="Left out"
              value={String(stats.hosts + stats.pastGuests)}
              note={`${stats.hosts} ${stats.hosts === 1 ? "host" : "hosts"} · ${stats.pastGuests} past`}
            >
              <span aria-hidden className="flex h-2 gap-1">
                {Array.from({ length: stats.hosts }, (_, i) => (
                  <Lamp key={`h${i}`} color="var(--amber)" className="h-2 w-3" />
                ))}
                {Array.from({ length: stats.pastGuests }, (_, i) => (
                  <Lamp key={`p${i}`} color="var(--balanced)" className="h-2 w-3" />
                ))}
              </span>
            </Instrument>
          </dl>
        </div>
      </div>
    </section>
  );
}

// A ring of lamps, one per guest in rank order from the top: the sweet spots light red.
function OnAirRing({ stats, line }: { stats: Stats; line: string }) {
  const size = 168;
  const n = Math.max(stats.guests, 1);
  const radius = 72;
  const order = LABEL_ORDER.flatMap((label) => Array.from({ length: stats.labels[label] }, () => label));
  return (
    <figure className="flex flex-col items-center gap-3 sm:w-44">
      <div className="relative" style={{ width: size, height: size }}>
        <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={radius - 12} fill="none" stroke="var(--line)" />
          {order.map((label, i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            const cx = size / 2 + Math.cos(angle) * radius;
            const cy = size / 2 + Math.sin(angle) * radius;
            const sweet = label === "sweet_spot";
            return (
              <rect
                key={i}
                x={cx - 3}
                y={cy - 7}
                width={6}
                height={14}
                rx={1}
                transform={`rotate(${(angle * 180) / Math.PI + 90} ${cx} ${cy})`}
                fill={LABEL_HUE[label]}
                fillOpacity={sweet ? 1 : 0.4}
                style={sweet ? { filter: "drop-shadow(0 0 4px var(--tally))" } : undefined}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-cond text-6xl leading-none font-semibold ${stats.sweet ? "text-tally" : "text-ink-soft"}`}
          >
            {stats.sweet}
          </span>
          <span className="silk mt-1.5 text-center leading-snug text-ink-dim">
            On air
            <br />
            of {stats.guests}
          </span>
        </div>
      </div>
      <figcaption className="max-w-44 text-center text-sm leading-snug text-ink-soft">{line}</figcaption>
    </figure>
  );
}

// How the guests split across the five labels, as one stacked bar.
function LabelMix({ stats }: { stats: Stats }) {
  const present = LABEL_ORDER.filter((label) => stats.labels[label] > 0);
  return (
    <div className="flex flex-col gap-2">
      <p className="silk text-ink-dim">Label mix</p>
      <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-[2px]">
        {present.map((label) => (
          <span key={label} style={{ flexGrow: stats.labels[label], background: LABEL_HUE[label] }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {present.map((label) => (
          <li key={label} className="flex items-center gap-1.5 text-sm">
            <span aria-hidden className="size-2 rounded-[1px]" style={{ background: LABEL_HUE[label] }} />
            <span className="text-ink-soft">{LABELS[label].name}</span>
            <span className="font-cond font-semibold">{stats.labels[label]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The run's Qloo time as a timecode: seconds and hundredths.
function timecode(value: number | null): string {
  if (value === null) return "–";
  const seconds = Math.floor(value / 1000);
  const hundredths = Math.floor((value % 1000) / 10);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

// A figure with its instrument under it: the value, a gauge drawn from the same data, and a note.
function Instrument({
  name,
  value,
  note,
  children,
}: {
  name: string;
  value: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className="silk text-ink-dim">{name}</dt>
      <dd className="flex flex-col gap-1.5">
        <span className="font-cond text-3xl leading-none font-semibold">{value}</span>
        {children}
        <span className="text-xs text-ink-soft">{note}</span>
      </dd>
    </div>
  );
}

function Median({ name, value, color }: { name: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="silk text-[0.625rem]" style={{ color }}>
        {name}
      </dt>
      <dd className="flex flex-col gap-1.5">
        <span className="font-cond text-3xl leading-none font-semibold">{out100(value)}</span>
        <Meter value={value ?? 0} color={color} segments={16} className="h-2" />
      </dd>
    </div>
  );
}
