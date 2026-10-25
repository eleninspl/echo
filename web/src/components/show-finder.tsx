"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { FeaturedFallback } from "./featured";
import { hue, ZoneHead } from "./hud";
import { Problem } from "./problem";
import { ShowCover } from "./show-cover";

export const RESULTS_SLOT = "show-results";
const WIDE = "(min-width: 1280px)";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

function useWide(): boolean {
  return useSyncExternalStore(
    (change) => {
      const media = window.matchMedia(WIDE);
      media.addEventListener("change", change);
      return () => media.removeEventListener("change", change);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

function useSlot(): HTMLElement | null {
  return useSyncExternalStore(
    () => () => undefined,
    () => document.getElementById(RESULTS_SLOT),
    () => null,
  );
}

// Search on submit, never per keystroke: every search is a Qloo call (docs/plan.md, API).
export function ShowFinder() {
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const inFlight = useRef<AbortController | null>(null);
  const results = useRef<HTMLDivElement>(null);
  const { start, pending, error: startError } = useStart();
  const wide = useWide();
  const slot = useSlot();
  const beside = wide && slot !== null;

  useEffect(() => {
    const panel = results.current;
    if (!panel) return;
    const fit = () => {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        panel.style.maxHeight = "";
        return;
      }
      const room = window.innerHeight - panel.getBoundingClientRect().top - 24;
      panel.style.maxHeight = `${Math.max(room, 288)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [search.state, beside]);

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

  const shows = search.state === "found" ? search.shows : [];
  const problems = (
    <>
      {startError && <StartProblem problem={describe(startError)} />}
      {search.state === "found" && shows.length === 0 && (
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
    </>
  );

  return (
    <div className="relative flex flex-col">
      <form onSubmit={submit} noValidate className="flex flex-col gap-2" role="search">
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
            placeholder="Your podcast's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "show-hint" : undefined}
            className="field min-h-12 min-w-0 flex-1 px-4 py-2.5 text-base"
          />
          <button
            type="submit"
            disabled={search.state === "searching"}
            className="btn btn-brand min-h-12 rounded-[0.875rem] px-6 text-base"
          >
            {search.state === "searching" ? "Looking…" : "Find it"}
          </button>
        </div>
        {hint && (
          <p id="show-hint" className="text-sm font-semibold text-alert">
            {hint}
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${shows.length} shows found for ${search.query}.`}
      </p>

      {beside ? (
        (search.state !== "idle" || startError) &&
        createPortal(
          <SidePanel key={search.state === "idle" ? "idle" : search.query} search={search}>
            {shows.length > 0 && (
              <ul className="flex flex-col gap-1">
                {shows.map((show, index) => (
                  <li key={show.id} className="rise" style={{ "--order": index + 1 } as CSSProperties}>
                    <button
                      type="button"
                      onClick={() => start(show.id)}
                      disabled={pending !== null}
                      className="group flex w-full items-center gap-4 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.045] focus-visible:bg-ink/[0.045] disabled:cursor-wait"
                    >
                      <ShowCover show={show} size={60} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg leading-snug font-semibold">
                          {show.title}
                        </span>
                        {show.description && (
                          <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-ink-soft">
                            {show.description}
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-brand group-hover:text-[color:var(--on-brand)] group-focus-visible:bg-brand group-focus-visible:text-[color:var(--on-brand)] ${
                          pending === show.id
                            ? "bg-brand text-[color:var(--on-brand)] motion-safe:animate-pulse"
                            : "text-ink-dim"
                        }`}
                      >
                        <svg viewBox="0 0 12 12" className="size-3.5">
                          <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                      <span className="sr-only">
                        {pending === show.id ? `Opening ${show.title}` : `Run Echo on ${show.title}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {problems}
          </SidePanel>,
          slot,
        )
      ) : (
        <div
          ref={results}
          className="mt-4 flex flex-col gap-4 empty:hidden lg:absolute lg:inset-x-0 lg:top-full lg:z-30 lg:mt-2 lg:max-h-[60vh] lg:overflow-y-auto lg:rounded-2xl lg:shadow-pop"
        >
          {shows.length > 0 && (
            <div className="zone">
              <ZoneHead title="Which one is yours?" as="h2">
                <span>
                  {shows.length} {shows.length === 1 ? "match" : "matches"}
                </span>
              </ZoneHead>
              <ul className="flex flex-col">
                {shows.map((show, index) => (
                  <li
                    key={show.id}
                    className="rise border-b border-steel last:border-b-0"
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
                        <span className="block font-display text-xl leading-tight font-semibold">{show.title}</span>
                        {show.description && (
                          <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{show.description}</span>
                        )}
                      </span>
                      <span
                        className={`btn shrink-0 ${pending === show.id ? "btn-solid" : ""}`}
                        style={hue("var(--accent)")}
                      >
                        {pending === show.id ? "Opening…" : "Run Echo"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Below the list, next to the show the host just picked. */}
          {problems}
        </div>
      )}
    </div>
  );
}

function SidePanel({ search, children }: { search: Search; children: ReactNode }) {
  const count = search.state === "found" ? search.shows.length : null;
  return (
    <section aria-labelledby="show-results-title" className="fade flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4 px-3">
        <h2 id="show-results-title" className="tag text-ink-dim">
          {search.state === "searching" ? `Looking for “${search.query}”…` : "Which one is yours?"}
        </h2>
        {count !== null && count > 0 && (
          <span className="tag shrink-0 text-ink-dim">
            {count} {count === 1 ? "match" : "matches"}
          </span>
        )}
      </div>
      {search.state === "searching" ? <Placeholders /> : <div className="flex flex-col gap-4">{children}</div>}
    </section>
  );
}

function Placeholders() {
  return (
    <ul aria-hidden className="flex flex-col gap-1">
      {[0, 1, 2, 3, 4].map((index) => (
        <li
          key={index}
          className="fade flex items-center gap-4 px-3 py-2.5"
          style={{ "--order": index * 3 } as CSSProperties}
        >
          <span className="size-[60px] shrink-0 rounded-xl bg-ink/[0.06] motion-safe:animate-pulse" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-3/5 rounded-full bg-ink/[0.07] motion-safe:animate-pulse" />
            <span className="h-3 w-full rounded-full bg-ink/[0.05] motion-safe:animate-pulse" />
          </span>
        </li>
      ))}
    </ul>
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
