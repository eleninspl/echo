"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest, type Label, type Scores } from "@/lib/echo";
import { LABELS, score } from "@/lib/format";
import { LABEL_ORDER } from "@/lib/stats";

import { Cover, GuestAvatar } from "./cover";
import { styles } from "./styles";
import { GuestFace, LABEL_TONE, Sparkle, TONES, type Tone } from "./drawings";

const CARD_TONES: Tone[] = ["peach", "mint", "lilac", "rose"];

const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2",
};

export function ShowsEchoHasRun() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const wide = featured.length === 1;
  return (
    <section id="shows" aria-labelledby="shows-title" className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8 sm:py-16">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="flex flex-col gap-2">
          <p className={`${styles.hand} text-lg text-(--lilac-deep)`}>no show in mind yet?</p>
          <h2 id="shows-title" className={`${styles.display} text-[clamp(2rem,4vw,3rem)] leading-[1.02] font-extrabold tracking-[-0.02em]`}>
            Shows Echo has already run
          </h2>
        </div>
        <p className="max-w-[40ch] text-(--ink-soft) sm:text-right">
          Open one to meet the guests Echo found and see why each one fits.
        </p>
      </div>
      <ul className={`grid gap-5 ${GRID[Math.min(featured.length, 4)]}`}>
        {featured.map((item, index) => (
          <ShowCard key={item.analysis_id} item={item} tone={CARD_TONES[index % CARD_TONES.length]} wide={wide} order={index} />
        ))}
      </ul>
    </section>
  );
}

function useAnalysis(id: string) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(id, controller.signal)
      .then(setAnalysis)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [id]);
  return { analysis, failed };
}

function ShowCard({ item, tone, wide, order }: { item: Featured; tone: Tone; wide: boolean; order: number }) {
  const { show, analysis_id } = item;
  const { analysis, failed } = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const colors = TONES[tone];
  const loading = !analysis && !failed;

  return (
    <li className={styles.arrive} style={{ "--order": order } as CSSProperties}>
      <Link
        href={`/analyses/${encodeURIComponent(analysis_id)}`}
        className={`${styles.lift} group grid h-full overflow-hidden rounded-[32px] border border-(--line) bg-(--paper) shadow-[0_24px_50px_-34px_rgb(80_50_20/0.55)] hover:shadow-[0_30px_60px_-30px_rgb(80_50_20/0.6)] ${
          wide ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]" : "grid-rows-[auto_1fr]"
        }`}
      >
        <div className={`relative flex flex-col gap-5 p-6 sm:p-7 ${wide ? "lg:p-9" : ""}`} style={{ background: colors.tint }}>
          <span aria-hidden className={`${styles.dots} pointer-events-none absolute inset-0 opacity-60`} />
          <div className={`relative flex gap-5 ${wide ? "flex-row items-center lg:flex-col lg:items-start" : "flex-row items-center"}`}>
            <span className="-rotate-3 rounded-[30px] bg-(--paper) p-1.5 shadow-[0_12px_24px_-14px_rgb(80_50_20/0.6)] transition-transform group-hover:rotate-0">
              <Cover show={show} size={wide ? 128 : 84} />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className={`${styles.display} text-[1.7rem] leading-[1.05] font-extrabold tracking-[-0.01em] ${wide ? "lg:text-[2.2rem]" : ""}`}>
                {show.title}
              </h3>
              {show.description && <p className="leading-snug text-(--ink-soft)">{show.description}</p>}
            </div>
          </div>
          {done && (
            <div className="relative flex flex-wrap gap-2">
              <Chip>
                <strong className="font-extrabold">{guests.length}</strong> {guests.length === 1 ? "guest" : "guests"} found
              </Chip>
              <Chip tone="butter">
                <Sparkle className="size-4" fill={TONES.butter.base} />
                <strong className="font-extrabold">{sweet}</strong> {sweet === 1 ? "sweet spot" : "sweet spots"}
              </Chip>
            </div>
          )}
          {done && analysis.left_out.length > 0 && <LeftOut leftOut={analysis.left_out} />}
          {wide && <OpenLine done={done} count={guests.length} className="relative mt-auto hidden lg:flex" />}
        </div>

        <div className={`flex flex-col gap-5 p-6 sm:p-7 ${wide ? "lg:p-9" : ""}`}>
          {loading && <LoadingGuests />}
          {failed && <p className="text-(--ink-soft)">Echo couldn&apos;t load this one&apos;s guests right now. Open it to try again.</p>}
          {analysis && !done && (
            <p className="text-(--ink-soft)">
              {analysis.status === "running" ? "Echo is still working on this show." : "This run didn't finish."} Open
              it to see where it got to.
            </p>
          )}
          {done && guests.length > 0 && (
            <>
              <Crowd guests={guests} />
              <TopGuests guests={guests.slice(0, wide ? 3 : 2)} wide={wide} />
            </>
          )}
          <OpenLine done={done} count={guests.length} className={`mt-auto ${wide ? "flex lg:hidden" : "flex"}`} />
        </div>
      </Link>
    </li>
  );
}

