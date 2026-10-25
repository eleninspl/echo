"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";

import { Dial } from "./dial";
import { useAnalysis } from "./load";
import { INK } from "./scores";

export function HeroRun() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  const guests = analysis?.status === "done" ? analysis.guests : null;
  const empty = featured !== null && first === null;

  return (
    <figure className="flex w-full flex-col gap-4">
      <div className={guests || empty ? "" : "w6-waiting"}>
        <Dial show={first?.show ?? null} guests={guests} marked />
      </div>
      <figcaption className="max-w-[46ch] border-t border-(--w6-rule) pt-3 text-[0.9375rem] leading-relaxed text-(--w6-soft)">
        {first && guests ? (
          <>
            <span className="font-semibold text-(--w6-ink)">
              {first.show.title}
            </span>
            , as Echo ran it. {guests.length} guests, best first, clockwise from
            the top. Each spoke is one guest:{" "}
            <span style={{ color: INK.fit }}>fit</span>,{" "}
            <span style={{ color: INK.love }}>love back</span> and{" "}
            <span style={{ color: INK.reach }}>reach</span>, 0 to 100 out from
            the inner ring.{" "}
            <Link
              href={`/analyses/${encodeURIComponent(first.analysis_id)}`}
              className="w6-link font-semibold whitespace-nowrap text-(--w6-ink)"
            >
              See the full lineup
            </Link>
          </>
        ) : empty ? (
          "When Echo has run a show, its guests appear here as spokes: fit, love back and reach, best first."
        ) : (
          "Loading a show Echo has run."
        )}
      </figcaption>
    </figure>
  );
}
