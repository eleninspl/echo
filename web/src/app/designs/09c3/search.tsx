"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";

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
  const field = useRef<HTMLInputElement>(null);
  const { start, pending, error: startError } = useStart();

  useEffect(() => {
    function jump(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      field.current?.focus();
    }
    window.addEventListener("keydown", jump);
    return () => window.removeEventListener("keydown", jump);
  }, []);

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

  function clear() {
    inFlight.current?.abort();
    setSearch({ state: "idle" });
    setQuery("");
    setHint(null);
    field.current?.focus();
  }

  const searching = search.state === "searching";

  return (
    <div className="mt-8 max-w-[52rem]">
      <form
        id="find"
        role="search"
        onSubmit={submit}
        noValidate
        className="scroll-mt-6"
      >
        <label
          htmlFor="w3-show"
          className="block text-[0.875rem] font-semibold"
        >
          Your show
        </label>
        <div className="mt-2 flex">
          <div className="relative min-w-0 flex-1">
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-(--w3-dim) sm:left-5"
              focusable="false"
            >
              <circle
                cx={8.5}
                cy={8.5}
                r={5.75}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
              />
              <path
                d="m13 13 4.5 4.5"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={field}
              id="w3-show"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              placeholder="Podcast name"
              aria-invalid={hint !== null}
              aria-describedby={hint ? "w3-what w3-hint" : "w3-what"}
              className="w3-field peer h-14 w-full rounded-l-[3px] border border-r-0 border-(--w3-rule) bg-(--w3-paper) pr-4 pl-11 text-[1.1875rem] text-(--w3-ink) sm:h-16 sm:pr-14 sm:pl-13 sm:text-[1.375rem]"
            />
            {!query && (
              <kbd
                aria-hidden
                title="Press / to search"
                className="pointer-events-none absolute top-1/2 right-4 hidden h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-[3px] border border-(--w3-rule) px-1.5 font-[inherit] text-[0.8125rem] text-(--w3-dim) peer-focus:hidden sm:flex"
              >
                /
              </kbd>
            )}
          </div>
          <button
            type="submit"
            disabled={searching}
            className="h-14 min-w-[6.5rem] shrink-0 rounded-r-[3px] bg-(--w3-ink) px-5 font-semibold text-(--w3-on-ink) transition-colors hover:bg-(--w3-ink-hover) disabled:cursor-wait sm:h-16 sm:min-w-[9rem] sm:px-8 sm:text-[1.0625rem]"
          >
            {searching ? "Searching" : "Search"}
          </button>
        </div>
        {hint && (
          <p
            id="w3-hint"
            className="mt-2.5 flex items-center gap-2 text-[0.9375rem] font-semibold"
          >
            <Alert />
            {hint}
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Searching for ${search.query}.`}
        {search.state === "found" &&
          `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "searching" && (
        <div className="mt-4 overflow-hidden rounded-[3px] border border-(--w3-line) bg-(--w3-paper)">
          <div className="w3-progress" />
          <p className="px-4 py-4 text-[0.9375rem] text-(--w3-soft) sm:px-5">
            Searching Qloo&apos;s podcasts for{" "}
            <span className="font-semibold text-(--w3-ink)">
              &ldquo;{search.query}&rdquo;
            </span>
          </p>
        </div>
      )}

      {search.state === "found" && search.shows.length > 0 && (
        <section
          aria-labelledby="w3-which"
          className="mt-4 rounded-[3px] border border-(--w3-line) bg-(--w3-paper)"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-(--w3-line) px-4 py-3 sm:px-5">
            <h2 id="w3-which" className="text-[1.0625rem] font-semibold">
              Which one is yours?
            </h2>
            <p className="flex items-baseline gap-3 text-[0.875rem] text-(--w3-dim)">
              <span className="tabular-nums">
                {search.shows.length}{" "}
                {search.shows.length === 1 ? "show" : "shows"} for &ldquo;
                {search.query}&rdquo;
              </span>
              <button
                type="button"
                onClick={clear}
                className="font-semibold text-(--w3-ink) underline decoration-(--w3-rule) underline-offset-[3px] hover:decoration-(--w3-ink)"
              >
                Clear
              </button>
            </p>
          </div>
          <ul>
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className="w3-enter grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-(--w3-line) px-4 py-3.5 last:border-b-0 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:px-5"
                style={{ "--order": index } as CSSProperties}
              >
                <Cover show={show} size={48} />
                <div className="min-w-0">
                  <h3 className="w3-serif text-[1.1875rem] leading-snug font-medium">
                    {show.title}
                  </h3>
                  {show.description && (
                    <p className="mt-0.5 line-clamp-2 text-[0.875rem] leading-snug text-(--w3-soft)">
                      {show.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  aria-label={`Run Echo on ${show.title}`}
                  className={`col-start-2 inline-flex h-10 items-center justify-self-start rounded-[3px] border px-4 text-[0.9375rem] font-semibold transition-colors sm:col-start-auto sm:justify-self-end ${
                    pending === show.id
                      ? "cursor-wait border-(--w3-ink) bg-(--w3-ink) text-(--w3-on-ink)"
                      : "border-(--w3-ink) text-(--w3-ink) hover:bg-(--w3-ink) hover:text-(--w3-on-ink) disabled:cursor-wait disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-(--w3-ink)"
                  }`}
                >
                  {pending === show.id ? "Starting the run…" : "Run Echo"}
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
            title: `No show called “${search.query}” in Qloo`,
            message:
              "Qloo doesn't know it, or knows too little about its audience. Check the spelling, or try the name as it appears in podcast apps.",
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

function Alert() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-4 shrink-0"
      focusable="false"
    >
      <rect width={16} height={16} rx={2} fill="currentColor" />
      <path
        d="M8 4v5"
        stroke="#fffaf6"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx={8} cy={11.75} r={1.05} fill="#fffaf6" />
    </svg>
  );
}

function Trouble({
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
      className={`mt-4 rounded-[3px] border border-(--w3-line) bg-(--w3-paper) px-4 py-4 sm:px-5 ${notice ? "" : "border-l-[3px] border-l-(--w3-ink)"}`}
    >
      <h2 className="flex items-center gap-2 text-[1.0625rem] font-semibold">
        {!notice && <Alert />}
        {problem.title}
      </h2>
      <p className="mt-1 max-w-[60ch] text-[0.9375rem] text-(--w3-soft)">
        {problem.message}
      </p>
      {problem.next === "featured" && <FeaturedPicks />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 h-10 rounded-[3px] border border-(--w3-ink) px-4 text-[0.9375rem] font-semibold hover:bg-(--w3-ink) hover:text-(--w3-on-ink)"
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
    <div className="mt-4 border-t border-(--w3-line) pt-3">
      <h3 className="text-[0.875rem] font-semibold text-(--w3-soft)">
        Or open a show Echo has run
      </h3>
      <ul className="mt-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group -mx-2 flex items-center gap-3 rounded-[3px] px-2 py-1.5 hover:bg-(--w3-well)"
            >
              <Cover show={show} size={32} />
              <span className="w3-serif text-[1.0625rem] font-medium group-hover:underline">
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
