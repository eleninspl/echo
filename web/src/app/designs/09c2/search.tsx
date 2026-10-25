"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";
import { plural } from "./inks";

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

  return (
    <div className="flex flex-col">
      <form
        id="find"
        onSubmit={submit}
        noValidate
        role="search"
        className="scroll-mt-10"
      >
        <p className="w2-sans text-[0.95rem] font-semibold text-(--w2-ink)">
          <label htmlFor="w2-show">Which show do you host?</label>
          <a href="#w2-note-search" aria-label="Note 1" className="w2-mark">
            1
          </a>
        </p>
        <div className="w2-field mt-2 flex items-stretch">
          <input
            id="w2-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="The show's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "w2-show-hint" : "w2-note-search"}
            className="min-w-0 flex-1 bg-transparent py-3 pr-3 text-[1.45rem] text-(--w2-ink) placeholder:text-(--w2-dim) placeholder:italic focus-visible:outline-none sm:text-[1.6rem]"
          />
          <button
            type="submit"
            disabled={searching}
            className="w2-sans w2-press my-1.5 shrink-0 px-5 text-[1rem] font-semibold disabled:cursor-wait sm:px-7"
          >
            {searching ? "Searching" : "Search"}
          </button>
        </div>
        {searching && <span aria-hidden className="w2-progress" />}
        <p
          id="w2-show-hint"
          aria-live="polite"
          className="w2-sans mt-2.5 min-h-[1.5rem] text-[0.95rem] font-medium text-(--w2-ink)"
        >
          {hint}
          {!hint && searching && (
            <span className="text-(--w2-soft)">
              Looking up &ldquo;{search.query}&rdquo; in Qloo&hellip;
            </span>
          )}
        </p>
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "found" &&
          `${plural(search.shows.length, "show", "shows")} found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="w2-which" className="mt-4">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-(--w2-ink) pb-2">
            <h2
              id="w2-which"
              className="w2-display text-[1.75rem] leading-none sm:text-[2rem]"
            >
              Which one is yours?
            </h2>
            <span className="w2-sans text-[0.9rem] text-(--w2-soft)">
              {plural(search.shows.length, "match", "matches")} for &ldquo;
              {search.query}&rdquo;
            </span>
          </div>
          <ul>
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className="w2-rise border-b border-(--w2-rule)"
                style={{ "--order": index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="w2-row group -mx-2 grid w-[calc(100%+1rem)] grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-2 py-4 text-left disabled:cursor-wait sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
                >
                  <Cover show={show} size={56} />
                  <span className="min-w-0">
                    <span className="block text-[1.2rem] leading-snug text-(--w2-ink) group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-0.5 line-clamp-2 block text-[0.98rem] leading-snug text-(--w2-soft) italic">
                        {show.description}
                      </span>
                    )}
                  </span>
                  <span
                    className={`w2-sans col-start-2 inline-flex w-fit items-center justify-center border-[1.5px] border-(--w2-ink) px-4 py-1.5 text-[0.92rem] font-semibold transition-colors sm:col-start-3 ${
                      pending === show.id
                        ? "bg-(--w2-ink) text-(--w2-paper)"
                        : "text-(--w2-ink) group-hover:bg-(--w2-ink) group-hover:text-(--w2-paper) group-disabled:opacity-45"
                    }`}
                  >
                    {pending === show.id ? "Starting the run" : "Run Echo"}
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

      {search.state === "failed" && (
        <Trouble problem={search.problem} onRetry={() => find(search.query)} />
      )}
    </div>
  );
}

function Trouble({
  problem,
  onRetry,
}: {
  problem: HostError;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-t-2 border-b border-t-(--w2-ink) border-b-(--w2-rule) py-5"
    >
      <span aria-hidden className="w2-display text-[2rem] leading-[0.9]">
        &#8224;
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="w2-display text-[1.6rem] leading-tight">
          {problem.title}
        </h2>
        <p className="max-w-[48ch] text-[1.02rem] leading-relaxed text-(--w2-soft)">
          {problem.message}
        </p>
        {problem.next === "featured" && <FeaturedPicks />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w2-sans mt-1 self-start border-[1.5px] border-(--w2-ink) px-4 py-1.5 text-[0.92rem] font-semibold text-(--w2-ink) hover:bg-(--w2-ink) hover:text-(--w2-paper)"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function FeaturedPicks() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2">
      <h3 className="text-[1rem] text-(--w2-soft) italic">
        Or open a show Echo has already run:
      </h3>
      <ul className="mt-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 py-1.5"
            >
              <Cover show={show} size={32} />
              <span className="text-[1.05rem] group-hover:underline group-hover:underline-offset-4">
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
