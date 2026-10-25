"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { styles } from "./styles";
import { Cover, Sticker } from "./parts";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

export function Finder({ lead, art }: { lead: ReactNode; art: ReactNode }) {
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
      if (!controller.signal.aborted)
        setSearch({ state: "failed", query: text, problem: describe(error) });
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
  const hasOutcome = search.state !== "idle" || startError !== null;

  return (
    <div className="grid grid-cols-1 gap-x-14 gap-y-12 lg:grid-cols-12">
      <div className="order-1 flex flex-col gap-9 lg:order-none lg:col-span-7">
        {lead}

        <form
          onSubmit={submit}
          noValidate
          role="search"
          aria-label="Find your show"
          className="relative border-3 border-(--nb-ink) bg-white px-4 pt-7 pb-4 shadow-[8px_8px_0_0_var(--nb-ink)] sm:px-5 sm:pb-5"
        >
          <label
            htmlFor="d05-show"
            className={`${styles.mono} absolute -top-3.5 left-4 -rotate-2 border-2 border-(--nb-ink) bg-(--nb-ink) px-2.5 py-0.5 text-xs font-bold tracking-[0.08em] text-(--nb-paper) uppercase`}
          >
            Your show
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="d05-show"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              placeholder="Type the podcast's name"
              aria-invalid={hint !== null}
              aria-describedby="d05-show-help"
              className="min-h-14 min-w-0 flex-1 border-3 border-(--nb-ink) bg-(--nb-paper) px-4 text-lg font-medium placeholder:text-(--nb-soft) focus:bg-white"
            />
            <button
              type="submit"
              disabled={searching}
              className={`${styles.press} ${styles.display} ${searching ? styles.pressed : ""} min-h-14 bg-(--nb-yellow) px-8 text-lg font-extrabold`}
            >
              {searching ? "Looking…" : "Find it"}
            </button>
          </div>
          <p
            id="d05-show-help"
            className={`mt-3 text-sm ${hint ? "font-bold text-(--nb-ink)" : "text-(--nb-soft)"}`}
          >
            {hint ? (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid size-5 place-items-center border-2 border-(--nb-ink) bg-(--nb-alert) text-xs"
                >
                  !
                </span>
                {hint}
              </span>
            ) : (
              "Press Enter to search. Then pick your show and run Echo."
            )}
          </p>
        </form>
      </div>

      <div className="order-3 lg:order-none lg:col-span-5">{art}</div>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" &&
          `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {hasOutcome && (
        <div className="order-2 flex flex-col gap-8 lg:order-none lg:col-span-12">
          {searching && <Searching query={search.query} />}

          {search.state === "found" && search.shows.length > 0 && (
            <section aria-labelledby="d05-pick" className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2
                  id="d05-pick"
                  className={`${styles.display} text-[clamp(2rem,3.4vw,3rem)] leading-none font-extrabold tracking-[-0.03em]`}
                >
                  Which one is yours?
                </h2>
                <Sticker className="rotate-1 bg-white">
                  {search.shows.length}{" "}
                  {search.shows.length === 1 ? "match" : "matches"} for “
                  {search.query}”
                </Sticker>
              </div>
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {search.shows.map((show, index) => (
                  <li
                    key={show.id}
                    className={styles.pop}
                    style={{ "--i": index } as CSSProperties}
                  >
                    <article className="flex h-full flex-col border-3 border-(--nb-ink) bg-white shadow-[6px_6px_0_0_var(--nb-ink)]">
                      <div className="flex gap-4 p-4 sm:p-5">
                        <Cover show={show} size={84} />
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`${styles.display} text-2xl leading-[1.02] font-extrabold tracking-[-0.02em] break-words`}
                          >
                            {show.title}
                          </h3>
                          {show.description && (
                            <p className="mt-2 line-clamp-3 text-[0.95rem] leading-snug text-(--nb-soft)">
                              {show.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto border-t-3 border-(--nb-ink) bg-(--nb-paper) p-4 sm:px-5">
                        <button
                          type="button"
                          onClick={() => start(show.id)}
                          disabled={pending !== null}
                          aria-label={
                            pending === show.id
                              ? `Opening Echo for ${show.title}`
                              : `Run Echo on ${show.title}`
                          }
                          className={`${styles.press} ${styles.display} ${pending === show.id ? styles.pressed : ""} flex min-h-12 w-full items-center justify-center gap-2 bg-(--nb-yellow) px-5 text-lg font-extrabold`}
                        >
                          {pending === show.id ? "Opening…" : "Run Echo"}
                          {pending !== show.id && <span aria-hidden>→</span>}
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
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

          {search.state === "failed" && (
            <ProblemCard
              problem={search.problem}
              onRetry={() => find(search.query)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Searching({ query }: { query: string }) {
  return (
    <div className="flex flex-col gap-6">
      <p className={`${styles.display} text-2xl font-extrabold`}>
        Looking for “{query}” in Qloo…
      </p>
      <div
        aria-hidden
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`h-44 border-3 border-(--nb-ink) ${styles.loading}`}
          />
        ))}
      </div>
    </div>
  );
}

function ProblemCard({
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
      className="max-w-3xl border-3 border-(--nb-ink) bg-white shadow-[8px_8px_0_0_var(--nb-ink)]"
    >
      <div
        className={`${styles.mono} flex items-center gap-2 border-b-3 border-(--nb-ink) px-4 py-2 text-xs font-bold tracking-[0.08em] uppercase ${notice ? "bg-(--nb-paper)" : "bg-(--nb-alert)"}`}
      >
        <span
          aria-hidden
          className="grid size-5 place-items-center border-2 border-(--nb-ink) bg-white"
        >
          !
        </span>
        {notice ? "Notice" : "Hold on"}
      </div>
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <h2
          className={`${styles.display} text-3xl leading-none font-extrabold tracking-[-0.02em]`}
        >
          {problem.title}
        </h2>
        <p className="max-w-[60ch] text-(--nb-soft)">{problem.message}</p>
        {problem.next === "featured" && <FallbackShows />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`${styles.press} ${styles.display} mt-1 self-start bg-(--nb-yellow) px-5 py-2 text-lg font-extrabold`}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function FallbackShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-3">
      <p
        className={`${styles.mono} text-xs font-bold tracking-[0.08em] uppercase`}
      >
        Or open a show Echo has run
      </p>
      <ul className="flex flex-wrap gap-4">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className={`${styles.press} flex items-center gap-3 bg-white py-2 pr-4 pl-2`}
            >
              <Cover show={show} size={40} />
              <span className={`${styles.display} text-lg font-extrabold`}>
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
