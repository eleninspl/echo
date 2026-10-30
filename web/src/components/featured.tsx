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
