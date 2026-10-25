"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest, type Label } from "@/lib/echo";

import { Cover } from "./cover";
import { ECHO_RINGS, Rings, Strip, type Half } from "./edges";
import { styles } from "./styles";
import { grain, INK, TONE, Voiceprint, type Part } from "./wave";

const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

const MUTED = "#55405b";
const out100 = (value: number) => String(Math.round(value * 100));

const LAYOUT: Record<number, string> = {
  1: "",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-2 xl:grid-cols-3",
  4: "lg:grid-cols-2",
};

export function RunShows() {
  const featured = useFeatured();
  const ready = Boolean(featured?.length);

  return (
    <section
      id="shows"
      aria-labelledby={ready ? "v9f-shows" : undefined}
      className="relative isolate scroll-mt-4 overflow-hidden"
    >
      <Rings half="bottom" surface="dark" {...ECHO_RINGS} />
      <Strip half="top" surface="dark" />
      {featured && ready ? (
        <div className="mx-auto w-full max-w-[1280px] px-4 pt-28 pb-[calc(clamp(120px,14vw,200px)/2+96px)] sm:px-8 lg:pt-36">
          <div className="mb-12 flex flex-col gap-5 lg:mb-16">
            <h2
              id="v9f-shows"
              className={`${styles.poster} max-w-[11ch] text-[clamp(3.4rem,9vw,8.5rem)] leading-[0.84] uppercase`}
            >
              Shows Echo <span className="text-(--v9f-fit)">has run</span>
            </h2>
            <div className="flex flex-col items-start gap-5">
              <p className="max-w-[44ch] text-xl leading-snug text-(--v9f-soft) sm:text-2xl">
                Open one to see every guest Echo found for it, ranked, with what drives each score.
              </p>
              <span
                className={`${styles.wide} w-fit shrink-0 rounded-full bg-(--v9f-ink) px-4 py-2 text-xs font-semibold tracking-[0.12em] text-(--v9f-black) uppercase`}
              >
                {featured.length} ready to open
              </span>
            </div>
          </div>
          <ul className={`grid grid-cols-1 gap-6 ${LAYOUT[Math.min(featured.length, 4)]}`}>
            {featured.map((item, index) => (
              <ShowCard key={item.analysis_id} item={item} wide={featured.length === 1} index={index} />
            ))}
          </ul>
        </div>
      ) : (
        <div aria-hidden className="h-[clamp(240px,30vw,420px)]" />
      )}
    </section>
  );
}

export function LatestRun() {
  const featured = useFeatured();
  const first = featured?.[0];
  return first ? <LatestRunLink item={first} /> : null;
}

function LatestRunLink({ item }: { item: Featured }) {
  const analysis = useAnalysis(item.analysis_id);
  if (analysis?.status !== "done") return null;
  const sweet = analysis.guests.filter((guest) => guest.label === "sweet_spot").length;
  return (
    <div className={`${styles.rise} flex max-w-full flex-col items-start gap-2`}>
      <span className={`${styles.wide} text-[0.7rem] font-semibold tracking-[0.14em] uppercase`}>Latest run</span>
      <Link
        href={`/analyses/${encodeURIComponent(item.analysis_id)}`}
        className="group flex max-w-full items-center gap-3 rounded-[24px] border-2 border-(--v9f-black) py-1.5 pr-1.5 pl-4 text-base leading-snug font-semibold transition-colors hover:bg-(--v9f-black) hover:text-(--v9f-ink)"
      >
        <span className="min-w-0">
          <span className="font-bold">{item.show.title}</span>: {sweet} {sweet === 1 ? "sweet spot" : "sweet spots"} in{" "}
          {analysis.guests.length} guests
        </span>
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--v9f-black) text-(--v9f-ink) transition-transform group-hover:translate-x-0.5"
        >
          <svg viewBox="0 0 20 20" className="size-3.5" focusable="false">
            <path
              d="M4 10h11m-4-4 4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Link>
    </div>
  );
}

function useAnalysis(id: string) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(id, controller.signal)
      .then(setAnalysis)
      .catch(() => {});
    return () => controller.abort();
  }, [id]);
  return analysis;
}

