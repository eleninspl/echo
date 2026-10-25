"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { Logo } from "@/components/logo";

import { Dial } from "./dial";
import { INK, countSweet, plural, type Part } from "./inks";
import { useAnalysis } from "./runs";

function shorten(title: string) {
  const clean = title.trim();
  return clean.length > 28 ? `${clean.slice(0, 27).trimEnd()}…` : clean;
}

export function InInk({ part, children }: { part: Part; children: ReactNode }) {
  return (
    <span className="w2-sans font-semibold" style={{ color: INK[part] }}>
      {children}
    </span>
  );
}

export function HeroRun() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  const guests = analysis?.status === "done" ? analysis.guests : null;
  const sweet = guests ? countSweet(guests) : 0;
  const unscored = guests?.some((guest) => guest.scores.reach === null);
  const waiting = featured === null || (first !== null && guests === null);
  const arc =
    first && guests
      ? {
          top: shorten(first.show.title),
          bottom: `${plural(guests.length, "guest", "guests")}  ·  ${plural(sweet, "sweet spot", "sweet spots")}`,
        }
      : null;

  return (
    <figure className="flex w-full flex-col">
      <div className="relative mx-auto aspect-square w-full max-w-[520px]">
        <Dial guests={guests ?? []} arc={arc} waiting={waiting} />
        <div className="absolute top-1/2 left-1/2 flex aspect-square w-[21%] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full text-[#f8e6da]">
          {first?.show.image_url ? (
            <Image
              src={first.show.image_url}
              alt=""
              width={120}
              height={120}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <Logo className="size-[58%]" />
          )}
        </div>
      </div>

      <figcaption className="mt-5 grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-t border-(--w2-rule) pt-4 text-[1rem] leading-[1.55] text-(--w2-soft)">
        <span className="w2-sans pt-[0.2rem] text-[0.8rem] font-semibold text-(--w2-ink)">
          Fig. 1
        </span>
        {first && guests ? (
          <p>
            <span className="text-(--w2-ink) italic">{first.show.title}</span>,
            as Echo ran it: {plural(guests.length, "guest", "guests")}, best
            first, numbered clockwise from the top. Each spoke reads{" "}
            <InInk part="fit">fit</InInk>, <InInk part="love">love back</InInk>{" "}
            and <InInk part="reach">reach</InInk> from the label out to 100.{" "}
            {sweet === 0 && "No guest clears all three in this run."}
            {sweet === 1 && "The heavy spoke is the sweet spot."}
            {sweet > 1 && `The heavy spokes are the ${sweet} sweet spots.`}
            {unscored && " A small ring is a reach Echo couldn't score."}{" "}
            <Link
              href={`/analyses/${encodeURIComponent(first.analysis_id)}`}
              className="w2-sans w2-link font-semibold whitespace-nowrap text-(--w2-ink)"
            >
              Open this run
            </Link>
          </p>
        ) : (
          <p>
            {featured && !first
              ? "Each show Echo runs is drawn like this: one spoke per guest, best first, each spoke three bars for fit, love back and reach."
              : "Loading a show Echo has run."}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
