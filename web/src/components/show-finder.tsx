"use client";

import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { FeaturedFallback } from "./featured";
import { hue, ZoneHead } from "./hud";
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
      <form onSubmit={submit} noValidate className="zone flex flex-col" role="search">
        <ZoneHead title="Find your show" />
        <div className="flex flex-col gap-2 p-4">
          <label htmlFor="show" className="sr-only">
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
              className="field min-h-13 min-w-0 flex-1 px-4 py-3 text-lg"
            />
            <button
              type="submit"
              disabled={search.state === "searching"}
              className="btn btn-solid min-h-13 px-7 text-base"
              style={hue("var(--fit)")}
            >
              {search.state === "searching" ? "Looking…" : "Find it"}
            </button>
          </div>
          {hint && (
            <p id="show-hint" className="text-sm font-semibold text-alert">
              {hint}
            </p>
          )}
        </div>
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <div className="zone">
          <ZoneHead title="Which one is yours?" as="h2">
            <span>
              {search.shows.length} {search.shows.length === 1 ? "match" : "matches"}
            </span>
          </ZoneHead>
          <ul className="flex flex-col">
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className="acquire border-b border-steel last:border-b-0"
                style={{ "--order": index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="group flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-deck-hi/70 disabled:cursor-wait"
                >
                  <ShowCover show={show} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl leading-tight font-semibold group-hover:text-white">
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{show.description}</span>
                    )}
                  </span>
                  <span className={`btn shrink-0 ${pending === show.id ? "btn-solid" : ""}`} style={hue("var(--fit)")}>
                    {pending === show.id ? "Opening…" : "Run Echo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Below the list, next to the show the host just picked. */}
      {startError && <StartProblem problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <StartProblem
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Echo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <StartProblem problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

function StartProblem({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  return (
    <Problem problem={problem}>
      {problem.next === "featured" && <FeaturedFallback />}
      {problem.next === "retry" && onRetry && (
        <button type="button" onClick={onRetry} className="btn self-start">
          Try again
        </button>
      )}
    </Problem>
  );
}
