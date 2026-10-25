"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { echo, type Featured } from "@/lib/echo";

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

// The landing page's row of shows Echo has run, under the search. Hidden when there's nothing to open.
export function FeaturedShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <section aria-labelledby="featured" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 id="featured" className="tag text-ink-dim">
        Or open a show Echo has run
      </h2>
      <ul className="flex flex-wrap gap-2">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="flex items-center gap-2 rounded-xl bg-deck py-1 pr-3 pl-1 shadow-[inset_0_0_0_1px_var(--steel)] transition-colors hover:bg-deck-hi"
            >
              <ShowCover show={show} size={28} />
              <span className="font-display font-semibold">{show.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
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
