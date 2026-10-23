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

export function FeaturedList({ featured, compact = false }: { featured: Featured[]; compact?: boolean }) {
  return (
    <ul className={compact ? "flex flex-col gap-2" : "grid gap-px bg-rule sm:grid-cols-2"}>
      {featured.map(({ show, analysis_id }) => (
        <li key={analysis_id} className={compact ? "" : "bg-stock"}>
          <Link
            href={`/analyses/${encodeURIComponent(analysis_id)}`}
            className={`group flex items-center gap-4 ${compact ? "" : "p-4 sm:p-6"}`}
          >
            <ShowCover show={show} size={compact ? 40 : 64} />
            <span className="min-w-0">
              <span
                className={`block font-display leading-none font-extrabold uppercase group-hover:underline ${compact ? "text-xl" : "text-3xl"}`}
              >
                {show.title}
              </span>
              {show.description && !compact && (
                <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{show.description}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// The landing page's list, under the field. Hidden when there's nothing to open.
export function FeaturedShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <section aria-labelledby="featured" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
      <h2 id="featured" className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
        Shows Echo has run
      </h2>
      <p className="mt-2 mb-6 text-ink-soft">They open at once.</p>
      <FeaturedList featured={featured} />
    </section>
  );
}

// For errors that send the host to the featured shows.
export function FeaturedFallback() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2">
      <h3 className="mb-3 font-semibold">Shows Echo has run</h3>
      <FeaturedList featured={featured} compact />
    </div>
  );
}
