"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { Analysis, Featured, Guest } from "@/lib/echo";

import { styles } from "./styles";
import { ArrowRight, LabelPill, rankedBy, SCORES, ScoreCell, ScoreRing, ShowCover, sweetCount } from "./parts";
import { useLead } from "./runs";

const ROWS = 5;
const TABS = ["Guests", "Audience", "Invite", "Qloo"];
const GRID =
  "grid grid-cols-[minmax(0,1fr)_repeat(3,3.4rem)] gap-x-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,5.25rem)_2.5rem] sm:gap-x-4";

export function AppPreview() {
  const lead = useLead();
  return (
    <div className="relative">
      <div aria-hidden className={styles.aurora} />
      <figure className="relative overflow-hidden rounded-[22px] border border-(--line) bg-white shadow-(--shadow-lg) ring-4 ring-white/60">
        <WindowBar title={lead.state === "ready" ? lead.analysis.show.title : null} />
        {lead.state === "loading" && <PreviewSkeleton />}
        {lead.state === "none" && <PreviewEmpty />}
        {lead.state === "ready" && <PreviewBody item={lead.item} analysis={lead.analysis} />}
        <figcaption className="sr-only">
          {lead.state === "ready"
            ? `A finished Echo run on ${lead.analysis.show.title}: its top guests and their scores.`
            : "A preview of an Echo run."}
        </figcaption>
      </figure>
      {lead.state === "ready" && <SweetSpotChip analysis={lead.analysis} />}
    </div>
  );
}

function WindowBar({ title }: { title: string | null }) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-(--line) bg-(--bg-soft) px-4">
      <span aria-hidden className="flex gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-2.5 rounded-full border border-(--line-strong) bg-white" />
        ))}
      </span>
      <span
        className={`${styles.mono} mx-auto flex min-w-0 items-center gap-1.5 truncate rounded-md border border-(--line) bg-white px-2.5 py-1 text-[11.5px] text-(--ink-3)`}
      >
        <span className="text-(--ink-2)">echo</span>
        <span aria-hidden>/</span>
        <span className="truncate">{title ?? "your show"}</span>
      </span>
      <span className="w-[42px]" aria-hidden />
    </div>
  );
}

