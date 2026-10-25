"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";
import { styles } from "./styles";

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
      <form id="find" onSubmit={submit} noValidate role="search" className="flex scroll-mt-10 flex-col gap-4">
        <label htmlFor="v9e-show" className={styles.overline}>
          Find your show
        </label>
        <div className="flex items-center gap-2 rounded-full bg-(--v9e-plum) p-2 pl-6 ring-1 ring-(--v9e-line) transition-shadow focus-within:ring-(--v9e-soft) hover:ring-(--v9e-line-hi)">
          <input
            id="v9e-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Your podcast's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "v9e-show-hint" : "v9e-show-about"}
            className="min-w-0 flex-1 bg-transparent py-3 text-lg text-(--v9e-ink) placeholder:text-(--v9e-dim) focus-visible:outline-none sm:text-xl"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex min-h-13 shrink-0 items-center rounded-full bg-(--v9e-ink) px-7 text-base font-semibold text-(--v9e-on-ink) transition-colors hover:bg-white disabled:cursor-wait disabled:bg-(--v9e-soft)"
          >
            {searching ? "Looking…" : "Find it"}
          </button>
        </div>
        {hint ? (
          <p id="v9e-show-hint" className="pl-6 text-base font-semibold text-(--v9e-amber)">
            {hint}
          </p>
        ) : (
          <p id="v9e-show-about" className="pl-6 text-base text-(--v9e-dim)">
            Searches the podcasts Qloo knows. Press Enter to look.
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="v9e-which" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="v9e-which" className={`${styles.display} text-3xl leading-none sm:text-4xl`}>
              Which one is yours?
            </h2>
            <span className="text-base text-(--v9e-dim)">
              {search.shows.length} {search.shows.length === 1 ? "match" : "matches"}
            </span>
          </div>
          <ul className="flex flex-col border-t border-(--v9e-line)">
            {search.shows.map((show) => (
              <li key={show.id} className="border-b border-(--v9e-line)">
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="group flex w-full items-center gap-5 py-5 text-left disabled:cursor-wait"
                >
                  <Cover show={show} size={60} />
                  <span className="min-w-0 flex-1">
                    <span className={`${styles.display} block text-2xl leading-tight`}>{show.title}</span>
                    {show.description && (
                      <span className="mt-1 line-clamp-2 block text-base text-(--v9e-soft)">{show.description}</span>
                    )}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                      pending === show.id
                        ? "bg-(--v9e-soft) text-(--v9e-on-ink)"
                        : "text-(--v9e-ink) ring-1 ring-(--v9e-line-hi) group-hover:bg-(--v9e-ink) group-hover:text-(--v9e-on-ink) group-hover:ring-(--v9e-ink) group-disabled:opacity-50"
                    }`}
                  >
                    {pending === show.id ? "Starting…" : "Run Echo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {startError && <Trouble problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <Trouble
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <Trouble problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

function Trouble({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div
      role="alert"
      className={`flex flex-col gap-3 border-l pl-6 ${notice ? "border-(--v9e-line-hi)" : "border-(--v9e-love)"}`}
    >
      <h2 className={`${styles.display} text-3xl leading-tight ${notice ? "" : "text-(--v9e-love)"}`}>
        {problem.title}
      </h2>
      <p className="text-lg leading-relaxed text-(--v9e-soft)">{problem.message}</p>
      {problem.next === "featured" && <FeaturedPicks />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 self-start rounded-full px-6 py-2.5 text-sm font-semibold text-(--v9e-ink) ring-1 ring-(--v9e-line-hi) hover:bg-(--v9e-ink) hover:text-(--v9e-on-ink)"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function FeaturedPicks() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-3">
      <h3 className={styles.overline}>Or open a show Echo has run</h3>
      <ul className="flex flex-col gap-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-4 rounded-2xl py-1.5"
            >
              <Cover show={show} size={40} />
              <span className={`${styles.display} text-xl group-hover:underline`}>{show.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
