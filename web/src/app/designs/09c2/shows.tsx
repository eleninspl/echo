"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import type { Featured, Guest } from "@/lib/echo";

import { Cover } from "./cover";
import {
  INK,
  LABEL_NAME,
  PARTS,
  PART_NAME,
  countSweet,
  out100,
  plural,
  scoreOf,
  type Part,
} from "./inks";
import { useAnalysis } from "./runs";

export function RunShows({ frame }: { frame: string }) {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const single = featured.length === 1;

  return (
    <section
      id="shows"
      aria-labelledby="w2-shows"
      className={`${frame} scroll-mt-6 pt-20 pb-24 lg:pt-28`}
    >
      <h2
        id="w2-shows"
        className="w2-display text-[clamp(2.4rem,5vw,4.25rem)] leading-[0.98] tracking-[-0.01em]"
      >
        Shows Echo has run
      </h2>
      <p className="mt-4 max-w-[46ch] text-[1.15rem] leading-relaxed text-(--w2-soft) italic">
        Finished runs, read straight from Echo&apos;s store. Open one for every
        guest, ranked, with what drives each score.
      </p>
      <ul
        className={`mt-12 grid grid-cols-1 gap-y-16 ${single ? "" : "lg:grid-cols-2 lg:gap-x-12"}`}
      >
        {featured.map((item, index) => (
          <ShowRun
            key={item.analysis_id}
            item={item}
            single={single}
            index={index}
          />
        ))}
      </ul>
    </section>
  );
}

function ShowRun({
  item,
  single,
  index,
}: {
  item: Featured;
  single: boolean;
  index: number;
}) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const shown = guests.slice(0, single ? 8 : 5);
  const more = guests.length - shown.length;
  const href = `/analyses/${encodeURIComponent(analysis_id)}`;

  return (
    <li
      className={`w2-rise min-w-0 border-t-2 border-(--w2-ink) pt-6 ${single ? "grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6" : "flex flex-col gap-6 lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:gap-y-6"}`}
      style={{ "--order": index } as CSSProperties}
    >
      <div
        className={
          single
            ? "flex flex-col gap-5 lg:col-span-4"
            : "grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-4"
        }
      >
        <Cover show={show} size={single ? 176 : 72} />
        <div className="min-w-0">
          <h3
            className={`w2-display leading-[1.05] ${single ? "text-[2.1rem] sm:text-[2.4rem]" : "text-[1.75rem]"}`}
          >
            <Link href={href} className="w2-link-quiet">
              {show.title}
            </Link>
          </h3>
          {show.description && (
            <p className="mt-2 max-w-[36ch] text-[1.02rem] leading-snug text-(--w2-soft) italic">
              {show.description}
            </p>
          )}
        </div>
        <RunFacts
          guests={done ? guests : null}
          leftOut={done ? analysis.left_out.length : 0}
          className={single ? "" : "col-span-2"}
        />
        <Link
          href={href}
          className={`w2-sans w2-link self-start text-[1rem] font-semibold ${single ? "" : "col-span-2"}`}
        >
          Open the full run
          {more > 0 && (
            <span className="font-normal text-(--w2-soft)">
              , {plural(more, "more guest", "more guests")}
            </span>
          )}
        </Link>
      </div>

      <div className={single ? "min-w-0 lg:col-span-8" : "min-w-0"}>
        <Tracklist
          title={show.title}
          guests={shown}
          loading={!done}
          rows={single ? 8 : 5}
        />
      </div>
    </li>
  );
}

