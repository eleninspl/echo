"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { styles } from "./styles";
import { ArrowRight, ShowCover, Spinner } from "./parts";
import { useRuns } from "./runs";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

export function ShowSearch() {
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
    <div id="search" className="flex scroll-mt-24 flex-col gap-4">
      <form
        role="search"
        onSubmit={submit}
        noValidate
        className="rounded-2xl border border-(--line) bg-white/90 p-2 shadow-(--shadow-md) backdrop-blur-sm"
      >
        <label htmlFor="d08-show" className="sr-only">
          Your show&apos;s name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-(--ink-3)"
              fill="none"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.7" />
              <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              id="d08-show"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              placeholder="Search for your podcast"
              aria-invalid={hint !== null}
              aria-describedby="d08-show-hint"
              className={`${styles.field} h-12 w-full rounded-xl border border-(--line-strong) bg-white pr-4 pl-11 text-[15px] text-(--ink) placeholder:text-(--ink-3)`}
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-(--accent) px-5 text-[15px] font-medium text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_6px_16px_-6px_rgb(91_61_245/0.7)] transition-colors hover:bg-(--accent-deep) disabled:cursor-wait disabled:opacity-80"
          >
            {searching ? (
              <>
                <Spinner />
                Searching
              </>
            ) : (
              <>
                Find my show
                <ArrowRight />
              </>
            )}
          </button>
        </div>
      </form>
      <p
        id="d08-show-hint"
        className={`-mt-1 px-1 text-[13px] ${hint ? "font-medium text-(--alert)" : "text-(--ink-3)"}`}
      >
        {hint ?? "Press Enter to search the podcasts Qloo knows."}
      </p>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {searching && (
        <Results title="Which one is yours?" note={`Looking for “${search.query}”`}>
          {[0, 1, 2].map((index) => (
            <li key={index} className="flex items-center gap-4 px-4 py-3.5">
              <span className={`size-12 shrink-0 rounded-xl ${styles.skeleton}`} />
              <span className="flex flex-1 flex-col gap-2">
                <span className={`h-3.5 w-2/5 rounded-full ${styles.skeleton}`} />
                <span className={`h-3 w-4/5 rounded-full ${styles.skeleton}`} />
              </span>
            </li>
          ))}
        </Results>
      )}

      {search.state === "found" && search.shows.length > 0 && (
        <Results
          title="Which one is yours?"
          note={`${search.shows.length} ${search.shows.length === 1 ? "match" : "matches"}`}
        >
          {search.shows.map((show, index) => (
            <li key={show.id} className={styles.rise} style={{ "--i": index } as CSSProperties}>
              <button
                type="button"
                onClick={() => start(show.id)}
                disabled={pending !== null}
                className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-(--bg-soft) disabled:cursor-wait"
              >
                <ShowCover show={show} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] leading-tight font-semibold tracking-[-0.01em] text-(--ink)">
                    {show.title}
                  </span>
                  {show.description && (
                    <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-(--ink-3)">
                      {show.description}
                    </span>
                  )}
                </span>
                <span
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                    pending === show.id
                      ? "bg-(--accent) text-white"
                      : "border border-(--line-strong) bg-white text-(--ink) group-hover:border-(--accent) group-hover:text-(--accent-deep)"
                  }`}
                >
                  {pending === show.id ? (
                    <>
                      <Spinner className="size-3.5" />
                      Starting
                    </>
                  ) : (
                    <>
                      Run Echo
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </span>
              </button>
            </li>
          ))}
        </Results>
      )}

      {startError && <ProblemCard problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <ProblemCard
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <ProblemCard problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

function Results({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby="d08-results"
      className="overflow-hidden rounded-2xl border border-(--line) bg-white shadow-(--shadow-md)"
    >
      <header className="flex items-center justify-between gap-4 border-b border-(--line) bg-(--bg-soft) px-4 py-2.5">
        <h2 id="d08-results" className="text-[14px] font-semibold tracking-[-0.01em] text-(--ink)">
          {title}
        </h2>
        <span className={`${styles.mono} truncate text-[11.5px] text-(--ink-3)`}>{note}</span>
      </header>
      <ul className="divide-y divide-(--line)">{children}</ul>
    </section>
  );
}

function ProblemCard({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div
      role="alert"
      className={`rounded-2xl border bg-white p-5 shadow-(--shadow-md) ${notice ? "border-(--line)" : "border-[#f2d4d1]"}`}
    >
      <div className="flex gap-3.5">
        <span
          aria-hidden
          className={`grid size-8 shrink-0 place-items-center rounded-full ${notice ? "bg-(--bg-sunk) text-(--ink-3)" : "bg-[#fdeceb] text-(--alert)"}`}
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.8v3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.9" fill="currentColor" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className={`text-[15px] font-semibold tracking-[-0.01em] ${notice ? "text-(--ink)" : "text-(--alert)"}`}>
            {problem.title}
          </h3>
          <p className="text-[14px] leading-relaxed text-(--ink-2)">{problem.message}</p>
          {problem.next === "featured" && <FeaturedFallback />}
          {problem.next === "retry" && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex h-9 items-center self-start rounded-full border border-(--line-strong) bg-white px-4 text-[13px] font-medium text-(--ink) hover:border-(--ink-3)"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FeaturedFallback() {
  const { featured } = useRuns();
  if (!featured?.length) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      <h4 className={`${styles.mono} text-[11px] tracking-[0.08em] text-(--ink-3) uppercase`}>
        Or open a show Echo has run
      </h4>
      <ul className="flex flex-col gap-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-(--bg-soft)"
            >
              <ShowCover show={show} size={32} rounded="rounded-lg" />
              <span className="flex-1 truncate text-[14px] font-medium text-(--ink)">{show.title}</span>
              <ArrowRight className="text-(--ink-3) group-hover:text-(--accent)" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
