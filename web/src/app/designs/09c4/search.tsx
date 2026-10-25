"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";
import { Pulse } from "./marks";

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
      setHint("Give Qloo at least two letters of the name.");
      return;
    }
    setHint(null);
    find(text);
  }

  const searching = search.state === "searching";

  return (
    <div className="flex flex-col gap-8">
      <form
        id="w4-find"
        onSubmit={submit}
        noValidate
        role="search"
        className="flex scroll-mt-8 flex-col gap-2.5"
      >
        <label
          htmlFor="w4-show"
          className="text-[0.95rem] font-semibold text-(--w4-ink)"
        >
          Which show do you host?
        </label>
        <div className="flex h-16 items-stretch border-2 border-(--w4-ink) bg-(--w4-paper) focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-(--w4-ink)">
          <input
            id="w4-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Your podcast's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "w4-show-hint" : undefined}
            className="w4-field min-w-0 flex-1 bg-transparent px-4 text-lg text-(--w4-ink) placeholder:text-(--w4-dim) sm:px-5 sm:text-xl"
          />
          <button
            type="submit"
            disabled={searching}
            className="w4-press flex shrink-0 items-center justify-center gap-2.5 bg-(--w4-ink) px-5 text-lg font-semibold text-(--w4-ground) disabled:cursor-wait sm:min-w-44 sm:px-7"
          >
            {searching ? (
              <>
                <Pulse className="size-6" />
                Searching
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>
        {hint && (
          <p
            id="w4-show-hint"
            className="text-[0.95rem] font-semibold text-(--w4-ink)"
          >
            {hint}
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Searching Qloo for ${search.query}.`}
        {search.state === "found" &&
          `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="w4-which" className="flex flex-col">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-(--w4-ink) pb-2.5">
            <h2
              id="w4-which"
              className="w4-narrow text-[1.65rem] leading-none font-semibold"
            >
              Which one is yours?
            </h2>
            <p className="text-[0.95rem] text-(--w4-soft)">
              <span className="w4-figures">{search.shows.length}</span>{" "}
              {search.shows.length === 1 ? "show matches" : "shows match"}{" "}
              <span className="text-(--w4-ink)">“{search.query}”</span>
            </p>
          </div>
          <ul>
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className="w4-rise border-b border-(--w4-rule)"
                style={{ "--w4-order": index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="group grid w-full grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-4 text-left disabled:cursor-wait sm:grid-cols-[56px_minmax(0,1fr)_auto]"
                >
                  <Cover show={show} size={56} />
                  <span className="min-w-0">
                    <span className="w4-narrow block text-xl leading-tight font-semibold">
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-1 line-clamp-2 block text-[0.95rem] leading-snug text-(--w4-soft)">
                        {show.description}
                      </span>
                    )}
                  </span>
                  <span
                    className={`col-start-2 inline-flex h-10 w-fit items-center gap-2 border-[1.5px] border-(--w4-ink) px-4 font-semibold transition-colors sm:col-start-3 ${
                      pending === show.id
                        ? "bg-(--w4-ink) text-(--w4-ground)"
                        : "group-hover:bg-(--w4-ink) group-hover:text-(--w4-ground) group-disabled:opacity-40"
                    }`}
                  >
                    {pending === show.id ? (
                      <>
                        <Pulse className="size-4" />
                        Starting
                      </>
                    ) : (
                      "Run Echo"
                    )}
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
            title: `Qloo doesn't know “${search.query}”`,
            message:
              "Or it knows too little about the show's audience to score guests. Check the spelling, or try the name the show is listed under.",
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
      className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-4 border-t-2 border-(--w4-ink) pt-4"
    >
      <svg
        aria-hidden
        viewBox="0 0 28 28"
        className="mt-0.5 size-7"
        focusable="false"
      >
        <circle
          cx={14}
          cy={14}
          r={9}
          fill="none"
          stroke="currentColor"
          strokeWidth={4.4}
        />
        <path d="M4 24 24 4" stroke="currentColor" strokeWidth={2} />
      </svg>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="w4-narrow text-[1.5rem] leading-tight font-semibold">
          {problem.title}
        </h2>
        <p className="max-w-[52ch] leading-snug text-(--w4-soft)">
          {problem.message}
        </p>
        {problem.next === "featured" && <FeaturedPicks />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 h-10 w-fit border-[1.5px] border-(--w4-ink) px-4 font-semibold hover:bg-(--w4-ink) hover:text-(--w4-ground)"
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
    <div className="mt-2 flex flex-col gap-2">
      <h3 className="text-[0.95rem] font-semibold">
        Or open a show Echo has already run
      </h3>
      <ul className="flex flex-col">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id} className="border-t border-(--w4-rule)">
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 py-2"
            >
              <Cover show={show} size={36} />
              <span className="w4-narrow text-lg font-semibold underline-offset-4 group-hover:underline">
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
