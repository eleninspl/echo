"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";
import type { Featured, Guest, Label } from "@/lib/echo";

import { Cover } from "./cover";
import { GuestMark, Pulse } from "./marks";
import { PARTS, SCORE, SCORE_NAME } from "./palette";
import { useAnalysis } from "./runs";
import { Figure, valueOf } from "./score-line";

const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const lineup = featured.length === 1 ? 6 : 3;

  return (
    <section
      id="w4-runs"
      aria-labelledby="w4-runs-title"
      className="w4-frame scroll-mt-6 pt-20 pb-4 lg:pt-28"
    >
      <div className="flex flex-col gap-3 border-t-2 border-(--w4-ink) pt-6">
        <h2
          id="w4-runs-title"
          className="w4-narrow text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[0.95] font-semibold"
        >
          Shows Echo has run
        </h2>
        <p className="max-w-[46ch] text-(--w4-soft)">
          The top of each lineup. Open a run for every guest and what drives
          each score.
        </p>
      </div>
      <ul>
        {featured.map((item) => (
          <RunRow key={item.analysis_id} item={item} lineup={lineup} />
        ))}
      </ul>
    </section>
  );
}

function RunRow({ item, lineup }: { item: Featured; lineup: number }) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const href = `/analyses/${encodeURIComponent(analysis_id)}`;

  return (
    <li className="grid grid-cols-1 gap-x-6 gap-y-8 border-b border-(--w4-rule) py-10 last:border-b-0 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-4">
        <div className="flex items-start gap-4">
          <Cover show={show} size={88} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="w4-narrow text-[1.9rem] leading-none font-semibold">
              <Link
                href={href}
                className="underline-offset-4 hover:underline"
              >
                {show.title}
              </Link>
            </h3>
            {show.description && (
              <p className="line-clamp-3 leading-snug text-(--w4-soft)">
                {show.description}
              </p>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-(--w4-rule)">
          <Count term="guests scored" value={done ? guests.length : null} />
          <Count
            term={sweet === 1 ? "sweet spot" : "sweet spots"}
            value={done ? sweet : null}
            divided
          />
        </dl>
        <Link
          href={href}
          className="group inline-flex h-12 w-fit items-center gap-3 bg-(--w4-ink) px-5 font-semibold text-(--w4-ground)"
        >
          Open the run
          <svg
            aria-hidden
            viewBox="0 0 20 12"
            className="h-3 w-5 transition-transform group-hover:translate-x-1"
            focusable="false"
          >
            <path d="M0 6h18M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth={1.8} />
          </svg>
        </Link>
      </div>

      <div className="min-w-0 lg:col-span-8">
        {done ? (
          <Lineup guests={guests.slice(0, lineup)} show={show.title} />
        ) : (
          <div className="flex h-full min-h-40 items-center gap-3 text-(--w4-soft)">
            <Pulse className="size-6 text-(--w4-ink)" />
            {analysis?.status === "failed"
              ? "This run didn't finish."
              : "Loading the lineup."}
          </div>
        )}
      </div>
    </li>
  );
}

function Count({
  term,
  value,
  divided = false,
}: {
  term: string;
  value: number | null;
  divided?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 pt-3 ${divided ? "border-l border-(--w4-rule) pl-5" : "pr-5"}`}
    >
      <dt className="order-2 text-[0.95rem] text-(--w4-soft)">{term}</dt>
      <dd className="w4-narrow w4-figures order-1 text-[3.5rem] leading-none font-semibold">
        {value ?? "–"}
      </dd>
    </div>
  );
}

function Lineup({ guests, show }: { guests: Guest[]; show: string }) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">
        Top {guests.length} guests Echo found for {show}, scored out of 100
      </caption>
      <thead>
        <tr className="border-b border-(--w4-ink) text-sm">
          <th scope="col" className="w-8 pb-2 font-normal text-(--w4-dim)">
            No.
          </th>
          <th scope="col" className="pb-2 font-normal text-(--w4-dim)">
            Guest
          </th>
          <th
            scope="col"
            className="hidden pb-2 font-normal text-(--w4-dim) md:table-cell"
          >
            Label
          </th>
          {PARTS.map((part) => (
            <th
              key={part}
              scope="col"
              className="w-12 pb-2 pl-2 text-right leading-tight font-semibold sm:w-20"
              style={{ color: SCORE[part] }}
            >
              {SCORE_NAME[part]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {guests.map((guest, index) => {
          const sweet = guest.label === "sweet_spot";
          return (
            <tr key={guest.ref} className="border-b border-(--w4-rule) last:border-b-0">
              <td className="w4-narrow w4-figures py-3 align-middle text-lg text-(--w4-dim)">
                {index + 1}
              </td>
              <td className="py-3 align-middle">
                <span className="flex items-center gap-3">
                  <GuestMark
                    scores={guest.scores}
                    className="size-10 shrink-0 sm:size-12"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="w4-narrow text-lg leading-tight font-semibold">
                      {guest.name}
                    </span>
                    {guest.description && (
                      <span className="truncate text-sm text-(--w4-soft) max-sm:hidden">
                        {guest.description}
                      </span>
                    )}
                    <span
                      className={`text-sm md:hidden ${sweet ? "font-semibold" : "text-(--w4-soft)"}`}
                    >
                      {LABEL_NAME[guest.label]}
                    </span>
                  </span>
                </span>
              </td>
              <td
                className={`hidden py-3 align-middle md:table-cell ${sweet ? "font-semibold" : "text-(--w4-soft)"}`}
              >
                {LABEL_NAME[guest.label]}
              </td>
              {PARTS.map((part) => (
                <td
                  key={part}
                  className="w4-narrow w4-figures py-3 pl-2 text-right align-middle text-xl font-semibold"
                >
                  <Figure value={valueOf(guest.scores, part)} />
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