function LeftOut({ leftOut }: { leftOut: Analysis["left_out"] }) {
  const hosts = leftOut.filter((person) => person.why === "host").length;
  const past = leftOut.length - hosts;
  const parts = [
    hosts > 0 ? `${hosts === 1 ? "the host" : `${hosts} hosts`}` : null,
    past > 0 ? `${past} past ${past === 1 ? "guest" : "guests"}` : null,
  ].filter(Boolean);
  return (
    <p className="relative flex items-start gap-2.5 text-[0.95rem] leading-snug">
      <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0" fill="none" aria-hidden>
        <circle cx={12} cy={12} r={10} fill="#fffdf8" stroke="#2b2522" strokeWidth={2} />
        <path d="M7.5 12.5 L10.5 15.5 L16.5 9" stroke="#2b2522" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        <span className={`${styles.hand} font-semibold`}>Already left out:</span> {parts.join(" and ")}.
      </span>
    </p>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-(--ink) px-3 py-1 text-sm font-semibold"
      style={{ background: tone ? TONES[tone].tint : "var(--paper)" }}
    >
      {children}
    </span>
  );
}

function OpenLine({ done, count, className = "" }: { done: boolean; count: number; className?: string }) {
  return (
    <span className={`items-center gap-2 font-bold ${className}`}>
      <span className="underline decoration-(--ink)/25 decoration-2 underline-offset-[6px] group-hover:decoration-(--ink)">
        {done && count > 0 ? `Meet all ${count} guests` : "Open the show"}
      </span>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-(--ink) text-(--cream) transition-transform group-hover:translate-x-1"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none">
          <path d="M4 10 H15 M10.5 5 L15.5 10 L10.5 15" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

function LoadingGuests() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading guests">
      <div className={`${styles.pulse} flex flex-wrap gap-1.5`}>
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className="size-[30px] rounded-full bg-(--sand)" />
        ))}
      </div>
      <p className="text-sm text-(--ink-soft)">Loading the guests…</p>
    </div>
  );
}

function plural(label: Label, count: number) {
  const name = LABELS[label].name.toLowerCase();
  if (count === 1 || label === "safe" || label === "far" || label === "balanced") return name;
  return `${name}s`;
}

function Crowd({ guests }: { guests: Guest[] }) {
  const counts = LABEL_ORDER.map((label) => ({ label, count: guests.filter((guest) => guest.label === label).length })).filter(
    ({ count }) => count > 0,
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold tracking-[0.12em] text-(--ink-soft) uppercase">Everyone Echo found</p>
      <div className="flex flex-wrap gap-1.5">
        {guests.map((guest) => (
          <GuestFace key={guest.ref} label={guest.label} size={30} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {counts.map(({ label, count }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-full shadow-[inset_0_0_0_1.5px_var(--ink)]"
              style={{ background: TONES[LABEL_TONE[label]].base }}
            />
            <span>
              <strong className="font-bold">{count}</strong> {plural(label, count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopGuests({ guests, wide }: { guests: Guest[]; wide: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-bold tracking-[0.12em] text-(--ink-soft) uppercase">Top of the list</p>
      <ol className="flex flex-col">
        {guests.map((guest, index) => (
          <li
            key={guest.ref}
            className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2.5 border-b border-dashed border-(--line) py-3.5 last:border-b-0 ${
              wide ? "md:grid-cols-[auto_minmax(0,1fr)_15rem]" : ""
            }`}
          >
            <span className="relative">
              <GuestAvatar guest={guest} size={44} />
              <span
                aria-hidden
                className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full border-2 border-(--paper) bg-(--ink) text-[0.65rem] font-bold text-(--cream)"
              >
                {index + 1}
              </span>
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`${styles.display} text-lg leading-tight font-bold`}>{guest.name}</span>
                <LabelChip label={guest.label} />
              </span>
              {guest.description && <span className="mt-0.5 block truncate text-sm text-(--ink-soft)">{guest.description}</span>}
            </span>
            <ScoreBars scores={guest.scores} className={`col-span-2 ${wide ? "md:col-span-1" : ""}`} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function LabelChip({ label }: { label: Label }) {
  const tone = TONES[LABEL_TONE[label]];
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: tone.tint, color: tone.deep }}>
      {LABELS[label].name}
    </span>
  );
}

const BARS: { key: keyof Omit<Scores, "echo">; name: string; tone: Tone }[] = [
  { key: "fit", name: "Fit", tone: "peach" },
  { key: "love_back", name: "Love back", tone: "rose" },
  { key: "reach", name: "Reach", tone: "mint" },
];

function ScoreBars({ scores, className = "" }: { scores: Scores; className?: string }) {
  return (
    <dl className={`grid grid-cols-[4.6rem_minmax(0,1fr)_2rem] items-center gap-x-2.5 gap-y-1 text-sm ${className}`}>
      {BARS.map(({ key, name, tone }) => {
        const value = scores[key];
        return (
          <div key={key} className="contents">
            <dt className="text-(--ink-soft)">{name}</dt>
            <dd className="h-2.5 overflow-hidden rounded-full" style={{ background: TONES[tone].tint }}>
              {value !== null && (
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(value * 100, 4)}%`, background: TONES[tone].deep }}
                />
              )}
            </dd>
            <dd className="text-right font-bold tabular-nums">
              {value === null ? <span title="Too little data to score reach">–</span> : score(value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