function PreviewBody({ item, analysis }: { item: Featured; analysis: Analysis }) {
  const guests = rankedBy(analysis.guests, "echo");
  const top = guests.slice(0, ROWS);
  const sweet = sweetCount(analysis.guests);
  const href = `/analyses/${encodeURIComponent(item.analysis_id)}`;
  const stats = [
    { value: analysis.guests.length, label: "Guests ranked" },
    { value: sweet, label: sweet === 1 ? "Sweet spot" : "Sweet spots" },
    { value: analysis.left_out.length, label: "Hosts, past guests out" },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3.5 px-4 pt-4 sm:px-5 sm:pt-5">
        <ShowCover show={analysis.show} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold tracking-[-0.015em] text-(--ink)">{analysis.show.title}</p>
          {analysis.show.description && (
            <p className="truncate text-[13px] text-(--ink-3)">{analysis.show.description}</p>
          )}
        </div>
        <Link
          href={href}
          className="hidden h-8 shrink-0 items-center gap-1.5 rounded-full border border-(--line-strong) bg-white px-3 text-[12.5px] font-medium text-(--ink) shadow-(--shadow-sm) hover:border-(--accent) hover:text-(--accent-deep) sm:inline-flex"
        >
          Open run
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <dl className="mx-4 mt-4 grid grid-cols-3 divide-x divide-(--line) rounded-xl border border-(--line) sm:mx-5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse gap-0.5 px-3 py-2.5 sm:px-4">
            <dt className="truncate text-[11.5px] text-(--ink-3)">{stat.label}</dt>
            <dd className="text-[20px] leading-tight font-semibold tracking-[-0.02em] text-(--ink)">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div aria-hidden className="mt-4 flex gap-5 border-b border-(--line) px-4 sm:px-5">
        {TABS.map((tab, index) => (
          <span
            key={tab}
            className={`-mb-px border-b-2 pb-2.5 text-[13px] font-medium ${
              index === 0 ? "border-(--accent) text-(--ink)" : "border-transparent text-(--ink-3)"
            }`}
          >
            {tab}
            {index === 0 && (
              <span className={`${styles.mono} ml-1.5 rounded bg-(--accent-soft) px-1 text-[10.5px] text-(--accent-deep)`}>
                {analysis.guests.length}
              </span>
            )}
          </span>
        ))}
      </div>

      <div
        className={`${GRID} ${styles.mono} items-end px-4 pt-3 pb-1.5 text-[10.5px] tracking-[0.06em] text-(--ink-3) uppercase sm:px-5`}
      >
        <span>Guest</span>
        {SCORES.map((score) => (
          <span key={score.key} className="flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: score.color }} />
            {score.key === "love_back" ? (
              <>
                <span className="sm:hidden">Love</span>
                <span className="hidden sm:inline">{score.name}</span>
              </>
            ) : (
              score.name
            )}
          </span>
        ))}
        <span className="hidden text-right sm:block">Echo</span>
      </div>

      <ol className="flex flex-col px-2 sm:px-3">
        {top.map((guest, index) => (
          <PreviewRow key={guest.ref} guest={guest} index={index} />
        ))}
      </ol>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-(--line) bg-(--bg-soft) px-4 py-3 sm:px-5 xl:justify-end">
        <p className="text-[12px] text-(--ink-3)">
          Top {top.length} of {analysis.guests.length} by Echo score · percentiles within the show
        </p>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-(--accent-deep) hover:underline sm:hidden"
        >
          Open
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function PreviewRow({ guest, index }: { guest: Guest; index: number }) {
  return (
    <li
      className={`${GRID} ${styles.rise} items-center rounded-xl px-2 py-2.5 sm:py-3 ${
        index === 0 ? "bg-(--accent-soft)/60" : ""
      }`}
      style={{ "--i": index } as CSSProperties}
    >
      <span className="flex min-w-0 items-center gap-3">
        <ScoreRing scores={guest.scores} name={guest.name} size={34} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-(--ink)">{guest.name}</span>
            <span className="hidden sm:inline-flex">
              <LabelPill label={guest.label} small />
            </span>
          </span>
          {guest.description && (
            <span className="block truncate text-[12px] text-(--ink-3)">{guest.description}</span>
          )}
        </span>
      </span>
      {SCORES.map((score, scoreIndex) => (
        <ScoreCell
          key={score.key}
          value={guest.scores[score.key]}
          color={score.color}
          order={index * 3 + scoreIndex}
        />
      ))}
      <span
        className={`${styles.mono} hidden text-right text-[13px] font-semibold text-(--ink) sm:block`}
        title="Echo score"
      >
        {Math.round(guest.scores.echo * 100)}
      </span>
    </li>
  );
}

function SweetSpotChip({ analysis }: { analysis: Analysis }) {
  const sweet = sweetCount(analysis.guests);
  return (
    <div className="absolute top-[calc(100%-3rem)] -left-8 hidden w-[17.5rem] rounded-2xl border border-(--line) bg-white/95 p-4 shadow-(--shadow-lg) backdrop-blur xl:block">
      <div className="flex items-baseline justify-between">
        <span className={`${styles.mono} text-[11px] tracking-[0.08em] text-(--ink-3) uppercase`}>Sweet spots</span>
        <span className="text-[13px] text-(--ink-3)">
          <span className="text-[22px] font-semibold tracking-[-0.02em] text-(--ink)">{sweet}</span> of{" "}
          {analysis.guests.length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5" aria-hidden>
        {analysis.guests.slice(0, 21).map((guest) => (
          <ScoreRing
            key={guest.ref}
            scores={guest.scores}
            name={guest.name}
            size={28}
            muted={guest.label !== "sweet_spot"}
          />
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-snug text-(--ink-3)">High on fit, love back and reach at once. Rare by design.</p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5" aria-hidden>
      <div className="flex items-center gap-3.5">
        <span className={`size-12 rounded-xl ${styles.skeleton}`} />
        <span className="flex flex-1 flex-col gap-2">
          <span className={`h-4 w-1/3 rounded-full ${styles.skeleton}`} />
          <span className={`h-3 w-2/3 rounded-full ${styles.skeleton}`} />
        </span>
      </div>
      <span className={`h-16 rounded-xl ${styles.skeleton}`} />
      {Array.from({ length: ROWS }, (_, index) => (
        <span key={index} className="flex items-center gap-3">
          <span className={`size-8 rounded-full ${styles.skeleton}`} />
          <span className={`h-3 flex-1 rounded-full ${styles.skeleton}`} />
          <span className={`h-3 w-1/2 rounded-full ${styles.skeleton}`} />
        </span>
      ))}
    </div>
  );
}

function PreviewEmpty() {
  return (
    <div className={`flex min-h-[22rem] flex-col items-center justify-center gap-4 p-8 text-center ${styles.dots}`}>
      <ScoreRing scores={{ fit: 0.8, love_back: 0.7, reach: 0.6, echo: 0 }} size={64} />
      <p className="max-w-[30ch] text-[15px] font-medium text-(--ink)">Your show&apos;s guests will rank here.</p>
      <p className="max-w-[40ch] text-[13px] text-(--ink-3)">
        Search for your show, pick it, and Echo scores each guest on fit, love back and reach.
      </p>
    </div>
  );
}
