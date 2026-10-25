"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";

import { Voiceprint, ZoneHead } from "./hud";
import { ShowCover } from "./show-cover";

// The precomputed shows. Null while loading; empty when there are none or the engine isn't answering.
export function useFeatured(): Featured[] | null {
  const [featured, setFeatured] = useState<Featured[] | null>(null);

  useEffect(() => {
    let live = true;
    echo
      .featured()
      .then(({ featured }) => live && setFeatured(featured))
      .catch(() => live && setFeatured([]));
    return () => {
      live = false;
    };
  }, []);

  return featured;
}

// A compact list, for errors that send the host to the featured shows.
export function FeaturedList({ featured }: { featured: Featured[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {featured.map(({ show, analysis_id }) => (
        <li key={analysis_id}>
          <Link
            href={`/analyses/${encodeURIComponent(analysis_id)}`}
            className="group flex items-center gap-3 px-2 py-1.5 hover:bg-deck-hi"
          >
            <ShowCover show={show} size={36} />
            <span className="font-display text-lg font-semibold group-hover:underline">{show.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Columns for the shows there are, so a short list still fills the row.
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-2 xl:grid-cols-3",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

// The landing page's multiviewer of shows Echo has run, each with its guests' levels. Hidden when
// there's nothing to open. A finished analysis is read from the engine's store: no Qloo calls.
export function FeaturedShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <section aria-labelledby="featured" className="zone">
      <ZoneHead id="featured" title="Or open a show Echo has run">
        <span>{featured.length} ready</span>
      </ZoneHead>
      <ul className={`grid grid-cols-1 gap-2 p-2 ${COLUMNS[Math.min(featured.length, 4)]}`}>
        {featured.map((item, index) => (
          <ShowTile key={item.analysis_id} item={item} index={index} />
        ))}
      </ul>
    </section>
  );
}

function ShowTile({ item, index }: { item: Featured; index: number }) {
  const { show, analysis_id } = item;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(analysis_id, controller.signal)
      .then(setAnalysis)
      .catch(() => {});
    return () => controller.abort();
  }, [analysis_id]);

  const guests = analysis?.status === "done" ? analysis.guests.slice(0, 12) : [];
  const sweet = analysis?.guests.filter((guest) => guest.label === "sweet_spot").length ?? 0;

  return (
    <li className="rise" style={{ "--order": index } as CSSProperties}>
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className="group flex flex-col overflow-hidden rounded-2xl bg-deck shadow-[inset_0_0_0_1px_var(--steel)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--steel-hi),var(--shadow-pop)]"
      >
        <span className="screen relative flex aspect-video max-h-52 w-full items-end justify-center overflow-hidden">
          {show.image_url ? (
            <>
              <Image
                src={show.image_url}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1280px) 25vw, 50vw"
                className="scale-125 object-cover opacity-35 blur-2xl"
              />
              <span className="absolute top-1/2 left-1/2 aspect-square h-[78%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-pop">
                <Image src={show.image_url} alt="" fill unoptimized sizes="12rem" className="object-cover" />
              </span>
            </>
          ) : (
            // No artwork: the top guests' voiceprints are the picture.
            <span aria-hidden className="grid h-full w-full grid-cols-2 content-center gap-x-5 gap-y-3 px-5 pt-10 pb-4">
              <Lineup guests={guests} count={6} />
            </span>
          )}
          {sweet > 0 && (
            <span className="tag absolute top-2.5 right-2.5 rounded-full bg-sweet px-2.5 py-1 text-[0.6875rem] text-on-hue">
              {sweet} sweet {sweet === 1 ? "spot" : "spots"}
            </span>
          )}
        </span>
        <span className="flex flex-col gap-2 border-t border-steel bg-deck px-3 pt-2 pb-3">
          <span className="flex items-center gap-2">
            {show.image_url ? null : (
              <span aria-hidden className="font-display text-lg font-medium text-ink-dim">
                {show.title.trim().charAt(0)}
              </span>
            )}
            <span className="truncate font-display text-lg font-semibold">{show.title}</span>
          </span>
          {show.image_url && (
            <span aria-hidden className="grid grid-cols-3 gap-3">
              <Lineup guests={guests} count={3} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

// The top guests' voiceprints, best first; dim flat ones while the analysis loads.
function Lineup({ guests, count }: { guests: Guest[]; count: number }) {
  if (!guests.length) {
    return Array.from({ length: count }, (_, i) => (
      <Voiceprint key={i} fit={0} love={0} reach={0} bars={30} height={22} className="w-full opacity-25" />
    ));
  }
  return guests
    .slice(0, count)
    .map((guest) => (
      <Voiceprint
        key={guest.ref}
        fit={guest.scores.fit}
        love={guest.scores.love_back}
        reach={guest.scores.reach}
        bars={30}
        height={22}
        className="w-full"
      />
    ));
}

// For errors that send the host to the featured shows.
export function FeaturedFallback() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2">
      <h3 className="tag mb-2 text-ink-dim">Or open a show Echo has run</h3>
      <FeaturedList featured={featured} />
    </div>
  );
}
