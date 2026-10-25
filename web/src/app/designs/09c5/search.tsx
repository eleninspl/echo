"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";
import { runHref } from "./palette";

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
    <div className="flex flex-col">
      <form id="search" onSubmit={submit} noValidate role="search" className="scroll-mt-6">
        <label htmlFor="w5-show" className="block text-[0.95rem] font-semibold">
          Your show
        </label>
        <div className="w5-field mt-2 flex border-[1.5px] border-(--w5-ink) bg-(--w5-paper)">
          <input
            id="w5-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Podcast name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "w5-show-hint" : undefined}
            className="w5-serif min-w-0 flex-1 bg-transparent px-4 py-3 text-[1.2rem] text-(--w5-ink) placeholder:text-(--w5-muted) focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="shrink-0 bg-(--w5-ink) px-5 text-[0.98rem] font-semibold text-(--w5-ground) transition-colors hover:bg-[#4a2350] disabled:cursor-wait sm:px-7"
          >
            {searching ? "Searching" : "Search"}
          </button>
        </div>
        <div aria-hidden className={`h-[2px] ${searching ? "w5-progress" : ""}`} />
        {hint && (
          <p id="w5-show-hint" className="mt-2 flex items-center gap-2 text-[0.95rem] font-semibold">
            <span aria-hidden className="size-1.5 bg-(--w5-ink)" />
            {hint}
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Searching for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="w5-which" className="mt-7">
          <div className="border-b-2 border-(--w5-ink) pb-2">
            <h2 id="w5-which" className="w5-serif text-[1.45rem] leading-tight font-medium">
              Which one is yours?
            </h2>
            <p className="w5-numbers mt-0.5 text-[0.88rem] text-(--w5-muted)">
              {search.shows.length} {search.shows.length === 1 ? "show matches" : "shows match"} “{search.query}”
            </p>
          </div>
          <ul>
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className="w5-rise flex items-center gap-4 border-b border-(--w5-line) py-3.5"
                style={{ "--order": index } as CSSProperties}
              >
                <Cover show={show} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="w5-serif text-[1.15rem] leading-snug font-medium">{show.title}</p>
                  {show.description && (
                    <p className="mt-0.5 line-clamp-2 text-[0.9rem] leading-snug text-(--w5-soft)">
                      {show.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  aria-label={`Run Echo on ${show.title}`}
                  className={`relative shrink-0 overflow-hidden border-[1.5px] border-(--w5-ink) px-3.5 py-2 text-[0.9rem] font-semibold transition-colors disabled:cursor-wait ${
                    pending === show.id
                      ? "bg-(--w5-ink) text-(--w5-ground)"
                      : "text-(--w5-ink) hover:bg-(--w5-ink) hover:text-(--w5-ground) disabled:opacity-40"
                  }`}
                >
                  {pending === show.id ? "Starting…" : "Run Echo"}
                  {pending === show.id && <span aria-hidden className="w5-progress absolute inset-x-0 bottom-0 h-[2px]" />}
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
            message: `Qloo doesn't know “${search.query}”, or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <Trouble problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

function Trouble({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  return (
    <div role="alert" className="mt-7 border-l-2 border-(--w5-ink) py-1 pl-4">
      <h2 className="w5-serif text-[1.3rem] leading-tight font-medium">{problem.title}</h2>
      <p className="mt-1.5 max-w-[52ch] text-[0.95rem] leading-snug text-(--w5-soft)">{problem.message}</p>
      {problem.next === "featured" && <FeaturedPicks />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 border-[1.5px] border-(--w5-ink) px-3.5 py-1.5 text-[0.9rem] font-semibold hover:bg-(--w5-ink) hover:text-(--w5-ground)"
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
      <h3 className="text-[0.9rem] font-semibold">Or open a show Echo has already run</h3>
      <ul className="mt-2 flex flex-col">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link href={runHref(analysis_id)} className="group flex items-center gap-3 py-1.5">
              <Cover show={show} size={30} />
              <span className="w5-serif text-[1.05rem] font-medium underline decoration-(--w5-line-strong) decoration-1 underline-offset-4 group-hover:decoration-(--w5-ink)">
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
