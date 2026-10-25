"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";
import type { Guest } from "@/lib/echo";

import { Dial } from "./dial";
import { Pulse } from "./marks";
import { PARTS, SCORE, SCORE_NAME } from "./palette";
import { useAnalysis } from "./runs";
import { Figure, valueOf } from "./score-line";

function ringLabel(title: string, guests: number, sweet: number) {
  const name = title.trim().toUpperCase();
  const short = name.length > 22 ? `${name.slice(0, 21).trimEnd()}…` : name;
  return `${short} · ${guests} GUESTS · ${sweet} SWEET ${sweet === 1 ? "SPOT" : "SPOTS"} ·`;
}


export function HeroRun() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  const guests = analysis?.status === "done" ? analysis.guests : null;
  const sweet = guests
    ? guests
        .map((guest, index) => ({ guest, rank: index + 1 }))
        .filter(({ guest }) => guest.label === "sweet_spot")
    : [];
  const loading = featured === null || (first !== null && guests === null);

  return (
    <figure className="flex flex-col gap-6">
      <div className="relative mx-auto aspect-square w-full max-w-[560px] lg:mx-0">
        <Dial
          guests={guests}
          cover={first?.show.image_url}
          label={
            first && guests
              ? ringLabel(first.show.title, guests.length, sweet.length)
              : undefined
          }
        />
        {loading && (
          <span className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 bg-(--w4-ground) p-2 text-(--w4-ink)">
            <Pulse className="size-full" />
            <span className="sr-only">Loading a show Echo has run</span>
          </span>
        )}
      </div>

      <figcaption className="grid max-w-[560px] grid-cols-1 gap-5 border-t-2 border-(--w4-ink) pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-8">
        {first && guests ? (
          <>
            <div className="flex flex-col gap-2 text-[0.95rem] leading-snug text-(--w4-soft)">
              <p>
                <span className="font-semibold text-(--w4-ink)">
                  {first.show.title}
                </span>
                , as Echo ran it. {guests.length} guests, best first, clockwise
                from the top.{" "}
                {sweet.length > 0 && (
                  <>
                    Arcs mark the {sweet.length}{" "}
                    {sweet.length === 1 ? "sweet spot" : "sweet spots"}:{" "}
                    {sweet.map(({ guest, rank }, index) => (
                      <span key={guest.ref}>
                        {index > 0 &&
                          (index === sweet.length - 1 ? " and " : ", ")}
                        <span className="text-(--w4-ink)">{guest.name}</span>{" "}
                        <span className="w4-figures">({rank})</span>
                      </span>
                    ))}
                    .
                  </>
                )}
              </p>
              <Link
                href={`/analyses/${encodeURIComponent(first.analysis_id)}`}
                className="w-fit font-semibold text-(--w4-ink) underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                See all {guests.length} guests
              </Link>
            </div>
            {guests[0] && <SpokeKey guest={guests[0]} />}
          </>
        ) : (
          <p className="text-[0.95rem] leading-snug text-(--w4-soft) sm:col-span-2">
            {loading
              ? "Loading a show Echo has run."
              : "Every show Echo runs is drawn as a dial: one spoke of three bars per guest, best first."}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

function SpokeKey({ guest }: { guest: Guest }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.95rem] leading-snug text-(--w4-soft)">
        Spoke <span className="w4-figures">1</span> is{" "}
        <span className="text-(--w4-ink)">{guest.name}</span>:
      </p>
      <dl className="flex flex-col gap-1.5">
        {PARTS.map((part) => {
          const value = valueOf(guest.scores, part);
          return (
            <div
              key={part}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm"
            >
              <dt style={{ color: SCORE[part] }} className="font-semibold">
                {SCORE_NAME[part]}
              </dt>
              <dd className="contents">
                <span aria-hidden className="relative h-2.5 bg-(--w4-well)">
                  {value !== null && (
                    <span
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${Math.round(value * 100)}%`,
                        background: SCORE[part],
                      }}
                    />
                  )}
                </span>
                <span className="w4-figures text-right font-semibold text-(--w4-ink)">
                  <Figure value={value} />
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