function RunFacts({
  guests,
  leftOut,
  className,
}: {
  guests: Guest[] | null;
  leftOut: number;
  className: string;
}) {
  const facts: [string, number | null][] = [
    ["Guests scored", guests ? guests.length : null],
    ["Sweet spots", guests ? countSweet(guests) : null],
    ["Left out as hosts or past guests", guests ? leftOut : null],
  ];
  return (
    <dl className={`border-t border-(--w2-rule) ${className}`}>
      {facts.map(([term, value]) => (
        <div
          key={term}
          className="flex items-baseline justify-between gap-4 border-b border-(--w2-rule) py-2"
        >
          <dt className="text-[1rem] text-(--w2-soft)">{term}</dt>
          <dd
            className={`w2-figures text-[1.25rem] leading-none ${value === null ? "w2-wait text-(--w2-dim)" : ""}`}
          >
            {value ?? "–"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Tracklist({
  title,
  guests,
  loading,
  rows,
}: {
  title: string;
  guests: Guest[];
  loading: boolean;
  rows: number;
}) {
  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">
        Top guests Echo found for {title}, best first, scored out of 100
      </caption>
      <colgroup>
        <col className="w-[1.9rem] sm:w-[2.5rem]" />
        <col />
        <col className="w-[3.4rem] sm:w-[5.25rem]" />
        <col className="w-[3.4rem] sm:w-[5.25rem]" />
        <col className="w-[3.4rem] sm:w-[5.25rem]" />
        <col className="w-0 md:w-[7.5rem]" />
      </colgroup>
      <thead>
        <tr className="w2-sans border-b border-(--w2-ink) text-[0.8rem] leading-tight sm:text-[0.88rem]">
          <th
            scope="col"
            className="pb-2 text-left align-bottom font-normal text-(--w2-soft)"
          >
            <span aria-hidden>No.</span>
            <span className="sr-only">Rank</span>
          </th>
          <th
            scope="col"
            className="pb-2 text-left align-bottom font-normal text-(--w2-soft)"
          >
            Guest
          </th>
          {PARTS.map((part) => (
            <th
              key={part}
              scope="col"
              className="pb-2 pl-2 text-right align-bottom font-semibold"
              style={{ color: INK[part] }}
            >
              {PART_NAME[part]}
            </th>
          ))}
          <th
            scope="col"
            className="hidden pb-2 pl-5 text-left align-bottom font-normal text-(--w2-soft) md:table-cell"
          >
            Label
          </th>
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: rows }, (_, index) => (
              <tr
                key={index}
                aria-hidden
                className="border-b border-(--w2-rule)"
              >
                <td colSpan={6} className="py-3">
                  <span className="w2-wait block h-9 bg-(--w2-paper-deep)" />
                </td>
              </tr>
            ))
          : guests.map((guest, index) => (
              <TrackRow key={guest.ref} guest={guest} rank={index + 1} />
            ))}
      </tbody>
    </table>
  );
}

function TrackRow({ guest, rank }: { guest: Guest; rank: number }) {
  const sweet = guest.label === "sweet_spot";
  return (
    <tr className="border-b border-(--w2-rule) align-top">
      <td
        className={`w2-sans w2-figures py-3 text-[0.95rem] leading-[1.6rem] ${sweet ? "font-bold text-(--w2-ink)" : "text-(--w2-soft)"}`}
      >
        {rank}
      </td>
      <td className="min-w-0 py-3 pr-2">
        <span className="block truncate text-[1.12rem] leading-[1.6rem] sm:text-[1.2rem]">
          {guest.name}
        </span>
        {guest.description && (
          <span className="block truncate text-[0.95rem] leading-snug text-(--w2-soft) italic">
            {guest.description}
          </span>
        )}
        <span
          className={`mt-0.5 block text-[0.88rem] md:hidden ${sweet ? "w2-sans font-semibold" : "text-(--w2-soft) italic"}`}
        >
          {LABEL_NAME[guest.label]}
        </span>
      </td>
      {PARTS.map((part) => (
        <td key={part} className="py-3 pl-2 text-right">
          <Credit part={part} value={scoreOf(guest, part)} />
        </td>
      ))}
      <td
        className={`hidden py-3 pl-5 text-[0.98rem] leading-[1.6rem] md:table-cell ${sweet ? "w2-sans font-semibold" : "text-(--w2-soft) italic"}`}
      >
        {LABEL_NAME[guest.label]}
      </td>
    </tr>
  );
}

function Credit({ part, value }: { part: Part; value: number | null }) {
  return (
    <span className="flex flex-col items-end gap-1.5">
      <span className="w2-figures text-[1.12rem] leading-[1.6rem] sm:text-[1.2rem]">
        {value === null ? (
          <>
            <span aria-hidden className="text-(--w2-dim)">
              –
            </span>
            <span className="sr-only">not scored</span>
          </>
        ) : (
          out100(value)
        )}
      </span>
      <span
        aria-hidden
        className="relative block h-[3px] w-full bg-(--w2-rule)"
      >
        {value !== null && (
          <span
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.max(2, out100(value))}%`,
              background: INK[part],
            }}
          />
        )}
      </span>
    </span>
  );
}
