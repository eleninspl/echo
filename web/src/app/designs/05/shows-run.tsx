"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";

import { styles } from "./styles";
import { FRAME, LIME, PINK, SKY, YELLOW } from "./palette";
import { Cover, LabelSticker, ScoreBar, Stamp, Sticker } from "./parts";

const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2",
};

export function ShowsRun() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <section
      id="shows"
      aria-labelledby="d05-shows"
      className="border-t-3 border-(--nb-ink) bg-(--nb-lavender) py-20 sm:py-24"
    >
      <div className={FRAME}>
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <Sticker className="-rotate-2 self-start bg-white">
              {featured.length} {featured.length === 1 ? "run" : "runs"} ready
              to open
            </Sticker>
            <h2
              id="d05-shows"
              className={`${styles.display} text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[0.95] font-extrabold tracking-[-0.035em]`}
            >
              Shows Echo has run
            </h2>
          </div>
          <p className="max-w-[44ch] text-lg leading-snug">
            Finished runs, saved. Open one to see every guest Echo found, why
            they fit, and who they bring.
          </p>
        </div>
        <ul className={`grid gap-8 ${GRID[Math.min(featured.length, 4)]}`}>
          {featured.map((item) => (
            <ShowCard key={item.analysis_id} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ShowCard({ item }: { item: Featured }) {
  const { show, analysis_id } = item;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(analysis_id, controller.signal)
      .then(setAnalysis)
      .catch(() => {
        if (!controller.signal.aborted) setMissing(true);
      });
    return () => controller.abort();
  }, [analysis_id]);

  const loading = analysis === null && !missing;
  const guests = analysis?.status === "done" ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const top = guests.slice(0, 3);

  return (
    <li className="@container">
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className={`${styles.lift} group block h-full border-3 border-(--nb-ink) bg-white`}
      >
        <div className="grid h-full @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col">
            <Skyline guests={guests} loading={loading} />
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <Cover show={show} size={68} />
                <div className="min-w-0">
                  <h3
                    className={`${styles.display} text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] break-words sm:text-[2rem]`}
                  >
                    {show.title}
                  </h3>
                  {show.description && (
                    <p className="mt-2 line-clamp-2 leading-snug text-(--nb-soft)">
                      {show.description}
                    </p>
                  )}
                </div>
              </div>
              {guests.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <span className="flex items-baseline gap-2">
                    <span
                      className={`${styles.display} text-5xl leading-none font-extrabold tracking-[-0.04em]`}
                    >
                      {guests.length}
                    </span>
                    <span
                      className={`${styles.mono} text-xs font-bold tracking-[0.06em] uppercase`}
                    >
                      guests
                    </span>
                  </span>
                  <SweetBadge count={sweet} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5 border-t-3 border-(--nb-ink) p-5 sm:p-6 @3xl:border-t-0 @3xl:border-l-3">
            <p
              className={`${styles.mono} text-xs font-bold tracking-[0.08em] uppercase`}
            >
              Top guests by Echo score
            </p>
            {loading ? (
              <TopSkeleton />
            ) : top.length > 0 ? (
              <ol className="flex flex-col gap-5">
                {top.map((guest, index) => (
                  <TopGuest key={guest.ref} guest={guest} rank={index + 1} />
                ))}
              </ol>
            ) : (
              <p className="text-(--nb-soft)">
                {analysis?.status === "running"
                  ? "This run is still going. Open it to follow along."
                  : "Open the run to see its guests."}
              </p>
            )}
            <span
              className={`${styles.display} mt-auto inline-flex items-center gap-2 self-start border-3 border-(--nb-ink) bg-(--nb-yellow) px-4 py-2 text-lg font-extrabold shadow-[4px_4px_0_0_var(--nb-ink)]`}
            >
              {guests.length > 0
                ? `See all ${guests.length} guests`
                : "Open the run"}
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function SweetBadge({ count }: { count: number }) {
  if (count === 0)
    return <Sticker className="bg-white">No sweet spot this run</Sticker>;
  return (
    <span className="flex items-center gap-1">
      <Stamp
        lines={[String(count)]}
        sizes={[44]}
        className="size-16 -rotate-12"
      />
      <span
        className={`${styles.display} text-lg leading-[1.05] font-extrabold`}
      >
        sweet
        <br />
        {count === 1 ? "spot" : "spots"}
      </span>
    </span>
  );
}

function Skyline({ guests, loading }: { guests: Guest[]; loading: boolean }) {
  const best = Math.max(0.0001, ...guests.map((guest) => guest.scores.echo));
  return (
    <div
      aria-hidden
      className="relative flex h-40 flex-col border-b-3 border-(--nb-ink) bg-(--nb-ink) px-4 pt-3 sm:px-5 @3xl:h-auto @3xl:min-h-48 @3xl:flex-1"
    >
      <div
        className={`${styles.mono} flex items-center justify-between gap-3 text-[0.65rem] font-bold tracking-[0.08em] text-(--nb-paper) uppercase`}
      >
        <span>Each bar is a guest</span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5" style={{ background: YELLOW }} />
          Sweet spot
        </span>
      </div>
      <div className="relative mt-3 flex-1">
        <div className="absolute inset-0 flex items-end gap-1">
          {loading
            ? Array.from({ length: 12 }, (_, index) => (
                <span
                  key={index}
                  className={`h-1/2 flex-1 ${styles.loadingDark}`}
                />
              ))
            : guests.map((guest) => (
                <span
                  key={guest.ref}
                  className="flex-1"
                  style={{
                    height: `${(guest.scores.echo / best) * 100}%`,
                    background:
                      guest.label === "sweet_spot" ? YELLOW : "#fff6e6",
                  }}
                />
              ))}
        </div>
      </div>
    </div>
  );
}

function TopGuest({ guest, rank }: { guest: Guest; rank: number }) {
  const { fit, love_back, reach } = guest.scores;
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3">
      <span
        className={`${styles.mono} grid size-9 place-items-center border-3 border-(--nb-ink) font-bold ${guest.label === "sweet_spot" ? "bg-(--nb-yellow)" : "bg-white"}`}
      >
        {rank}
      </span>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`${styles.display} truncate text-xl leading-tight font-extrabold`}
            >
              {guest.name}
            </p>
            {guest.description && (
              <p className="truncate text-sm text-(--nb-soft)">
                {guest.description}
              </p>
            )}
          </div>
          <LabelSticker label={guest.label} />
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <ScoreBar name="Fit" value={fit} color={SKY} />
          <ScoreBar name="Love back" value={love_back} color={PINK} />
          <ScoreBar name="Reach" value={reach} color={LIME} />
        </div>
      </div>
    </li>
  );
}

function TopSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3"
        >
          <span
            className={`size-9 border-3 border-(--nb-ink) ${styles.loading}`}
          />
          <span className="flex flex-col gap-2">
            <span
              className={`h-5 w-2/3 border-2 border-(--nb-ink) ${styles.loading}`}
            />
            <span
              className={`h-14 border-2 border-(--nb-ink) ${styles.loading}`}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
