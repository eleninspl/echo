"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import type { Featured, Guest, Label } from "@/lib/echo";

import { Cover } from "./cover";
import { useAnalysis } from "./runs";
import { FRAME, styles } from "./styles";
import {
  HUE,
  levelsOf,
  out100,
  PART_NAME,
  PARTS,
  Voiceprint,
} from "./wave";

const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

export function ShowsLink() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <a
      href="#shows"
      className="hidden decoration-1 underline-offset-4 hover:text-(--w1-ink) hover:underline sm:inline"
    >
      Shows Echo has run
    </a>
  );
}

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const rows = featured.length === 1 ? 6 : 3;

  return (
    <section
      id="shows"
      aria-labelledby="w1-shows"
      className={`${FRAME} scroll-mt-6 pt-24 lg:pt-32`}
    >
      <h2
        id="w1-shows"
        className={`${styles.wide} text-[clamp(1.875rem,2.6vw,2.25rem)] leading-[1.08] font-semibold tracking-[-0.02em]`}
      >
        Shows Echo has run
      </h2>
      <p
        className={`${styles.serif} mt-3 max-w-[46ch] text-[1.125rem] leading-[1.5] text-(--w1-soft)`}
      >
        Open one to see every guest Echo found, ranked, and what drives each
        score.
      </p>
      <ol className="mt-10">
        {featured.map((item, index) => (
          <RunEntry
            key={item.analysis_id}
            item={item}
            rows={rows}
            index={index}
          />
        ))}
      </ol>
    </section>
  );
}

function RunEntry({
  item,
  rows,
  index,
}: {
  item: Featured;
  rows: number;
  index: number;
}) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const href = `/analyses/${encodeURIComponent(analysis_id)}`;

  return (
    <li
      className={`${styles.rise} grid grid-cols-1 gap-x-6 gap-y-8 border-t-[1.5px] border-(--w1-ink) pt-5 pb-14 lg:grid-cols-12`}
      style={{ "--order": index } as CSSProperties}
    >
      <div className="flex min-w-0 flex-col lg:col-span-3">
        <div className="flex items-start gap-4 lg:flex-col lg:gap-0">
          <Cover show={show} size={72} />
          <div className="min-w-0 lg:mt-4">
            <h3
              className={`${styles.wide} text-[1.375rem] leading-tight font-semibold tracking-[-0.015em]`}
            >
              <Link
                href={href}
                className="decoration-1 underline-offset-4 hover:underline"
              >
                {show.title}
              </Link>
            </h3>
            {show.description && (
              <p
                className={`${styles.serif} mt-1.5 text-[1.0625rem] leading-[1.4] text-(--w1-soft)`}
              >
                {show.description}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 border-t border-(--w1-line) pt-3">
          <Stat term="Guests scored" value={done ? guests.length : null} />
          <Stat
            term={sweet === 1 ? "Sweet spot" : "Sweet spots"}
            value={done ? sweet : null}
          />
        </dl>

        <Link
          href={href}
          className="mt-6 self-start text-[0.95rem] font-semibold underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          {done ? `See all ${guests.length} guests` : "Open the run"}
        </Link>
      </div>

      <div className="min-w-0 lg:col-span-9">
        <Lineup
          title={show.title}
          guests={guests.slice(0, rows)}
          rows={rows}
          loading={!done}
        />
      </div>
    </li>
  );
}

function Stat({ term, value }: { term: string; value: number | null }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-[0.9rem] text-(--w1-soft)">{term}</dt>
      <dd
        className={`${styles.num} ${styles.wide} text-[2.75rem] leading-none font-medium tracking-[-0.02em] ${value === null ? `${styles.waiting} text-(--w1-line-strong)` : ""}`}
      >
        {value ?? "00"}
      </dd>
    </div>
  );
}

function Lineup({
  title,
  guests,
  rows,
  loading,
}: {
  title: string;
  guests: Guest[];
  rows: number;
  loading: boolean;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">
        The top {rows} guests Echo found for {title}
      </caption>
      <thead>
        <tr className="text-[0.85rem] leading-tight font-medium text-(--w1-dim)">
          <th scope="col" className="w-9 pb-2 font-medium">
            No.
          </th>
          <th scope="col" className="pb-2 font-medium">
            Guest
          </th>
          <th
            scope="col"
            className="hidden w-[140px] pb-2 font-medium md:table-cell"
          >
            Shape
          </th>
          <th
            scope="col"
            className="hidden w-[128px] pb-2 font-medium sm:table-cell"
          >
            Label
          </th>
          {PARTS.map((part) => (
            <th
              key={part}
              scope="col"
              className={`pb-2 text-right font-semibold ${part === "love" ? "w-[3.75rem] sm:w-24" : "w-12 sm:w-16"}`}
              style={{ color: HUE[part] }}
            >
              {PART_NAME[part]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading
          ? Array.from({ length: rows }, (_, index) => (
              <tr
                key={index}
                aria-hidden
                className="border-t border-(--w1-line)"
              >
                <td colSpan={7} className="py-3">
                  <span
                    className={`${styles.waiting} block h-9 bg-(--w1-well)`}
                  />
                </td>
              </tr>
            ))
          : guests.map((guest, index) => (
              <GuestRow key={guest.ref} guest={guest} rank={index + 1} />
            ))}
      </tbody>
    </table>
  );
}

function GuestRow({ guest, rank }: { guest: Guest; rank: number }) {
  const levels = levelsOf(guest);
  return (
    <tr className="border-t border-(--w1-line) align-middle">
      <td
        className={`${styles.num} py-3.5 text-[0.95rem] font-medium text-(--w1-dim)`}
      >
        {rank}
      </td>
      <td className="min-w-0 py-3.5 pr-3">
        <span className="block truncate text-[1.0625rem] leading-snug font-semibold">
          {guest.name}
        </span>
        {guest.description && (
          <span className="block truncate text-[0.9rem] leading-snug text-(--w1-soft)">
            {guest.description}
          </span>
        )}
        <span className="mt-1 block sm:hidden">
          <LabelText label={guest.label} />
        </span>
      </td>
      <td className="hidden py-3.5 pr-4 md:table-cell">
        <Voiceprint
          levels={levels}
          bars={30}
          width={120}
          height={36}
          className="block h-9 w-[120px]"
        />
      </td>
      <td className="hidden py-3.5 sm:table-cell">
        <LabelText label={guest.label} />
      </td>
      {PARTS.map((part) => (
        <Score key={part} value={levels[part]} />
      ))}
    </tr>
  );
}

function LabelText({ label }: { label: Label }) {
  if (label === "sweet_spot") {
    return (
      <span className="text-[0.95rem] font-semibold">{LABEL_NAME[label]}</span>
    );
  }
  return (
    <span className="text-[0.95rem] text-(--w1-soft)">
      {LABEL_NAME[label]}
    </span>
  );
}

function Score({ value }: { value: number | null }) {
  return (
    <td
      className={`${styles.num} py-3.5 text-right text-[1.0625rem] font-medium`}
    >
      {value === null ? (
        <>
          <span aria-hidden className="text-(--w1-dim)">
            –
          </span>
          <span className="sr-only">not scored</span>
        </>
      ) : (
        out100(value)
      )}
    </td>
  );
}
