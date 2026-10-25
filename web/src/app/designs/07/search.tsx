"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { GOLD, SERIF, ShowMark, SILVER, SMALL_CAPS, starPath, css } from "./atlas";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

const BUTTON = `${SMALL_CAPS} inline-flex min-h-12 items-center justify-center border px-6 text-[1.05rem] font-semibold tracking-[0.16em] lowercase transition-colors`;
const SOLID = "border-(--atlas-gold) bg-(--atlas-gold) text-(--atlas-sky)";
const OUTLINE = "border-(--atlas-gold-line) text-(--atlas-gold)";

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
    <div className="flex flex-col gap-6">
      <form
        onSubmit={submit}
        noValidate
        role="search"
        aria-label="Find your show"
        className={`${css.frame} ${css.corners} flex flex-col gap-4 p-5 sm:p-6`}
      >
        <div className="flex items-baseline justify-between gap-4">
          <label
            htmlFor="atlas-show"
            className={`${SMALL_CAPS} text-[1.05rem] font-semibold tracking-[0.2em] text-(--atlas-gold) lowercase`}
          >
            Find your show
          </label>
          <span className="hidden text-xs tracking-[0.08em] text-(--atlas-dim) sm:inline">Podcasts Qloo knows</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            id="atlas-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="The podcast's name"
            aria-invalid={hint !== null}
            aria-describedby="atlas-show-note"
            className={`${css.field} ${SERIF} min-h-12 min-w-0 flex-1 border-0 border-b border-(--atlas-line-strong) bg-transparent px-1 pb-1 text-[1.75rem] leading-tight text-(--atlas-parchment) focus:border-(--atlas-gold) focus-visible:shadow-[0_1px_0_0_var(--atlas-gold)] focus-visible:outline-none`}
          />
          <button
            type="submit"
            disabled={searching}
            className={`${BUTTON} ${SOLID} hover:border-(--atlas-parchment) hover:bg-(--atlas-parchment) disabled:cursor-wait disabled:opacity-70`}
          >
            {searching ? "Searching…" : "Find it"}
          </button>
        </div>
        <p
          id="atlas-show-note"
          className={hint ? "text-sm font-medium text-(--atlas-rose)" : "text-sm text-(--atlas-dim)"}
        >
          {hint ?? "Press Enter to search. Then pick your show and run Echo."}
        </p>
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {searching && <Searching query={search.query} />}

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="atlas-results" className="flex flex-col">
          <div className="flex items-baseline justify-between gap-4 border-b border-(--atlas-line) pb-3">
            <h2 id="atlas-results" className={`${SERIF} text-[2rem] leading-none font-light text-(--atlas-parchment) italic`}>
              Which one is yours?
            </h2>
            <span className={`${SMALL_CAPS} text-base tracking-[0.16em] text-(--atlas-mist) lowercase`}>
              {search.shows.length} {search.shows.length === 1 ? "match" : "matches"}
            </span>
          </div>
          <ul className="flex flex-col">
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className={`${css.rise} border-b border-(--atlas-line)`}
                style={{ "--order": index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-4 text-left disabled:cursor-wait sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                >
                  <span className={pending === show.id ? css.pulse : undefined}>
                    <ShowMark show={show} size={64} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`${SERIF} block text-[1.45rem] leading-tight font-medium text-(--atlas-parchment) group-hover:text-white`}
                    >
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-1 line-clamp-2 block text-sm leading-snug text-(--atlas-mist)">
                        {show.description}
                      </span>
                    )}
                  </span>
                  <span
                    className={`${BUTTON} col-start-2 justify-self-start sm:col-start-3 sm:justify-self-end ${
                      pending === show.id
                        ? SOLID
                        : `${OUTLINE} group-hover:border-(--atlas-gold) group-hover:bg-(--atlas-gold)/10`
                    }`}
                  >
                    {pending === show.id ? "Opening…" : "Run Echo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {startError && <StartProblem problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <StartProblem
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <StartProblem problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

function Searching({ query }: { query: string }) {
  return (
    <div className="flex items-center gap-4 border-y border-(--atlas-line) py-4">
      <svg aria-hidden viewBox="0 0 100 100" className="size-10 shrink-0">
        <circle cx="50" cy="50" r="44" fill="none" stroke={SILVER} strokeOpacity="0.3" />
        <circle cx="50" cy="50" r="30" fill="none" stroke={SILVER} strokeOpacity="0.16" strokeDasharray="2 4" />
        <g className={css.sweep}>
          <line x1="50" y1="50" x2="50" y2="7" stroke={GOLD} strokeWidth="1.5" />
          <path d={starPath(50, 12, 7)} fill={GOLD} />
        </g>
        <circle cx="50" cy="50" r="2.5" fill={GOLD} />
      </svg>
      <p className="text-(--atlas-mist)">
        Searching Qloo for <span className={`${SERIF} text-lg text-(--atlas-parchment) italic`}>{query}</span>
      </p>
    </div>
  );
}

function StartProblem({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  return (
    <Notice problem={problem}>
      {problem.next === "featured" && <FeaturedFallback />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${BUTTON} ${OUTLINE} self-start hover:border-(--atlas-gold) hover:bg-(--atlas-gold)/10`}
        >
          Try again
        </button>
      )}
    </Notice>
  );
}

function Notice({ problem, children }: { problem: HostError; children?: ReactNode }) {
  const notBuilt = problem.code === "not_implemented";
  return (
    <div role="alert" className={`${css.frame} flex flex-col gap-3 p-6`}>
      <p className={`${SMALL_CAPS} text-sm font-semibold tracking-[0.2em] text-(--atlas-dim) lowercase`}>
        {notBuilt ? "Notice" : "No clear sky"}
      </p>
      <h2
        className={`${SERIF} text-[1.9rem] leading-tight font-normal ${
          notBuilt ? "text-(--atlas-parchment)" : "text-(--atlas-rose)"
        }`}
      >
        {problem.title}
      </h2>
      <p className="max-w-[56ch] text-(--atlas-mist)">{problem.message}</p>
      {children}
    </div>
  );
}

function FeaturedFallback() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2 border-t border-(--atlas-line) pt-4">
      <h3 className={`${SMALL_CAPS} mb-3 text-sm font-semibold tracking-[0.2em] text-(--atlas-gold) lowercase`}>
        Or open a show Echo has run
      </h3>
      <ul className="flex flex-col gap-2">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 py-1"
            >
              <ShowMark show={show} size={36} />
              <span
                className={`${SERIF} text-xl text-(--atlas-parchment) underline-offset-4 group-hover:underline`}
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
