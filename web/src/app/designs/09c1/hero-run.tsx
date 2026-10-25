"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";

import { CoverDisc } from "./cover";
import { useAnalysis } from "./runs";
import { styles } from "./styles";
import { Dial, HUE } from "./wave";

function shorten(title: string) {
  const clean = title.trim().toUpperCase();
  return clean.length > 26 ? `${clean.slice(0, 25).trimEnd()}…` : clean;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function HeroRun() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  const guests = analysis?.status === "done" ? analysis.guests : null;
  const sweet =
    guests?.filter((guest) => guest.label === "sweet_spot").length ?? 0;
  const waiting = featured === null || (first !== null && analysis === null);
  const label =
    first && guests
      ? `${shorten(first.show.title)} · ${plural(guests.length, "GUEST", "GUESTS")} · ${plural(sweet, "SWEET SPOT", "SWEET SPOTS")} ·`
      : undefined;

  return (
    <figure className="flex w-full flex-col">
      <div className="relative mx-auto aspect-square w-full max-w-[480px]">
        <Dial guests={guests} label={label} pending={waiting} />
        <div className="absolute top-1/2 left-1/2 w-[26%] -translate-x-1/2 -translate-y-1/2">
          <CoverDisc show={guests ? (first?.show ?? null) : null} />
        </div>
      </div>

      <figcaption className="mt-8 border-t border-(--w1-ink) pt-3">
        {first && guests ? (
          <>
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-[0.95rem] font-semibold">
                {first.show.title}, as Echo ran it
              </span>
              <Link
                href={`/analyses/${encodeURIComponent(first.analysis_id)}`}
                className="text-[0.95rem] font-semibold underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                Open the run
              </Link>
            </p>
            <p
              className={`${styles.serif} mt-1.5 text-[1.0625rem] leading-[1.45] text-(--w1-soft)`}
            >
              {guests.length} guests, best first, clockwise from No. 1. Each spoke
              holds three bars: <Term hue={HUE.fit}>fit</Term>,{" "}
              <Term hue={HUE.love}>love back</Term> and{" "}
              <Term hue={HUE.reach}>reach</Term>, from 0 at the inner ring to
              100 at the outer.{" "}
              {sweet === 0
                ? "No sweet spots in this run."
                : sweet === 1
                  ? "The dark arc marks the one sweet spot."
                  : `Dark arcs mark the ${sweet} sweet spots.`}
            </p>
          </>
        ) : (
          <p
            className={`${styles.serif} text-[1.0625rem] leading-[1.45] text-(--w1-soft)`}
          >
            {waiting
              ? "Loading a show Echo has run."
              : "Run a show and its guests appear on this dial: one spoke per guest, three bars per spoke."}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

function Term({ hue, children }: { hue: string; children: string }) {
  return (
    <span className="font-semibold" style={{ color: hue }}>
      {children}
    </span>
  );
}
