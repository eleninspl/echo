"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";

import { CoverDisc } from "./cover";
import { useAnalysis } from "./runs";
import { Dial, INK, TONE, type Part } from "./wave";

const KEY: [Part, string][] = [
  ["fit", "Fit"],
  ["love", "Love back"],
  ["reach", "Reach"],
];

function shorten(title: string) {
  const clean = title.trim().toUpperCase();
  return clean.length > 24 ? `${clean.slice(0, 23).trimEnd()}…` : clean;
}

export function HeroRun() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  const guests = analysis?.status === "done" ? analysis.guests : null;
  const sweet =
    guests?.filter((guest) => guest.label === "sweet_spot").length ?? 0;
  const label =
    first && guests
      ? `${shorten(first.show.title)} · ${guests.length} GUESTS · ${sweet} SWEET ${sweet === 1 ? "SPOT" : "SPOTS"} ·`
      : undefined;

  return (
    <figure className="flex w-full flex-col items-center gap-5">
      <div className="relative aspect-square w-full max-w-[440px]">
        <Dial
          guests={guests}
          label={label}
          pending={featured === null || (first !== null && !guests)}
        />
        <div className="absolute top-1/2 left-1/2 w-[27%] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_14px_40px_-12px_rgb(42_16_48/0.45)]">
          <CoverDisc show={first?.show ?? null} />
        </div>
      </div>

      <figcaption className="flex w-full max-w-[480px] flex-col gap-2.5 text-center">
        {first && guests ? (
          <p className="text-[0.95rem] leading-relaxed text-(--v9c-soft)">
            <span className="font-semibold text-(--v9c-ink)">
              {first.show.title}
            </span>
            , as Echo ran it: {guests.length} guests, best first, clockwise from
            the top. Sweet spots in full colour.{" "}
            <Link
              href={`/analyses/${encodeURIComponent(first.analysis_id)}`}
              className="font-semibold whitespace-nowrap text-(--v9c-reach-ink) underline decoration-2 underline-offset-4 hover:text-(--v9c-ink)"
            >
              Open this run
            </Link>
          </p>
        ) : (
          <p className="text-[0.95rem] leading-relaxed text-(--v9c-soft)">
            {featured && !first
              ? "Every show Echo runs becomes a ring like this: one spoke of three bars per guest."
              : "Loading a show Echo has run."}
          </p>
        )}
        <ul
          aria-label="Colour key"
          className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm font-semibold"
        >
          {KEY.map(([part, name]) => (
            <li
              key={part}
              className="inline-flex items-center gap-2"
              style={{ color: INK[part] }}
            >
              <span
                aria-hidden
                className="h-3.5 w-1.5 rounded-full"
                style={{ background: TONE[part] }}
              />
              {name}
            </li>
          ))}
          <li className="inline-flex items-center gap-2 text-(--v9c-ink)">
            <span aria-hidden className="h-1 w-4 rounded-full bg-(--v9c-ink)" />
            Sweet spot
          </li>
        </ul>
      </figcaption>
    </figure>
  );
}
