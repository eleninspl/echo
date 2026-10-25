"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

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
    <div className="flex flex-col gap-8">
      <form
        id="w6-find"
        onSubmit={submit}
        noValidate
        role="search"
        className="flex scroll-mt-10 flex-col gap-2.5"
      >
        <label
          htmlFor="w6-show"
          className="text-[0.9375rem] font-semibold text-(--w6-ink)"
        >
          Your show
        </label>
        <div className="w6-field flex items-stretch rounded-[3px] border-[1.5px] border-(--w6-ink) bg-(--w6-paper)">
          <input
            id="w6-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Podcast name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "w6-show-hint" : undefined}
            className="w6-serif min-w-0 flex-1 bg-transparent px-4 py-3 text-[1.375rem] text-(--w6-ink) placeholder:text-(--w6-dim) focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="shrink-0 bg-(--w6-ink) px-6 text-[1rem] font-semibold text-(--w6-on-ink) transition-colors hover:bg-[#46224f] disabled:cursor-wait sm:px-8"
          >
            {searching ? "Looking" : "Look up"}
          </button>
        </div>
        <div aria-hidden className="h-[2px]">
          {searching && <div className="w6-scan h-full bg-(--w6-rule)" />}
        </div>
        {hint && (
          <p
            id="w6-show-hint"
            className="-mt-1 text-[0.9375rem] font-semibold text-(--w6-ink)"
          >
            {hint}
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" &&
          `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="w6-which" className="-mt-2">
          <div className="flex items-baseline justify-between gap-4 border-b-[1.5px] border-(--w6-ink) pb-2">
            <h2
              id="w6-which"
              className="w6-serif text-[1.5rem] leading-tight font-medium"
            >
              Which one is yours?
            </h2>
            <span className="w6-figures text-[0.875rem] text-(--w6-dim)">
              {search.shows.length} on Qloo for “{search.query}”
            </span>
          </div>
          <ul>
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className="w6-rise border-b border-(--w6-rule)"
                style={{ "--w6-order": index } as CSSProperties}
              >
                <div className="flex items-center gap-4 py-3.5">
                  <Cover show={show} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="w6-serif text-[1.1875rem] leading-snug font-semibold">
                      {show.title}
                    </p>
                    {show.description && (
                      <p className="mt-0.5 line-clamp-2 text-[0.9375rem] leading-snug text-(--w6-soft)">
                        {show.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => start(show.id)}
                    disabled={pending !== null}
                    aria-label={`Run Echo on ${show.title}`}
                    className={`shrink-0 rounded-[3px] border-[1.5px] px-3.5 py-2 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors disabled:cursor-wait sm:px-4 ${
                      pending === show.id
                        ? "border-(--w6-ink) bg-(--w6-ink) text-(--w6-on-ink)"
                        : "border-(--w6-ink) text-(--w6-ink) hover:bg-(--w6-ink) hover:text-(--w6-on-ink) disabled:border-(--w6-rule-strong) disabled:text-(--w6-dim) disabled:hover:bg-transparent"
                    }`}
                  >
                    {pending === show.id ? "Starting…" : "Run Echo"}
                  </button>
                </div>
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
            message: `Qloo doesn't know “${search.query}”, or knows too little about its audience. Check the spelling, or try another show.`,
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
  const notice = problem.code === "not_implemented";
  return (
    <div
      role="alert"
      className={`-mt-2 border-l-[3px] py-1 pl-5 ${notice ? "border-(--w6-rule-strong)" : "border-(--w6-ink)"}`}
    >
      <h2 className="w6-serif text-[1.375rem] leading-tight font-semibold">
        {problem.title}
      </h2>
      <p className="mt-1.5 max-w-[52ch] leading-relaxed text-(--w6-soft)">
        {problem.message}
      </p>
      {problem.next === "featured" && <FeaturedPicks />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-[3px] border-[1.5px] border-(--w6-ink) px-4 py-1.5 text-[0.9375rem] font-semibold hover:bg-(--w6-ink) hover:text-(--w6-on-ink)"
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
    <div className="mt-4">
      <h3 className="text-[0.9375rem] font-semibold">
        Or open a show Echo has already run
      </h3>
      <ul className="mt-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 py-1.5"
            >
              <Cover show={show} size={32} />
              <span className="w6-serif text-[1.0625rem] font-semibold group-hover:underline">
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
