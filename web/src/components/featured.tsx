"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";

import { LABEL_HUE, Meter, PanelHead, SCORE_HUE } from "./gallery";
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
            className="group flex items-center gap-3 rounded-[3px] px-2 py-1.5 hover:bg-bezel"
          >
            <ShowCover show={show} size={36} />
            <span className="font-cond text-lg font-semibold group-hover:underline">{show.title}</span>
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
    <section aria-labelledby="featured" className="panel rounded-[4px]">
      <PanelHead id="featured" title="Or open a show Echo has run">
        <span>{featured.length} ready</span>
      </PanelHead>
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
    <li className="power" style={{ "--order": index } as CSSProperties}>
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className="group flex flex-col overflow-hidden rounded-[3px] bg-monitor shadow-[0_0_0_1px_var(--line)] transition-shadow hover:shadow-[0_0_0_2px_var(--amber)]"
      >
        <span className="monitor relative flex aspect-video max-h-52 w-full items-end justify-center overflow-hidden">
          {show.image_url ? (
            <Image
              src={show.image_url}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1280px) 25vw, 50vw"
              className="object-cover"
            />
          ) : (
            // No artwork: the show's own channel levels are the picture.
            <span aria-hidden className="flex h-full w-full items-end gap-1 px-3 pt-8 pb-3">
              <Levels guests={guests} />
            </span>
          )}
          {sweet > 0 && (
            <span className="absolute top-2 right-2 silk rounded-[2px] bg-tally px-1.5 py-1 text-[0.5625rem] text-on-light">
              {sweet} on air
            </span>
          )}
        </span>
        <span className="flex flex-col gap-2 border-t border-line bg-panel px-3 pt-2 pb-3">
          <span className="flex items-center gap-2">
            {show.image_url ? null : (
              <span aria-hidden className="font-cond text-lg font-medium text-ink-dim">
                {show.title.trim().charAt(0)}
              </span>
            )}
            <span className="truncate font-cond text-lg font-semibold group-hover:text-white">{show.title}</span>
          </span>
          {show.image_url && (
            <span aria-hidden className="flex h-8 items-end gap-1">
              <Levels guests={guests} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

// A show's guests as a row of three-meter channels; dim placeholders while the analysis loads.
function Levels({ guests }: { guests: Guest[] }) {
  if (!guests.length) {
    return Array.from({ length: 12 }, (_, i) => <span key={i} className="h-full flex-1 rounded-[1px] bg-bezel/60" />);
  }
  return guests.map((guest, i) => (
    <span key={guest.ref} className="flex h-full flex-1 flex-col gap-0.5">
      <span className="flex flex-1 gap-px">
        <Meter vertical value={guest.scores.fit} color={SCORE_HUE.fit} segments={22} order={i} className="flex-1" />
        <Meter
          vertical
          value={guest.scores.love_back}
          color={SCORE_HUE.love_back}
          segments={22}
          order={i}
          className="flex-1"
        />
        <Meter
          vertical
          value={guest.scores.reach ?? 0}
          color={SCORE_HUE.reach}
          segments={22}
          order={i}
          className="flex-1"
        />
      </span>
      <span className="h-0.5 rounded-full" style={{ background: LABEL_HUE[guest.label] }} />
    </span>
  ));
}

// For errors that send the host to the featured shows.
export function FeaturedFallback() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2">
      <h3 className="silk mb-2 text-ink-dim">Or open a show Echo has run</h3>
      <FeaturedList featured={featured} />
    </div>
  );
}
