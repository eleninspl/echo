"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import type { Analysis, Featured, Label } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { styles } from "./styles";
import { ArrowRight, Eyebrow, LabelPill, rankedBy, SCORES, ScoreCell, ScoreRing, ShowCover, sweetCount } from "./parts";
import { useAnalysis, useRuns } from "./runs";

const COLUMNS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function ShowsRun() {
  const { featured } = useRuns();
  if (!featured?.length) return null;
  const single = featured.length === 1;

  return (
    <section id="shows" aria-labelledby="d08-shows" className="scroll-mt-24 border-t border-(--line) bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <Eyebrow>Shows Echo has run</Eyebrow>
            <h2
              id="d08-shows"
              className="text-[clamp(1.9rem,3.4vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-(--ink)"
            >
              Open a finished run and look around.
            </h2>
          </div>
          <p className="max-w-[44ch] text-[15px] leading-relaxed text-(--ink-3)">
            {single ? "This run is" : "These runs are"} stored, so opening {single ? "it" : "one"} costs no Qloo calls.
            Every guest and score is there.
          </p>
        </div>
        {single ? (
          <WideRun item={featured[0]} />
        ) : (
          <ul className={`grid grid-cols-1 gap-4 ${COLUMNS[Math.min(featured.length, 4)]}`}>
            {featured.map((item, index) => (
              <li key={item.analysis_id} className={styles.rise} style={{ "--i": index } as CSSProperties}>
                <TileRun item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Skyline({ analysis, tall = false }: { analysis: Analysis | null; tall?: boolean }) {
  const guests = analysis ? rankedBy(analysis.guests, "echo").slice(0, 20) : [];
  const height = tall ? "h-48" : "h-16";
  if (!guests.length) {
    return (
      <span aria-hidden className={`flex items-end gap-1 ${height}`}>
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} className={`flex-1 rounded-t-[3px] ${styles.skeleton}`} style={{ height: `${90 - index * 5}%` }} />
        ))}
      </span>
    );
  }
  const highest = guests[0].scores.echo || 1;
  return (
    <span aria-hidden className={`flex items-end gap-1 ${height}`}>
      {guests.map((guest, index) => (
        <span
          key={guest.ref}
          className={`flex-1 rounded-t-[3px] ${styles.column} ${guest.label === "sweet_spot" ? styles.sweetFill : "bg-[#d9d9e2]"}`}
          style={{ height: `${Math.max((guest.scores.echo / highest) * 100, 6)}%`, "--i": index } as CSSProperties}
        />
      ))}
    </span>
  );
}

function Stats({ analysis, compact = false }: { analysis: Analysis | null; compact?: boolean }) {
  const items = analysis
    ? [
        { label: "Guests", value: String(analysis.guests.length) },
        { label: "Sweet spots", value: String(sweetCount(analysis.guests)) },
        { label: compact ? "Top score" : "Top Echo score", value: String(Math.round((rankedBy(analysis.guests, "echo")[0]?.scores.echo ?? 0) * 100)) },
      ]
    : null;
  return (
    <dl className="grid grid-cols-3 gap-3">
      {(items ?? [0, 1, 2].map((index) => ({ label: String(index), value: "" }))).map((item) => (
        <div key={item.label} className="flex flex-col-reverse gap-0.5">
          <dt className="text-[12px] text-(--ink-3)">{items ? item.label : <span className="sr-only">Loading</span>}</dt>
          <dd className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-(--ink)">
            {items ? item.value : <span className={`block h-6 w-10 rounded-md ${styles.skeleton}`} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Artwork({ item, analysis, tall }: { item: Featured; analysis: Analysis | null; tall?: boolean }) {
  const { show } = item;
  return (
    <span className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-(--line) bg-white p-4">
      <span aria-hidden className={`absolute inset-0 opacity-70 ${styles.dots}`} />
      {show.image_url && (
        <Image
          src={show.image_url}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 1024px) 30vw, 90vw"
          className="scale-125 object-cover opacity-20 blur-2xl"
        />
      )}
      <span className="relative flex items-start justify-between gap-3">
        <ShowCover show={show} size={tall ? 72 : 52} />
        {analysis && sweetCount(analysis.guests) > 0 && (
          <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium ${styles.sweetPill}`}>
            <span aria-hidden className={`size-1.5 rounded-full ${styles.sweetFill}`} />
            {sweetCount(analysis.guests)} sweet {sweetCount(analysis.guests) === 1 ? "spot" : "spots"}
          </span>
        )}
      </span>
      <span className="relative flex flex-col gap-2">
        <Skyline analysis={analysis} tall={tall} />
        <span className={`${styles.mono} flex justify-between text-[10.5px] tracking-[0.06em] text-(--ink-3) uppercase`}>
          <span>Guests by Echo score</span>
          <span>{analysis ? `${Math.min(analysis.guests.length, 20)} shown` : ""}</span>
        </span>
      </span>
    </span>
  );
}

const MIX_ORDER: Label[] = ["sweet_spot", "safe", "balanced", "long_shot", "far"];
const MIX_SHADE: Record<Label, string> = {
  sweet_spot: "var(--sweet)",
  safe: "#3a3a46",
  balanced: "#8b8b99",
  long_shot: "#b4b4c2",
  far: "#d9d9e2",
};

function LabelMix({ analysis }: { analysis: Analysis }) {
  const counts = MIX_ORDER.map((label) => ({
    label,
    count: analysis.guests.filter((guest) => guest.label === label).length,
  })).filter((item) => item.count > 0);
  return (
    <span className="flex flex-col gap-3 rounded-2xl border border-(--line) p-4">
      <span className={`${styles.mono} text-[10.5px] tracking-[0.07em] text-(--ink-3) uppercase`}>
        How the {analysis.guests.length} guests split
      </span>
      <span aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {counts.map((item, index) => (
          <span
            key={item.label}
            className={styles.bar}
            style={{ flexGrow: item.count, background: MIX_SHADE[item.label], "--i": index } as CSSProperties}
          />
        ))}
      </span>
      <span className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {counts.map((item) => (
          <span key={item.label} className="flex items-center gap-2 text-[12.5px] text-(--ink-2)">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: MIX_SHADE[item.label] }} />
            <span className="flex-1 truncate">{LABELS[item.label].name}</span>
            <span className={`${styles.mono} text-(--ink)`}>{item.count}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

function WideRun({ item }: { item: Featured }) {
  const loaded = useAnalysis(item.analysis_id);
  const analysis = loaded && loaded !== "failed" ? loaded : null;
  const top = analysis ? rankedBy(analysis.guests, "echo").slice(0, 3) : [];
  const href = `/analyses/${encodeURIComponent(item.analysis_id)}`;

  return (
    <Link
      href={href}
      className="group grid grid-cols-1 gap-6 rounded-[24px] border border-(--line) bg-white p-4 shadow-(--shadow-md) transition-shadow hover:shadow-(--shadow-lg) sm:p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8"
    >
      <Artwork item={item} analysis={analysis} tall />
      <span className="flex flex-col gap-5 py-1">
        <span className="flex flex-col gap-2">
          <span className="text-[24px] leading-tight font-semibold tracking-[-0.03em] text-(--ink)">{item.show.title}</span>
          {item.show.description && (
            <span className="text-[15px] leading-relaxed text-(--ink-3)">{item.show.description}</span>
          )}
        </span>
        <Stats analysis={analysis} />
        {analysis && <LabelMix analysis={analysis} />}
        <span className="mt-auto inline-flex h-10 items-center gap-2 self-start rounded-full bg-(--ink) px-4 text-[14px] font-medium text-white transition-colors group-hover:bg-(--accent)">
          Open the run
          <ArrowRight />
        </span>
      </span>
      <span className="flex flex-col gap-2 rounded-2xl border border-(--line) bg-(--bg-soft) p-3">
        <span className={`${styles.mono} px-1 text-[10.5px] tracking-[0.07em] text-(--ink-3) uppercase`}>Top guests</span>
        <span className="flex flex-col gap-2">
          {top.length
            ? top.map((guest, index) => (
                <span key={guest.ref} className="flex flex-col gap-3 rounded-xl border border-(--line) bg-white p-3 shadow-(--shadow-sm)">
                  <span className="flex min-w-0 items-center gap-3">
                    <ScoreRing scores={guest.scores} name={guest.name} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-(--ink)">{guest.name}</span>
                      {guest.description && (
                        <span className="block truncate text-[12px] text-(--ink-3)">{guest.description}</span>
                      )}
                    </span>
                    <LabelPill label={guest.label} small />
                  </span>
                  <span className="grid grid-cols-3 gap-3">
                    {SCORES.map((score, scoreIndex) => (
                      <span key={score.key} className="flex flex-col gap-1">
                        <span className="text-[11px] text-(--ink-3)">{score.name}</span>
                        <ScoreCell value={guest.scores[score.key]} color={score.color} order={index * 3 + scoreIndex} />
                      </span>
                    ))}
                  </span>
                </span>
              ))
            : [0, 1, 2].map((index) => <span key={index} className={`h-[5.5rem] rounded-xl ${styles.skeleton}`} />)}
        </span>
      </span>
    </Link>
  );
}

function TileRun({ item }: { item: Featured }) {
  const loaded = useAnalysis(item.analysis_id);
  const analysis = loaded && loaded !== "failed" ? loaded : null;
  const top = analysis ? rankedBy(analysis.guests, "echo")[0] : null;
  return (
    <Link
      href={`/analyses/${encodeURIComponent(item.analysis_id)}`}
      className="group flex h-full flex-col gap-4 rounded-[22px] border border-(--line) bg-white p-3 shadow-(--shadow-sm) transition-shadow hover:shadow-(--shadow-md)"
    >
      <Artwork item={item} analysis={analysis} />
      <span className="flex flex-1 flex-col gap-4 px-1.5 pb-1.5">
        <span className="flex flex-col gap-1">
          <span className="flex items-center justify-between gap-3">
            <span className="truncate text-[17px] font-semibold tracking-[-0.02em] text-(--ink)">{item.show.title}</span>
            <ArrowRight className="shrink-0 text-(--ink-3) transition-transform group-hover:translate-x-0.5 group-hover:text-(--accent)" />
          </span>
          {item.show.description && (
            <span className="line-clamp-2 text-[13px] leading-snug text-(--ink-3)">{item.show.description}</span>
          )}
        </span>
        <span className="mt-auto">
          <Stats analysis={analysis} compact />
        </span>
        {top && (
          <span className="flex items-center gap-2.5 border-t border-(--line) pt-3 text-[13px] text-(--ink-2)">
            <ScoreRing scores={top.scores} name={top.name} size={26} />
            <span className="min-w-0 truncate">
              Top guest <span className="font-semibold text-(--ink)">{top.name}</span>
            </span>
          </span>
        )}
      </span>
    </Link>
  );
}

export function ShowsNavLink() {
  const { featured } = useRuns();
  if (!featured?.length) return null;
  return (
    <a href="#shows" className="rounded-md px-2 py-1 text-[14px] text-(--ink-2) transition-colors hover:text-(--ink)">
      Examples
    </a>
  );
}
