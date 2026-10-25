"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import { Logo } from "@/components/logo";
import {
  echo,
  type Analysis,
  type Featured,
  type Guest,
  type Show,
} from "@/lib/echo";
import { LABELS, score } from "@/lib/format";

import { styles } from "./styles";
import { ArrowRight } from "./search";
import { initialOf } from "./show-art";

const GRID_COLUMNS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

function useAnalysis(id: string): Analysis | null {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(id, controller.signal)
      .then(setAnalysis)
      .catch(() => {});
    return () => controller.abort();
  }, [id]);
  return analysis;
}

function finishedGuests(analysis: Analysis | null): Guest[] {
  return analysis?.status === "done" ? analysis.guests : [];
}

function countSweet(guests: Guest[]): number {
  return guests.filter((guest) => guest.label === "sweet_spot").length;
}

function storyHref(analysisId: string): string {
  return `/analyses/${encodeURIComponent(analysisId)}`;
}

export function CoverStories() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const count = Math.min(featured.length, 4);

  return (
    <section
      id="covers"
      aria-labelledby="d01-covers"
      className="mt-24 sm:mt-32"
    >
      <div className={styles.doubleRule} />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pt-6 pb-10">
        <div>
          <p className={`${styles.kicker} text-(--red)`}>Shows Echo has run</p>
          <h2
            id="d01-covers"
            className={`${styles.display} mt-3 text-[3.25rem] leading-[0.95] sm:text-[4.5rem]`}
          >
            Cover stories
          </h2>
        </div>
        <p className="max-w-[34ch] text-[1.0625rem] leading-snug text-(--ink-soft) italic">
          {featured.length === 1
            ? "One show is ready to open, read from its finished analysis."
            : `${featured.length} shows are ready to open, each read from a finished analysis.`}
        </p>
      </div>
      {featured.length === 1 ? (
        <WideStory item={featured[0]} />
      ) : (
        <ul
          className={`grid grid-cols-1 gap-x-8 gap-y-14 ${GRID_COLUMNS[count]}`}
        >
          {featured.slice(0, 4).map((item, index) => (
            <CardStory key={item.analysis_id} item={item} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

function WideStory({ item }: { item: Featured }) {
  const analysis = useAnalysis(item.analysis_id);
  const guests = finishedGuests(analysis);
  const sweet = countSweet(guests);
  const leftOut = analysis?.left_out.length ?? 0;
  const href = storyHref(item.analysis_id);

  return (
    <div className="grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-12">
      <Link
        href={href}
        className={`${styles.story} block md:col-span-5`}
        aria-label={`Open ${item.show.title}`}
      >
        <Cover show={item.show} guests={guests} loaded={analysis !== null} />
      </Link>

      <div className="flex min-w-0 flex-col md:col-span-7">
        <p className={`${styles.kicker} text-(--ink-dim)`}>Inside this story</p>
        <h3
          className={`${styles.display} mt-3 text-[2.75rem] leading-none sm:text-[3.5rem]`}
        >
          <Link
            href={href}
            className="hover:underline hover:decoration-1 hover:underline-offset-4"
          >
            {item.show.title}
          </Link>
        </h3>
        {item.show.description && (
          <p className="mt-3 max-w-[48ch] text-xl leading-snug text-(--ink-soft) italic">
            {item.show.description}
          </p>
        )}

        {guests.length > 0 && (
          <dl className="mt-8 grid grid-cols-3 border-y border-(--ink)">
            <Figure value={guests.length} label="Guests scored" />
            <Figure
              value={sweet}
              label={sweet === 1 ? "Sweet spot" : "Sweet spots"}
              accent
            />
            <Figure value={leftOut} label="Hosts and past guests left out" />
          </dl>
        )}

        {guests.length > 0 ? (
          <GuestTable guests={guests.slice(0, 5)} />
        ) : (
          <p className="mt-8 text-(--ink-dim) italic">
            {analysis
              ? "This analysis has no guests yet."
              : "Reading the analysis…"}
          </p>
        )}

        <Link
          href={href}
          className={`${styles.sans} mt-8 inline-flex min-h-11 items-center gap-3 self-start border-b-[1.5px] border-(--ink) text-[0.8125rem] font-semibold tracking-[0.14em] uppercase hover:border-(--red) hover:text-(--red)`}
        >
          Read the full analysis
          <ArrowRight />
        </Link>
      </div>
    </div>
  );
}

function Figure({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-1 border-l border-(--rule) px-3 py-4 first:border-l-0 first:pl-0 sm:px-5">
      <dt className={`${styles.folio} leading-snug text-(--ink-dim)`}>
        {label}
      </dt>
      <dd
        className={`${styles.display} ${styles.numerals} text-[2.75rem] leading-none sm:text-6xl ${accent ? "text-(--red)" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function GuestTable({ guests }: { guests: Guest[] }) {
  return (
    <table className="mt-8 w-full border-collapse text-left">
      <caption className={`${styles.folio} pb-3 text-left text-(--ink-dim)`}>
        The top {guests.length}, as Echo ranked them. Scores out of 100.
      </caption>
      <thead>
        <tr
          className={`${styles.folio} border-b border-(--ink) text-(--ink-soft)`}
        >
          <th
            scope="col"
            className="hidden py-2 pr-3 font-medium sm:table-cell"
          >
            No.
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Guest
          </th>
          <th scope="col" className="py-2 pl-2 text-right font-medium">
            Fit
          </th>
          <th scope="col" className="py-2 pl-2 text-right font-medium">
            Love back
          </th>
          <th scope="col" className="py-2 pl-2 text-right font-medium">
            Reach
          </th>
        </tr>
      </thead>
      <tbody>
        {guests.map((guest, index) => {
          const sweet = guest.label === "sweet_spot";
          return (
            <tr
              key={guest.ref}
              className="border-b border-(--rule) align-baseline"
            >
              <td
                className={`${styles.display} ${styles.numerals} hidden py-3 pr-3 text-xl text-(--ink-dim) sm:table-cell`}
              >
                {String(index + 1).padStart(2, "0")}
              </td>
              <td className="py-3 pr-3">
                <span
                  className={`${styles.display} block text-[1.375rem] leading-tight`}
                >
                  {guest.name}
                </span>
                <span className="block text-[0.9375rem] leading-snug text-(--ink-dim)">
                  <span className={sweet ? "font-medium text-(--red)" : ""}>
                    {LABELS[guest.label].name}
                  </span>
                  {guest.description && (
                    <span className="hidden sm:inline">
                      . {guest.description}
                    </span>
                  )}
                </span>
              </td>
              <ScoreCell value={guest.scores.fit} />
              <ScoreCell value={guest.scores.love_back} />
              <ScoreCell value={guest.scores.reach} />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  return (
    <td className={`${styles.numerals} py-3 pl-2 text-right text-lg`}>
      {value === null ? (
        <span
          className="text-[0.9375rem] text-(--ink-dim) italic"
          title="Too little data to say"
        >
          n/a
        </span>
      ) : (
        score(value)
      )}
    </td>
  );
}

function CardStory({ item, index }: { item: Featured; index: number }) {
  const analysis = useAnalysis(item.analysis_id);
  const guests = finishedGuests(analysis);
  const leads = guests.slice(0, 3).map((guest) => guest.name);

  return (
    <li className={styles.rise} style={{ "--order": index } as CSSProperties}>
      <Link
        href={storyHref(item.analysis_id)}
        className={`${styles.story} flex flex-col gap-5`}
      >
        <Cover
          show={item.show}
          guests={guests}
          loaded={analysis !== null}
          compact
        />
        <span className="flex flex-col gap-2 border-t border-(--ink) pt-3">
          {item.show.description && (
            <span className="line-clamp-2 text-[1.0625rem] leading-snug text-(--ink-soft) italic">
              {item.show.description}
            </span>
          )}
          {guests.length > 0 ? (
            <span
              className={`${styles.folio} leading-relaxed text-(--ink-dim)`}
            >
              Leading{" "}
              <span
                className={`${styles.display} ${styles.storyTitle} ml-1 text-[1.1875rem] tracking-normal text-(--ink) normal-case`}
              >
                {leads.join(", ")}
              </span>
            </span>
          ) : (
            <span className="text-(--ink-dim) italic">
              {analysis ? "No guests yet." : "Reading the analysis…"}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function Cover({
  show,
  guests,
  loaded,
  compact = false,
}: {
  show: Show;
  guests: Guest[];
  loaded: boolean;
  compact?: boolean;
}) {
  const sweet = countSweet(guests);
  return (
    <span
      className={`${styles.cover} relative flex aspect-[4/5] min-h-0 flex-col overflow-hidden bg-(--paper-deep) p-5 sm:p-6`}
    >
      <span className="flex items-center justify-between border-b border-(--ink) pb-2.5">
        <span className="flex items-center gap-2">
          <Logo className="size-6 text-(--red)" />
          <span className={`${styles.display} text-[1.75rem] leading-none`}>
            Echo
          </span>
        </span>
        <span className={`${styles.folio} text-(--ink-soft)`}>Cover story</span>
      </span>

      <span className="relative my-4 min-h-0 flex-1">
        <span className="absolute inset-0 flex items-center justify-center">
          {show.image_url ? (
            <span className="relative aspect-square h-full max-w-full">
              <Image
                src={show.image_url}
                alt=""
                fill
                unoptimized
                sizes="24rem"
                className="object-cover"
              />
            </span>
          ) : guests.length > 0 ? (
            <Scatter guests={guests} />
          ) : (
            <span
              aria-hidden
              className={`${styles.display} text-[9rem] leading-none text-(--red)/30 italic`}
            >
              {loaded ? initialOf(show.title) : ""}
            </span>
          )}
        </span>
      </span>

      <span className="flex flex-col gap-1">
        <span
          className={`${styles.display} text-[2.25rem] leading-[0.95] ${compact ? "sm:text-[2rem] xl:text-[2.125rem]" : "sm:text-[2.75rem]"}`}
        >
          {show.title}
        </span>
        {guests.length > 0 && (
          <span
            className={`${styles.folio} mt-1 flex flex-wrap gap-x-3 gap-y-1 text-(--ink-soft)`}
          >
            <span>{guests.length} guests scored</span>
            {sweet > 0 && (
              <span className="text-(--red)">{sweet} in the sweet spot</span>
            )}
          </span>
        )}
      </span>
    </span>
  );
}

const PLOT = { size: 260, pad: 18 };

function Scatter({ guests }: { guests: Guest[] }) {
  const span = PLOT.size - PLOT.pad * 2;
  const place = (value: number) => PLOT.pad + value * span;
  const ordered = [...guests].sort(
    (a, b) =>
      Number(a.label === "sweet_spot") - Number(b.label === "sweet_spot"),
  );
  return (
    <svg
      viewBox={`0 0 ${PLOT.size} ${PLOT.size}`}
      className="size-full"
      role="img"
      aria-label="Each ring is a guest: fit runs across, love back runs up, a bigger ring means more reach. Filled rings are in the sweet spot."
    >
      <rect
        x={PLOT.pad}
        y={PLOT.pad}
        width={span}
        height={span}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={0.25}
      />
      <line
        x1={PLOT.size / 2}
        y1={PLOT.pad}
        x2={PLOT.size / 2}
        y2={PLOT.size - PLOT.pad}
        stroke="var(--ink)"
        strokeOpacity={0.18}
        strokeDasharray="2 4"
      />
      <line
        x1={PLOT.pad}
        y1={PLOT.size / 2}
        x2={PLOT.size - PLOT.pad}
        y2={PLOT.size / 2}
        stroke="var(--ink)"
        strokeOpacity={0.18}
        strokeDasharray="2 4"
      />
      {ordered.map((guest) => {
        const sweet = guest.label === "sweet_spot";
        const radius = 3.5 + (guest.scores.reach ?? 0.2) * 11;
        return (
          <circle
            key={guest.ref}
            cx={place(guest.scores.fit)}
            cy={PLOT.size - place(guest.scores.love_back)}
            r={radius}
            fill={sweet ? "var(--red)" : "none"}
            fillOpacity={sweet ? 0.9 : 0}
            stroke={sweet ? "var(--red)" : "var(--ink)"}
            strokeWidth={1.2}
            strokeDasharray={guest.scores.reach === null ? "2 2" : undefined}
          />
        );
      })}
      <text
        x={PLOT.size - PLOT.pad}
        y={PLOT.size - 4}
        textAnchor="end"
        className={styles.sans}
        fontSize="8"
        fontWeight="600"
        letterSpacing="1.4"
        fill="var(--ink-soft)"
      >
        FIT →
      </text>
      <text
        x={6}
        y={PLOT.pad}
        textAnchor="end"
        transform={`rotate(-90 6 ${PLOT.pad})`}
        className={styles.sans}
        fontSize="8"
        fontWeight="600"
        letterSpacing="1.4"
        fill="var(--ink-soft)"
        dominantBaseline="hanging"
      >
        LOVE BACK →
      </text>
    </svg>
  );
}
