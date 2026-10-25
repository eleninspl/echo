"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { styles } from "./styles";
import { Overprint, RisoCover } from "./ink";

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
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} noValidate role="search" className={styles.coupon}>
        <Scissors />
        <label htmlFor="d04-show" className={`${styles.mono} block text-[0.95rem] font-bold tracking-wide uppercase`}>
          Your show&apos;s name
        </label>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end">
          <input
            id="d04-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Type the podcast's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "d04-show-hint" : "d04-show-note"}
            className={`${styles.mono} ${styles.field}`}
          />
          <button type="submit" disabled={searching} className={`${styles.display} ${styles.inkButton}`}>
            {searching ? "Looking…" : "Find it"}
          </button>
        </div>
        {hint ? (
          <p id="d04-show-hint" className={`${styles.mono} ${styles.hint} mt-3 text-[0.95rem] font-bold`}>
            {hint}
          </p>
        ) : (
          <p id="d04-show-note" className={`${styles.mono} mt-3 text-sm text-(--blue)`}>
            Press Enter to search. Echo looks your show up in Qloo.
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {searching && (
        <p className={`${styles.mono} flex items-center gap-3 text-base font-bold text-(--blue)`}>
          <span aria-hidden className={styles.inking}>
            <span />
            <span />
            <span />
          </span>
          Looking up &ldquo;{search.query}&rdquo; in Qloo
        </p>
      )}

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="d04-results" className="flex flex-col">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-[3px] border-(--blue) pb-2">
            <h2 id="d04-results" className="text-[clamp(2rem,4vw,2.75rem)] leading-[0.9] uppercase">
              <Overprint className={styles.display}>Which one is yours?</Overprint>
            </h2>
            <span className={`${styles.mono} text-sm font-bold text-(--blue) uppercase`}>
              {search.shows.length} {search.shows.length === 1 ? "match" : "matches"}
            </span>
          </div>
          <ul className="flex flex-col">
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className={`${styles.printIn} border-b-2 border-dashed border-(--blue)/60`}
                style={{ "--order": index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className={`${styles.resultRow} group grid w-full grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 py-4 text-left disabled:cursor-wait sm:grid-cols-[auto_1fr_auto]`}
                >
                  <RisoCover title={show.title} imageUrl={show.image_url} size={76} />
                  <span className="min-w-0">
                    <span
                      className={`${styles.display} block text-[1.7rem] leading-[0.95] text-(--overprint) uppercase`}
                    >
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-1.5 line-clamp-2 block text-[0.98rem] leading-snug text-(--blue)">
                        {show.description}
                      </span>
                    )}
                  </span>
                  <span
                    className={`${styles.display} ${styles.runButton} col-start-2 justify-self-start sm:col-start-3 sm:justify-self-end`}
                    data-pending={pending === show.id || undefined}
                  >
                    {pending === show.id ? "Opening…" : "Run Echo"}
                    <span aria-hidden>→</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {startError && <Misprint problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <Misprint
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <Misprint problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

function Misprint({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div role="alert" className={`${styles.misprint} ${notice ? styles.notice : ""}`}>
      <span className={`${styles.mono} text-sm font-bold tracking-wide text-(--blue) uppercase`}>
        {notice ? "Notice" : "Misprint"}
      </span>
      <h2 className="mt-1 text-[clamp(1.8rem,3.4vw,2.4rem)] leading-[0.92] uppercase">
        <Overprint className={styles.display}>{problem.title}</Overprint>
      </h2>
      <p className="mt-3 max-w-[56ch] text-(--overprint)">{problem.message}</p>
      <ProblemNext problem={problem} onRetry={onRetry} />
    </div>
  );
}

function ProblemNext({ problem, onRetry }: { problem: HostError; onRetry?: () => void }): ReactNode {
  if (problem.next === "featured") return <FeaturedFallback />;
  if (problem.next === "retry" && onRetry) {
    return (
      <button type="button" onClick={onRetry} className={`${styles.display} ${styles.runButton} mt-4`}>
        Try again
      </button>
    );
  }
  return null;
}

function FeaturedFallback() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-5">
      <h3 className={`${styles.mono} mb-2 text-sm font-bold text-(--blue) uppercase`}>Or open a show Echo has run</h3>
      <ul className="flex flex-col gap-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 py-1"
            >
              <RisoCover title={show.title} imageUrl={show.image_url} size={40} />
              <span
                className={`${styles.display} text-xl text-(--overprint) uppercase underline-offset-4 group-hover:underline`}
              >
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Scissors() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 20"
      className="absolute -top-[11px] left-6 h-5 w-8 bg-(--paper) px-1"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="5" cy="5" r="3.4" />
        <circle cx="5" cy="15" r="3.4" />
        <path d="M8 6.6 L28 15.5 M8 13.4 L28 4.5" />
      </g>
    </svg>
  );
}
