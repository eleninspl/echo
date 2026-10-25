"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import type { Featured } from "@/lib/echo";

import { DialMarks } from "./dial";
import { countLabel, plural, runHref } from "./palette";
import { useAnalysis } from "./runs";

const FRAME = "mx-auto w-full max-w-[1240px] px-4 sm:px-8 lg:px-10";
const COLUMNS = "md:grid-cols-[88px_minmax(0,1fr)_88px_104px_minmax(0,11rem)_7.5rem]";

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;

  return (
    <section id="runs" aria-labelledby="w5-runs" className={`${FRAME} scroll-mt-6 pt-24 lg:pt-32`}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-x-8">
        <h2 id="w5-runs" className="w5-serif text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.08] font-medium lg:col-span-5">
          Shows Echo has run
        </h2>
        <p className="w5-serif text-[1.2rem] leading-[1.5] text-(--w5-soft) lg:col-span-6 lg:col-start-7 lg:self-end">
          {featured.length === 1
            ? "The run above is the one finished so far. It opens with every guest ranked and the evidence behind each score."
            : `${featured.length} finished runs. Each opens with every guest ranked and the evidence behind each score.`}
        </p>
      </div>

      <div
        aria-hidden
        className={`mt-10 hidden gap-x-6 border-b-2 border-(--w5-ink) pb-2 text-[0.82rem] font-semibold text-(--w5-muted) md:grid ${COLUMNS}`}
      >
        <span />
        <span>Show</span>
        <span className="text-right">Guests</span>
        <span className="text-right">Sweet spots</span>
        <span>Ranked first</span>
        <span />
      </div>
      <ul className="mt-6 border-t-2 border-(--w5-ink) md:mt-0 md:border-t-0">
        {featured.map((item, index) => (
          <ShowRow key={item.analysis_id} item={item} index={index} />
        ))}
      </ul>
    </section>
  );
}

function ShowRow({ item, index }: { item: Featured; index: number }) {
  const { show, analysis_id } = item;
  const { analysis, failed } = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = countLabel(guests, "sweet_spot");
  const waiting = !done && !failed;

  return (
    <li className="w5-rise border-b border-(--w5-line-strong)" style={{ "--order": index } as CSSProperties}>
      <Link
        href={runHref(analysis_id)}
        className={`group grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 py-4 md:gap-x-6 ${COLUMNS}`}
      >
        <svg viewBox="0 0 88 88" className="row-span-2 block size-16 md:row-span-1 md:size-[88px]" aria-hidden>
          <DialMarks
            frame={{ cx: 44, cy: 44, radius: 43, count: guests.length || 14 }}
            guests={guests}
            show={show}
            id={`w5-run-${index}`}
          />
        </svg>
        <span className="min-w-0">
          <span className="w5-serif block text-[1.3rem] leading-tight font-medium underline decoration-transparent decoration-1 underline-offset-4 group-hover:decoration-(--w5-ink)">
            {show.title}
          </span>
          {show.description && (
            <span className="mt-1 line-clamp-2 block text-[0.9rem] leading-snug text-(--w5-soft)">
              {show.description}
            </span>
          )}
        </span>
        <span className={`w5-numbers col-start-2 text-[0.9rem] text-(--w5-soft) md:hidden ${waiting ? "w5-waiting" : ""}`}>
          {done
            ? `${guests.length} guests · ${sweet} sweet ${plural(sweet, "spot", "spots")} · first: ${guests[0]?.name ?? "none"}`
            : failed
              ? "Couldn't load this run's numbers."
              : "Loading the numbers…"}
        </span>
        <Figure value={done ? guests.length : null} waiting={waiting} label="guests" />
        <Figure value={done ? sweet : null} waiting={waiting} label="sweet spots" />
        <span className="hidden truncate text-[0.98rem] font-semibold md:block">
          {done ? (guests[0]?.name ?? "–") : "–"}
        </span>
        <span className="hidden items-center justify-end gap-2 text-[0.95rem] font-semibold md:flex">
          Open the run
          <svg viewBox="0 0 16 16" className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden>
            <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth={1.8} />
          </svg>
        </span>
      </Link>
    </li>
  );
}

function Figure({ value, waiting, label }: { value: number | null; waiting: boolean; label: string }) {
  return (
    <span
      className={`w5-numbers hidden text-right text-[1.6rem] leading-none font-semibold md:block ${waiting ? "w5-waiting text-(--w5-muted)" : ""}`}
    >
      {value ?? "–"}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
