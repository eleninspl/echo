"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";
import { LABELS, score } from "@/lib/format";

import { Cover } from "./cover";
import { styles } from "./styles";
import { Kicker } from "./kicker";
import { Stamp } from "./stamp";
import { FRAME } from "./tokens";

type Loaded = { state: "loading" } | { state: "ready"; analysis: Analysis } | { state: "missing" };

const TAB_PLACES = ["4%", "38%", "68%"];

export function OnFile() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const count = featured.length;
  return (
    <section id="on-file" aria-labelledby="d06-on-file" className={`${FRAME} mt-24 scroll-mt-6 sm:mt-32`}>
      <div className="grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-12">
        <div className="lg:sticky lg:top-10 lg:col-span-4 lg:self-start lg:pt-10">
          <Kicker>Shows Echo has run</Kicker>
          <h2
            id="d06-on-file"
            className={`${styles.serif} mt-3 text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.015em]`}
          >
            On file
          </h2>
          <p className="mt-4 max-w-[40ch] text-[1.125rem] leading-relaxed text-(--d-ink-soft)">
            Finished runs, ready to open. Each folder holds every guest Echo found for the show, with their three
            scores and the reasons behind them.
          </p>
          <p className={`${styles.typed} mt-5 text-[0.85rem] font-bold tracking-[0.06em] text-(--d-ink-faint) uppercase`}>
            {count} {count === 1 ? "folder" : "folders"} in the drawer
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:col-span-8 sm:[&>li:last-child:nth-child(odd)]:col-span-2">
          {featured.map((item, index) => (
            <Folder key={item.analysis_id} item={item} index={index} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function useAnalysis(id: string): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(id, controller.signal)
      .then((analysis) => setLoaded({ state: "ready", analysis }))
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ state: "missing" });
      });
    return () => controller.abort();
  }, [id]);
  return loaded;
}