function ShowCard({ item, wide, index }: { item: Featured; wide: boolean; index: number }) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const top = guests.slice(0, wide ? 6 : 3);
  const wave = wide ? "clamp(120px, 13vw, 176px)" : "clamp(112px, 11vw, 140px)";

  return (
    <li className={`${styles.rise} min-w-0`} style={{ "--order": index } as CSSProperties}>
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className="group flex h-full flex-col overflow-hidden rounded-[36px] ring-2 ring-transparent transition-shadow hover:ring-(--v9f-ink)"
      >
        <div
          className={`${styles.field} overflow-hidden px-5 pt-6 sm:px-9 sm:pt-9`}
          style={{ paddingBottom: `calc(${wave} / 2 + 44px)` }}
        >
          <GuestWave guests={guests} half="top" height={wave} />
          <div className={`grid grid-cols-1 gap-8 ${wide ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end" : ""}`}>
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex items-center gap-3">
                <Cover show={show} size={wide ? 64 : 52} onField />
                <span className={`${styles.wide} text-xs font-semibold tracking-[0.14em] uppercase`}>Echo ran</span>
              </div>
              <h3
                className={`${styles.poster} leading-[0.86] uppercase ${
                  wide ? "text-[clamp(3.2rem,8vw,7.5rem)]" : "text-[clamp(2.8rem,5vw,4.6rem)]"
                }`}
              >
                {show.title}
              </h3>
              {show.description && (
                <p className="line-clamp-2 max-w-[40ch] text-lg leading-snug font-semibold">{show.description}</p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-6">
              <Stat term="Guests scored" value={done ? guests.length : null} wide={wide} />
              <Stat term={sweet === 1 ? "Sweet spot" : "Sweet spots"} value={done ? sweet : null} wide={wide} />
            </dl>
          </div>
        </div>

        <div
          className="relative isolate flex flex-1 flex-col gap-7 overflow-hidden bg-(--v9f-plum) px-5 pb-7 sm:px-9 sm:pb-9"
          style={{ paddingTop: `calc(${wave} / 2 + 22px)` }}
        >
          <GuestWave guests={guests} half="bottom" height={wave} />
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-(--v9f-soft)">
            <span className="text-(--v9f-ink)">Every guest, best first:</span>
            <Key color={TONE.fit}>Fit</Key>
            <Key color={TONE.love}>Love back</Key>
            <Key color={TONE.reach}>Reach</Key>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-full bg-(--v9f-black) ring-2 ring-(--v9f-ink)" />
              Sweet spot, dotted
            </span>
          </p>

          <div className="flex flex-col gap-3">
            <h4 className={`${styles.wide} text-xs font-semibold tracking-[0.14em] text-(--v9f-soft) uppercase`}>
              Top of the lineup
            </h4>
            <Lineup guests={top} wide={wide} />
          </div>

          <OpenLine />
        </div>
      </Link>
    </li>
  );
}

function GuestWave({ guests, half, height }: { guests: Guest[]; half: Half; height: string }) {
  const onField = half === "top";
  return (
    <div
      aria-hidden
      className={`absolute inset-x-5 z-[-1] flex items-center gap-[0.6%] sm:inset-x-9 ${half === "top" ? styles.edgeTop : styles.edgeBottom}`}
      style={{ height }}
    >
      {guests.length
        ? guests.map((guest) => {
            const sweet = guest.label === "sweet_spot";
            const parts: [Part, number | null][] = [
              ["fit", guest.scores.fit],
              ["love", guest.scores.love_back],
              ["reach", guest.scores.reach],
            ];
            return (
              <span
                key={guest.ref}
                className="relative flex h-full flex-1 items-center justify-center gap-[9%]"
                style={{ opacity: sweet ? 1 : onField ? 0.26 : 0.42 }}
              >
                {parts.map(([part, score]) => (
                  <span
                    key={part}
                    className="block w-[24%] rounded-full"
                    style={{
                      height: score === null ? "6%" : `${Math.max(6, Math.round(score * 100))}%`,
                      background: onField ? INK : score === null ? MUTED : TONE[part],
                    }}
                  />
                ))}
                {sweet && onField && (
                  <span className="absolute -top-5 size-2.5 rounded-full bg-(--v9f-black) ring-2 ring-(--v9f-ink)" />
                )}
              </span>
            );
          })
        : Array.from({ length: 14 }, (_, column) => (
            <span key={column} className="flex h-full flex-1 items-center justify-center gap-[9%]">
              {[0, 1, 2].map((bar) => (
                <span
                  key={bar}
                  className={`${styles.waiting} block w-[24%] rounded-full`}
                  style={{
                    height: `${Math.round((0.25 + 0.5 * grain(column * 3 + bar)) * 100)}%`,
                    background: onField ? INK : MUTED,
                  }}
                />
              ))}
            </span>
          ))}
    </div>
  );
}

function OpenLine() {
  return (
    <span
      className={`${styles.gradientFill} ${styles.poster} mt-auto inline-flex min-h-14 items-center gap-3 self-start rounded-full pr-3 pl-6 text-2xl text-(--v9f-black) uppercase transition-[filter] group-hover:brightness-110`}
    >
      Open the analysis
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-(--v9f-black) text-(--v9f-ink) transition-transform group-hover:translate-x-1"
      >
        <svg viewBox="0 0 20 20" className="size-4" focusable="false">
          <path
            d="M4 10h11m-4-4 4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

function Stat({ term, value, wide }: { term: string; value: number | null; wide: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-t-2 border-(--v9f-black) pt-3">
      <dt className={`${styles.wide} text-[0.7rem] font-semibold tracking-[0.14em] uppercase`}>{term}</dt>
      <dd
        className={`${styles.poster} leading-[0.8] ${wide ? "text-[clamp(5rem,10vw,9.5rem)]" : "text-[clamp(4.2rem,7vw,6.5rem)]"} ${
          value === null ? styles.waiting : ""
        }`}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

function Key({ color, children }: { color: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="h-3.5 w-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function Lineup({ guests, wide }: { guests: Guest[]; wide: boolean }) {
  const grid = wide ? "grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-x-4" : "flex flex-col gap-2";
  if (!guests.length) {
    return (
      <ol aria-hidden className={grid}>
        {Array.from({ length: wide ? 6 : 3 }, (_, index) => (
          <li key={index} className={`${styles.waiting} h-[104px] rounded-3xl bg-(--v9f-plum-hi)`} />
        ))}
      </ol>
    );
  }
  return (
    <ol className={grid}>
      {guests.map((guest, index) => (
        <GuestRow key={guest.ref} guest={guest} rank={index + 1} />
      ))}
    </ol>
  );
}

function GuestRow({ guest, rank }: { guest: Guest; rank: number }) {
  const { fit, love_back, reach } = guest.scores;
  const sweet = guest.label === "sweet_spot";
  return (
    <li className="flex items-center gap-3 rounded-3xl bg-(--v9f-ground) px-4 py-4 sm:gap-5 sm:px-5">
      <span
        aria-hidden
        className={`${styles.poster} w-7 shrink-0 text-right text-4xl leading-none text-(--v9f-dim) tabular-nums`}
      >
        {rank}
      </span>
      <Voiceprint
        fit={fit}
        loveBack={love_back}
        reach={reach}
        bars={24}
        width={96}
        height={48}
        className="hidden h-12 w-[96px] shrink-0 sm:block"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`${styles.poster} text-[1.7rem] leading-none uppercase`}>{guest.name}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${
              sweet ? `${styles.gradientFill} text-(--v9f-black)` : "text-(--v9f-soft) ring-1 ring-(--v9f-line)"
            }`}
          >
            {LABEL_NAME[guest.label]}
          </span>
        </span>
        {guest.description && <span className="truncate text-base text-(--v9f-soft)">{guest.description}</span>}
        <span className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
          <Score color={TONE.fit} name="Fit" value={fit} />
          <Score color={TONE.love} name="Love back" value={love_back} />
          <Score color={TONE.reach} name="Reach" value={reach} />
        </span>
      </span>
    </li>
  );
}

function Score({ color, name, value }: { color: string; name: string; value: number | null }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-sm font-bold" style={{ color }}>
        {name}
      </span>
      {value === null ? (
        <span className={`${styles.poster} text-xl leading-none text-(--v9f-dim)`}>
          <span aria-hidden>–</span>
          <span className="sr-only">not scored</span>
        </span>
      ) : (
        <span className={`${styles.poster} text-xl leading-none text-(--v9f-ink)`}>{out100(value)}</span>
      )}
    </span>
  );
}
