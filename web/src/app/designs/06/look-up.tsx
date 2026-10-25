"use client";

import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";
import { styles } from "./styles";
import { FallbackFiles } from "./on-file";
import { Stamp } from "./stamp";
import { FRAME, INK, RED } from "./tokens";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

const TILTS = ["-0.6deg", "0.45deg", "-0.3deg", "0.55deg", "-0.45deg"];

const DIVIDERS = [
  { letters: "A–F", top: 30, left: "6%", paper: "#dcc18c" },
  { letters: "G–L", top: 50, left: "36%", paper: "#e6d2a8" },
  { letters: "M–Z", top: 70, left: "66%", paper: "#efe2c4" },
];

export function LookUp({ intro }: { intro: ReactNode }) {
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const inFlight = useRef<AbortController | null>(null);
  const { start, pending, error: startError } = useStart();

  async function find(text: string) {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setSearch({ state: "searching", query: text });
    try {
      const { shows } = await echo.shows(text, controller.signal);
      setSearch({ state: "found", query: text, shows });
    } catch (error) {
      if (!controller.signal.aborted) setSearch({ state: "failed", query: text, problem: describe(error) });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 2) {
      setHint("Type at least two letters of the show's name.");
      return;
    }
    setHint(null);
    find(text);
  }

  const searching = search.state === "searching";

  return (
    <section id="look-up" aria-label="Look up your show" className={`${FRAME} scroll-mt-6`}>
      <div className="grid grid-cols-1 items-center gap-x-16 gap-y-10 pt-8 sm:pt-14 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-6">{intro}</div>
        <div className="lg:col-span-6">
          <div className="relative mx-auto w-full max-w-[580px] pt-[92px]">
            <div aria-hidden className="absolute inset-x-3 top-0 bottom-12 sm:inset-x-5">
              {DIVIDERS.map((divider) => (
                <span
                  key={divider.letters}
                  className="absolute inset-x-0 bottom-0 rounded-t-[7px] shadow-[0_-1px_0_rgb(90_70_40/0.12),0_-6px_12px_-10px_rgb(60_40_20/0.5)]"
                  style={{ top: divider.top, background: divider.paper }}
                >
                  <span
                    className={`${styles.typed} absolute -top-[25px] flex h-[28px] w-[30%] max-w-[104px] min-w-[68px] items-center justify-center rounded-t-[7px] text-[0.78rem] font-bold tracking-[0.06em] text-(--d-ink-soft) shadow-[0_-1px_0_rgb(90_70_40/0.12)]`}
                    style={{ left: divider.left, background: divider.paper }}
                  >
                    {divider.letters}
                  </span>
                </span>
              ))}
            </div>

            <form
              role="search"
              noValidate
              onSubmit={submit}
              className={`${styles.card} ${styles.ruled} ${styles.lift} relative z-10 mx-3 rounded-[6px] px-5 pt-[9px] pb-[84px] sm:mx-5 sm:px-8`}
            >
              <div className="flex h-[44px] items-center justify-between gap-3">
                <label
                  htmlFor="d06-show"
                  className={`${styles.typed} text-[0.95rem] font-bold tracking-[0.08em] uppercase`}
                >
                  Look up a show
                </label>
              </div>
              <div className="mt-[26px] flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                <input
                  id="d06-show"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  maxLength={100}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Your podcast's name"
                  aria-invalid={hint !== null}
                  aria-describedby={hint ? "d06-hint" : "d06-help"}
                  className={`${styles.typed} ${styles.field} h-[52px] min-w-0 flex-1 rounded-none rounded-t-[3px] border-0 border-b-2 border-(--d-ink) bg-transparent px-2 pt-2 text-[1.25rem] text-(--d-ink) placeholder:text-(--d-ink-faint)/80`}
                />
                <button
                  type="submit"
                  disabled={searching}
                  className={`${styles.typed} inline-flex h-[52px] shrink-0 items-center justify-center rounded-[4px] bg-(--d-red) px-7 text-[1rem] font-bold tracking-[0.1em] text-(--d-card) uppercase shadow-[0_3px_0_var(--d-red-deep)] transition-[transform,box-shadow,background-color] hover:bg-(--d-red-deep) active:translate-y-[3px] active:shadow-none disabled:cursor-wait disabled:opacity-80`}
                >
                  {searching ? "Looking…" : "Find it"}
                </button>
              </div>
              <p className={`${styles.typed} mt-3 min-h-[1.5rem] text-[0.85rem]`}>
                {hint ? (
                  <span id="d06-hint" className="font-bold text-(--d-red)">
                    {hint}
                  </span>
                ) : (
                  <span id="d06-help" className="text-(--d-ink-soft)">
                    Press Enter to look it up in Qloo.
                  </span>
                )}
              </p>
            </form>

            <div
              aria-hidden
              className={`${styles.tray} relative z-20 -mt-[58px] flex h-[104px] items-center justify-center gap-3 rounded-[5px_5px_14px_14px]`}
            >
              <span className={`${styles.rivet} size-[7px] rounded-full`} />
              <span
                className={`${styles.holder} ${styles.typed} rounded-[3px] px-5 py-[6px] text-[0.78rem] font-bold tracking-[0.1em] text-(--d-ink) uppercase`}
              >
                Podcasts · A to Z
              </span>
              <span className={`${styles.rivet} size-[7px] rounded-full`} />
            </div>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "searching" && <Pulling query={search.query} />}

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="d06-results" className="mt-16 sm:mt-20">
          <div className="flex flex-col gap-2 border-b border-dashed border-(--d-ink-faint)/50 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="d06-results"
              className={`${styles.serif} text-[clamp(2rem,3.6vw,2.75rem)] leading-none font-medium tracking-[-0.01em]`}
            >
              Which one is yours?
            </h2>
            <p className={`${styles.typed} text-[0.9rem] text-(--d-ink-soft)`}>
              {search.shows.length} {search.shows.length === 1 ? "card" : "cards"} pulled for &ldquo;{search.query}
              &rdquo;
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {search.shows.map((show, index) => (
              <ResultCard
                key={show.id}
                show={show}
                index={index}
                pending={pending}
                onRun={() => start(show.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {startError && <Returned problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <Returned
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <Returned problem={search.problem} onRetry={() => find(search.query)} />}
    </section>
  );
}

function ResultCard({
  show,
  index,
  pending,
  onRun,
}: {
  show: Show;
  index: number;
  pending: string | null;
  onRun: () => void;
}) {
  const opening = pending === show.id;
  return (
    <li
      className={styles.pull}
      style={{ "--order": index, "--tilt": TILTS[index % TILTS.length] } as CSSProperties}
    >
      <article className={`${styles.card} ${styles.headed} flex h-full flex-col rounded-[5px] px-5 pt-6 pb-5 [--head:118px]`}>
        <div className="flex h-[76px] items-start gap-4">
          <Cover show={show} size={76} />
          <h3
            className={`${styles.serif} line-clamp-3 min-w-0 pt-0.5 text-[1.45rem] leading-[1.1] font-semibold tracking-[-0.01em]`}
          >
            {show.title}
          </h3>
        </div>
        <p className="mt-9 line-clamp-3 text-[1.02rem] leading-relaxed text-(--d-ink-soft)">
          {show.description ?? "Qloo has no description for this show."}
        </p>
        <div className="mt-auto flex items-center justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={onRun}
            disabled={pending !== null}
            aria-label={`Run Echo on ${show.title}`}
            className={`${styles.typed} inline-flex min-h-11 items-center gap-2 rounded-[4px] border-2 border-(--d-red) px-4 text-[0.9rem] font-bold tracking-[0.08em] uppercase transition-colors disabled:cursor-wait ${
              opening
                ? "bg-(--d-red) text-(--d-card)"
                : "text-(--d-red) hover:bg-(--d-red) hover:text-(--d-card) disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-(--d-red)"
            }`}
          >
            {opening ? (
              <span className={styles.caret}>Opening</span>
            ) : (
              <>
                Run Echo <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      </article>
    </li>
  );
}

function Pulling({ query }: { query: string }) {
  return (
    <div className="mt-16 sm:mt-20" aria-hidden>
      <p className={`${styles.typed} ${styles.caret} border-b border-dashed border-(--d-ink-faint)/50 pb-4 text-[1.1rem]`}>
        Looking through Qloo for &ldquo;{query}&rdquo;
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((slot) => (
          <div
            key={slot}
            className={`${styles.card} ${styles.ruled} ${styles.ghost} h-[236px] rounded-[5px] opacity-60`}
            style={{ animationDelay: `${slot * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Returned({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div role="alert" className={`${styles.card} mt-14 max-w-3xl rounded-[6px] px-6 py-6 sm:px-8 sm:py-7`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`${styles.typed} text-[0.78rem] font-bold tracking-[0.1em] text-(--d-ink-soft) uppercase`}>
            {notice ? "Notice" : "Returned"}
          </p>
          <h2
            className={`${styles.serif} mt-2 text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.01em]`}
            style={{ color: notice ? INK : RED }}
          >
            {problem.title}
          </h2>
        </div>
        {problem.code === "show_unusable" && (
          <span className="mt-1 hidden shrink-0 sm:block">
            <Stamp angle={-8} className="text-[1rem]">
              Not on file
            </Stamp>
          </span>
        )}
      </div>
      <p className="mt-3 max-w-[60ch] text-[1.05rem] leading-relaxed text-(--d-ink-soft)">{problem.message}</p>
      {problem.next === "featured" && <FallbackFiles />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${styles.typed} mt-5 inline-flex min-h-11 items-center rounded-[4px] border-2 border-(--d-ink) px-5 text-[0.9rem] font-bold tracking-[0.08em] uppercase hover:bg-(--d-ink) hover:text-(--d-card)`}
        >
          Try again
        </button>
      )}
    </div>
  );
}