function Folder({ item, index }: { item: Featured; index: number }) {
  const { show, analysis_id } = item;
  const loaded = useAnalysis(analysis_id);
  const analysis = loaded.state === "ready" ? loaded.analysis : null;
  const guests = analysis?.status === "done" ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const letter = show.title.trim().charAt(0).toUpperCase();

  return (
    <li className="@container">
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className={`${styles.folder} group relative block rounded-[10px] pt-[62px]`}
      >
        <span aria-hidden className={`${styles.folderBack} absolute inset-x-0 top-[30px] bottom-0 rounded-[10px]`} />
        <span
          aria-hidden
          className={`${styles.folderBack} absolute top-0 flex h-[40px] w-[28%] min-w-[92px] items-start justify-center rounded-t-[10px] pt-[7px]`}
          style={{ left: TAB_PLACES[index % TAB_PLACES.length] }}
        >
          <span
            className={`${styles.typed} rounded-[2px] bg-(--d-card) px-3 py-[1px] text-[1rem] font-bold tracking-[0.08em] shadow-[0_0_0_1px_rgb(90_70_40/0.15)]`}
          >
            {letter}
          </span>
        </span>
        <span
          aria-hidden
          className={`${styles.sheet} ${styles.card} absolute inset-x-5 top-[44px] h-24 rounded-t-[3px]`}
        />
        <span className={`${styles.folderFront} relative flex flex-col gap-6 rounded-[8px] p-5 sm:p-6`}>
          <span className="flex flex-col gap-6 @xl:flex-row @xl:items-start @xl:gap-8">
            <span className="flex min-w-0 flex-1 flex-col gap-5">
              <span className="flex items-start gap-4">
                <Cover show={show} size={76} />
                <span className="min-w-0">
                  <span
                    className={`${styles.serif} block text-[1.75rem] leading-[1.08] font-semibold tracking-[-0.01em] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4`}
                  >
                    {show.title}
                  </span>
                  {show.description && (
                    <span className="mt-1.5 line-clamp-2 block text-[0.98rem] leading-snug text-(--d-ink-soft)">
                      {show.description}
                    </span>
                  )}
                </span>
              </span>
              <Summary loaded={loaded} guests={guests} sweet={sweet} index={index} />
            </span>
            {guests.length > 0 && <Slip guests={guests.slice(0, 3)} />}
          </span>
          <span
            className={`${styles.typed} flex items-center justify-between border-t border-dashed border-(--d-ink)/25 pt-4 text-[0.9rem] font-bold tracking-[0.06em] uppercase`}
          >
            <span>Open the file</span>
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function Summary({ loaded, guests, sweet, index }: { loaded: Loaded; guests: Guest[]; sweet: number; index: number }) {
  if (loaded.state === "loading") {
    return (
      <span className={`${styles.typed} ${styles.ghost} text-[0.9rem] text-(--d-ink-soft)`}>Pulling the file…</span>
    );
  }
  if (loaded.state === "missing") return null;
  if (loaded.analysis.status === "running") {
    return <span className={`${styles.typed} text-[0.9rem] text-(--d-ink-soft)`}>Still running.</span>;
  }
  if (loaded.analysis.status === "failed" || !guests.length) {
    return <span className={`${styles.typed} text-[0.9rem] text-(--d-ink-soft)`}>No guests on this run.</span>;
  }
  return (
    <span className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <span className="flex min-w-0 flex-col gap-2.5">
        <span className={`${styles.typed} text-[0.95rem] text-(--d-ink)`}>
          <strong className="text-[1.6rem] leading-none font-bold">{guests.length}</strong>{" "}
          {guests.length === 1 ? "guest" : "guests"} on file
        </span>
        <Tally guests={guests} />
      </span>
      {sweet > 0 ? (
        <Stamp angle={-7} thunk order={index} className="text-[1.2rem]">
          {sweet} {sweet === 1 ? "sweet spot" : "sweet spots"}
        </Stamp>
      ) : (
        <span className={`${styles.typed} text-[0.85rem] text-(--d-ink-soft)`}>No sweet spot this run</span>
      )}
    </span>
  );
}

function Tally({ guests }: { guests: Guest[] }) {
  return (
    <span aria-hidden className="flex max-w-[16rem] flex-wrap gap-[4px]">
      {guests.map((guest) =>
        guest.label === "sweet_spot" ? (
          <span key={guest.ref} className="size-[11px] rounded-[1.5px] bg-(--d-red)" />
        ) : (
          <span key={guest.ref} className="size-[11px] rounded-[1.5px] border-[1.5px] border-(--d-ink)/45" />
        ),
      )}
    </span>
  );
}

function Slip({ guests }: { guests: Guest[] }) {
  return (
    <span
      className={`${styles.card} ${styles.typed} block w-full rotate-[0.6deg] rounded-[3px] px-4 pt-3 pb-2 @xl:w-[54%] @xl:shrink-0`}
    >
      <span className="grid grid-cols-[minmax(0,1fr)_2.6rem_3.6rem_3rem] items-end gap-x-2 border-b border-(--d-red)/50 pb-2 text-[0.68rem] font-bold tracking-[0.06em] text-(--d-ink-soft) uppercase">
        <span>Top guests</span>
        <span className="text-right">Fit</span>
        <span className="text-right leading-tight">Love back</span>
        <span className="text-right">Reach</span>
      </span>
      {guests.map((guest) => (
        <span
          key={guest.ref}
          className="grid grid-cols-[minmax(0,1fr)_2.6rem_3.6rem_3rem] items-center gap-x-2 border-b border-dotted border-(--d-ink-faint)/50 py-2 last:border-b-0"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[0.95rem] font-bold">{guest.name}</span>
            <span
              className={`text-[0.72rem] tracking-[0.05em] uppercase ${guest.label === "sweet_spot" ? "font-bold text-(--d-red)" : "text-(--d-ink-soft)"}`}
            >
              {LABELS[guest.label].name}
            </span>
          </span>
          <span className="text-right text-[1rem] tabular-nums">{score(guest.scores.fit)}</span>
          <span className="text-right text-[1rem] tabular-nums">{score(guest.scores.love_back)}</span>
          <span className="text-right text-[1rem] tabular-nums">
            {guest.scores.reach === null ? "–" : score(guest.scores.reach)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function FallbackFiles() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-6 border-t border-dashed border-(--d-ink-faint)/40 pt-5">
      <p className={`${styles.typed} text-[0.8rem] font-bold tracking-[0.08em] text-(--d-ink-soft) uppercase`}>
        Or open a show Echo has run
      </p>
      <ul className="mt-3 flex flex-wrap gap-3">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className={`${styles.folderFront} flex items-center gap-3 rounded-[6px] py-2 pr-4 pl-2 hover:underline`}
            >
              <Cover show={show} size={36} clipped={false} />
              <span className={`${styles.serif} text-[1.1rem] font-semibold`}>{show.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
