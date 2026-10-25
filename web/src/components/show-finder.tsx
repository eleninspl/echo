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
import Image from "next/image";
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
            {shows.length > 0 && <Matches shows={shows} pending={pending} onRun={start} />}
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

const MARK: CSSProperties = { mask: "url(/logo-mark.svg) center / contain no-repeat" };

function SidePanel({ search, children }: { search: Search; children: ReactNode }) {
  const count = search.state === "found" ? search.shows.length : null;
  const searching = search.state === "searching";
  return (
    <section aria-labelledby="show-results-title" className="fade flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 pr-3 pl-1">
        <h2 id="show-results-title" className="tag flex min-w-0 items-center gap-3 text-ink-soft">
          {searching ? (
            <Equalizer />
          ) : (
            <span aria-hidden className="size-4 shrink-0 bg-linear-to-br from-fit via-love to-reach" style={MARK} />
          )}
          <span className="truncate">{searching ? `Listening for “${search.query}”…` : "Which one is yours?"}</span>
        </h2>
        {count !== null && count > 0 && (
          <span className="tag shrink-0 text-ink-dim">
            {count} {count === 1 ? "match" : "matches"}
          </span>
        )}
      </div>
      {searching ? <Placeholders /> : <div className="flex flex-col gap-4">{children}</div>}
    </section>
  );
}

function along(index: number, total: number): string {
  const at = total > 1 ? index / (total - 1) : 0;
  return at <= 0.5
    ? `color-mix(in srgb, var(--love) ${Math.round(at * 200)}%, var(--fit))`
    : `color-mix(in srgb, var(--reach) ${Math.round((at - 0.5) * 200)}%, var(--love))`;
}

function Matches({ shows, pending, onRun }: { shows: Show[]; pending: string | null; onRun: (id: string) => void }) {
  return (
    <ol className="relative flex flex-col gap-1.5 pl-7">
      <span
        aria-hidden
        className="rail absolute top-0 bottom-8 left-[11px] w-0.5 rounded-full bg-linear-to-b from-fit via-love to-reach opacity-50"
      />
      {shows.map((show, index) => {
        const top = index === 0;
        const opening = pending === show.id;
        return (
          <li
            key={show.id}
            className="surface"
            style={{ "--order": index + 1, "--dot": along(index, shows.length) } as CSSProperties}
          >
            <button
              type="button"
              onClick={() => onRun(show.id)}
              disabled={pending !== null}
              className="group relative flex w-full items-center gap-4 rounded-2xl px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-300 hover:bg-[color-mix(in_srgb,var(--brand)_9%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--brand)_9%,transparent)] disabled:cursor-wait"
            >
              <span
                aria-hidden
                className={`absolute top-1/2 -left-[21px] size-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--dot)] transition-[background-color,box-shadow] duration-300 group-hover:bg-[var(--dot)] group-hover:shadow-[0_0_14px_var(--dot)] group-focus-visible:bg-[var(--dot)] ${
                  opening ? "bg-[var(--dot)] shadow-[0_0_14px_var(--dot)]" : "bg-void"
                }`}
              />
              <span className="relative shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">
                {show.image_url && (
                  <Image
                    aria-hidden
                    src={show.image_url}
                    alt=""
                    fill
                    unoptimized
                    className={`scale-125 rounded-2xl object-cover blur-2xl transition-opacity duration-500 ${
                      top ? "opacity-50" : "opacity-0 group-hover:opacity-40"
                    }`}
                  />
                )}
                <span className="relative block">
                  <ShowCover show={show} size={top ? 84 : 58} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                {top && (
                  <span className="tag mb-1 flex items-center gap-1.5 text-sweet">
                    <span aria-hidden className="size-1.5 rounded-full bg-sweet" />
                    Top match
                  </span>
                )}
                <span
                  className={`line-clamp-2 font-display leading-snug font-semibold text-balance ${top ? "text-xl" : "text-lg"}`}
                >
                  {show.title}
                </span>
                {show.description && (
                  <span
                    className={`mt-0.5 text-sm leading-snug text-ink-soft ${top ? "line-clamp-2" : "line-clamp-1"}`}
                  >
                    {show.description}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ring-1 transition-[background-color,color,box-shadow] duration-300 group-hover:bg-brand group-hover:text-[color:var(--on-brand)] group-hover:ring-transparent group-focus-visible:bg-brand group-focus-visible:text-[color:var(--on-brand)] ${
                  opening
                    ? "bg-brand text-[color:var(--on-brand)] ring-transparent motion-safe:animate-pulse"
                    : "text-ink-soft ring-ink/15"
                }`}
              >
                <svg
                  viewBox="0 0 12 12"
                  className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <span className="sr-only">{opening ? `Opening ${show.title}` : `Run Echo on ${show.title}`}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Equalizer() {
  return (
    <span aria-hidden className="eq flex h-4 shrink-0 items-end gap-[3px]">
      {["var(--fit)", "var(--love)", "var(--reach)", "var(--love)"].map((color, index) => (
        <span
          key={index}
          className="h-full w-[3px] rounded-full"
          style={{ background: color, "--order": index } as CSSProperties}
        />
      ))}
    </span>
  );
}

function Placeholders() {
  return (
    <ul aria-hidden className="flex flex-col gap-1.5 pl-7">
      {[0, 1, 2, 3, 4].map((index) => (
        <li
          key={index}
          className="fade flex items-center gap-4 px-3 py-2.5"
          style={{ "--order": index * 3 } as CSSProperties}
        >
          <span className={`shimmer shrink-0 rounded-xl ${index === 0 ? "size-[84px]" : "size-[58px]"}`} />
          <span className="flex flex-1 flex-col gap-2">
            <span className="shimmer h-4 w-3/5 rounded-full" />
            <span className="shimmer h-3 w-full rounded-full" />
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
