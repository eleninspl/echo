"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { styles } from "./styles";
import { ShowArt } from "./show-art";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

const SHORT_QUERY_HINT = "Type at least two letters of the show's name.";

export function ShowSearch() {
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const inFlight = useRef<AbortController | null>(null);
  const { start, pending, error: startError } = useStart();
  const searching = search.state === "searching";

  async function find(text: string) {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setSearch({ state: "searching", query: text });
    try {
      const { shows } = await echo.shows(text, controller.signal);
      setSearch({ state: "found", query: text, shows });
    } catch (error) {
      if (!controller.signal.aborted)
        setSearch({ state: "failed", query: text, problem: describe(error) });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 2) {
      setHint(SHORT_QUERY_HINT);
      return;
    }
    setHint(null);
    find(text);
  }

  return (
    <>
      <form
        role="search"
        onSubmit={submit}
        noValidate
        className="grid grid-cols-1 gap-y-4 border-t border-(--ink) pt-6 md:grid-cols-12 md:gap-x-10 md:pt-8"
      >
        <div className="flex flex-col gap-3 md:col-span-3 md:pt-2">
          <label htmlFor="d01-show" className={`${styles.kicker} text-(--red)`}>
            Begin with your show
          </label>
          <p
            className={`${styles.sans} hidden max-w-[30ch] text-[0.875rem] leading-relaxed text-(--ink-dim) md:block`}
          >
            Echo looks it up in Qloo, maps what its listeners love, then ranks
            guests by fit, love back and reach.
          </p>
        </div>
        <div className="md:col-span-9">
          <div className={`${styles.field} flex items-end gap-3 sm:gap-5`}>
            <input
              id="d01-show"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              placeholder="The podcast's name"
              aria-invalid={hint !== null}
              aria-describedby="d01-show-note"
              className={`${styles.input} ${styles.display} min-w-0 flex-1 py-1.5 text-[1.875rem] leading-tight sm:text-[2.75rem] lg:text-[3.25rem]`}
            />
            <button
              type="submit"
              disabled={searching}
              className={`${styles.sans} mb-2.5 inline-flex min-h-11 shrink-0 items-center gap-2 bg-(--ink) px-4 text-[0.8125rem] font-semibold tracking-[0.14em] text-(--paper) uppercase transition-colors hover:bg-(--red) disabled:cursor-wait disabled:bg-(--ink-soft) sm:min-h-12 sm:px-6`}
            >
              {searching ? "Looking…" : "Find it"}
              {!searching && <ArrowRight />}
            </button>
            {searching && <span aria-hidden className={styles.press} />}
          </div>
          <p
            id="d01-show-note"
            className={`mt-3 text-[0.9375rem] leading-snug sm:text-base ${hint ? "font-medium text-(--red)" : "text-(--ink-dim) italic"}`}
          >
            {hint ??
              (searching
                ? `Looking for “${search.query}” in Qloo.`
                : "Type its name and press Enter.")}
          </p>
        </div>
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" &&
          `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="d01-matches" className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-[3px] border-(--ink) pb-3">
            <h2
              id="d01-matches"
              className={`${styles.display} text-[2.5rem] leading-none italic sm:text-5xl`}
            >
              Which one is yours?
            </h2>
            <span className={`${styles.folio} text-(--ink-dim)`}>
              {search.shows.length}{" "}
              {search.shows.length === 1 ? "match" : "matches"} for “
              {search.query}”
            </span>
          </div>
          <ol>
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className={`${styles.rise} grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-5 gap-y-4 border-b border-(--rule) py-6 sm:grid-cols-[3rem_5.5rem_minmax(0,1fr)_auto] sm:gap-x-7`}
                style={{ "--order": index } as CSSProperties}
              >
                <span
                  aria-hidden
                  className={`${styles.display} ${styles.numerals} hidden text-4xl text-(--ink-dim) sm:block`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="sm:hidden">
                  <ShowArt show={show} size={72} />
                </span>
                <span className="hidden sm:block">
                  <ShowArt show={show} size={88} />
                </span>
                <div className="min-w-0">
                  <h3
                    className={`${styles.display} text-[1.75rem] leading-[1.05] sm:text-[2.25rem]`}
                  >
                    {show.title}
                  </h3>
                  {show.description && (
                    <p className="mt-1.5 line-clamp-2 max-w-[60ch] text-[1.0625rem] leading-snug text-(--ink-soft)">
                      {show.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  aria-label={`Run Echo on ${show.title}`}
                  className={`${styles.sans} col-start-2 inline-flex min-h-11 items-center justify-self-start gap-2 border border-(--ink) px-5 text-[0.8125rem] font-semibold tracking-[0.14em] uppercase transition-colors hover:bg-(--ink) hover:text-(--paper) disabled:cursor-wait sm:col-start-auto ${
                    pending === show.id
                      ? "bg-(--red) border-(--red) text-(--paper)"
                      : ""
                  } ${pending !== null && pending !== show.id ? "opacity-40" : ""}`}
                >
                  {pending === show.id ? "Opening…" : "Run Echo"}
                  {pending !== show.id && <ArrowRight />}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {startError && <EditorsNote problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <EditorsNote
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know “${search.query}”, or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && (
        <EditorsNote
          problem={search.problem}
          onRetry={() => find(search.query)}
        />
      )}
    </>
  );
}

function EditorsNote({
  problem,
  onRetry,
}: {
  problem: HostError;
  onRetry?: () => void;
}) {
  const notice = problem.code === "not_implemented";
  return (
    <div
      role="alert"
      className={`mt-12 grid gap-x-10 gap-y-4 border-t-[3px] py-6 md:grid-cols-12 ${notice ? "border-(--ink)" : "border-(--red)"}`}
    >
      <p
        className={`${styles.kicker} md:col-span-3 ${notice ? "text-(--ink-dim)" : "text-(--red)"}`}
      >
        {notice ? "A note" : "Editor's note"}
      </p>
      <div className="flex max-w-2xl flex-col gap-3 md:col-span-9">
        <h2 className={`${styles.display} text-4xl leading-none`}>
          {problem.title}
        </h2>
        <p className="text-lg leading-relaxed text-(--ink-soft)">
          {problem.message}
        </p>
        {problem.next === "featured" && <FeaturedShortList />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`${styles.sans} mt-1 inline-flex min-h-11 items-center self-start border border-(--ink) px-5 text-[0.8125rem] font-semibold tracking-[0.14em] uppercase hover:bg-(--ink) hover:text-(--paper)`}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function FeaturedShortList() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-3">
      <p className={`${styles.folio} mb-2 text-(--ink-dim)`}>
        Or open a show Echo has run
      </p>
      <ul className="flex flex-col border-t border-(--rule)">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id} className="border-b border-(--rule)">
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-4 py-2.5"
            >
              <ShowArt show={show} size={40} />
              <span
                className={`${styles.display} text-2xl group-hover:underline`}
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

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 10"
      className={`h-2.5 w-4 ${className}`}
      fill="none"
      stroke="currentColor"
    >
      <path d="M0 5h14.5M10.5 1l4 4-4 4" strokeWidth="1.4" />
    </svg>
  );
}
