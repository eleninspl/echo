"use client";

import { useRef, useState, type FormEvent } from "react";

import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { FeaturedFallback } from "./featured";
import { Problem } from "./problem";
import { ShowCover } from "./show-cover";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

// Search on submit, never per keystroke: every search is a Qloo call (docs/plan.md, API).
export function ShowFinder() {
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

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} noValidate className="flex flex-col gap-2" role="search">
        <label htmlFor="show" className="text-sm font-semibold tracking-wide uppercase">
          Your show
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="The podcast's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "show-hint" : undefined}
            className="min-w-0 flex-1 border-2 border-on-field bg-stock px-4 py-3 text-lg text-ink placeholder:text-ink-soft focus-visible:outline-offset-2"
          />
          <button
            type="submit"
            disabled={search.state === "searching"}
            className="bg-on-field px-6 py-3 text-lg font-semibold text-field transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {search.state === "searching" ? "Looking…" : "Find it"}
          </button>
        </div>
        {hint && (
          <p id="show-hint" className="text-sm font-semibold">
            {hint}
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {startError && <StartProblem problem={describe(startError)} />}

      {search.state === "found" && search.shows.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Which one is yours?</h2>
          <ul className="flex flex-col border-t border-field-rule">
            {search.shows.map((show) => (
              <li key={show.id} className="border-b border-field-rule">
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="group flex w-full items-center gap-4 py-3 text-left disabled:cursor-wait"
                >
                  <ShowCover show={show} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-2xl leading-none font-extrabold uppercase group-hover:underline">
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-1 line-clamp-2 block text-sm text-on-field-soft">
                        {show.description}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    {pending === show.id ? "Opening…" : "Run Echo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {search.state === "found" && search.shows.length === 0 && (
        <StartProblem
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or open a show Echo has run.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && (
        <StartProblem problem={search.problem} onRetry={() => find(search.query)} />
      )}
    </div>
  );
}

function StartProblem({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  return (
    <Problem problem={problem}>
      {problem.next === "featured" && <FeaturedFallback />}
      {problem.next === "retry" && onRetry && (
        <button type="button" onClick={onRetry} className="self-start border-2 border-current px-4 py-2 font-semibold">
          Try again
        </button>
      )}
    </Problem>
  );
}
