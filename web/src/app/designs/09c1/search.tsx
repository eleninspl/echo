"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";
import { styles } from "./styles";

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
      setHint("Type at least two letters of the name.");
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
        className="scroll-mt-8"
      >
        <label
          htmlFor="w1-show"
          className="mb-2 block text-[0.95rem] font-semibold"
        >
          Your show
        </label>
        <div
          className={`flex border-[1.5px] bg-(--w1-paper) has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-(--w1-ink) ${hint ? "border-(--w1-ink) shadow-[inset_0_0_0_1.5px_var(--w1-ink)]" : "border-(--w1-ink)"}`}
        >
          <input
            id="w1-show"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (hint && event.target.value.trim().length >= 2) setHint(null);
            }}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Podcast name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "w1-show-hint" : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent px-4 text-[1.0625rem] text-(--w1-ink) placeholder:text-(--w1-dim) focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="h-14 shrink-0 bg-(--w1-ink) px-6 text-[0.95rem] font-semibold text-(--w1-on-ink) transition-colors hover:bg-[#46204f] disabled:cursor-wait"
          >
            {searching ? "Searching" : "Search"}
          </button>
        </div>
        {hint && (
          <p
            id="w1-show-hint"
            className="mt-2 text-[0.95rem] font-semibold text-(--w1-ink)"
          >
            {hint}
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Searching for ${search.query}.`}
        {search.state === "found" &&
          `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {searching && (
        <div className="mt-7">
          <div className={`${styles.scan} h-[1.5px] bg-(--w1-line)`} />
          <p className="mt-3 text-[0.95rem] text-(--w1-soft)">
            Searching Qloo for &ldquo;{search.query}&rdquo;
          </p>
        </div>
      )}

      {search.state === "found" && search.shows.length > 0 && (
        <section
          aria-labelledby="w1-which"
          className="mt-7 border-t-[1.5px] border-(--w1-ink)"
        >
          <div className="flex items-baseline justify-between gap-4 py-3">
            <h2
              id="w1-which"
              className={`${styles.wide} text-[1.25rem] leading-tight font-semibold tracking-[-0.01em]`}
            >
              Which one is yours?
            </h2>
            <span className={`${styles.num} text-[0.9rem] text-(--w1-dim)`}>
              {search.shows.length}{" "}
              {search.shows.length === 1 ? "show" : "shows"} for &ldquo;
              {search.query}&rdquo;
            </span>
          </div>
          <ul className="border-t border-(--w1-line)">
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className={`${styles.rise} border-b border-(--w1-line)`}
                style={{ "--order": index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  aria-label={`Run Echo on ${show.title}`}
                  className="group flex w-full items-center gap-4 py-3 text-left disabled:cursor-wait"
                >
                  <Cover show={show} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.0625rem] leading-snug font-semibold decoration-1 underline-offset-4 group-hover:underline">
                      {show.title}
                    </span>
                    {show.description && (
                      <span
                        className={`${styles.serif} mt-0.5 line-clamp-2 block text-[1rem] leading-snug text-(--w1-soft)`}
                      >
                        {show.description}
                      </span>
                    )}
                  </span>
                  <span
                    className={`inline-flex h-10 shrink-0 items-center border border-(--w1-ink) px-4 text-[0.9rem] font-semibold transition-colors ${
                      pending === show.id
                        ? "bg-(--w1-ink) text-(--w1-on-ink)"
                        : "group-hover:bg-(--w1-ink) group-hover:text-(--w1-on-ink) group-disabled:opacity-40"
                    }`}
                  >
                    {pending === show.id ? "Starting…" : "Run Echo"}
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
            title: "Echo can’t analyse this show yet",
            message: `Qloo doesn’t know “${search.query}”, or knows too little about its audience. Check the spelling, or try another show.`,
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

const curl = (text: string) => text.replace(/'/g, "’");

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
      className="mt-7 flex flex-col gap-2 border-t-[1.5px] border-(--w1-ink) pt-3"
    >
      <h2
        className={`${styles.wide} text-[1.25rem] leading-tight font-semibold tracking-[-0.01em]`}
      >
        {curl(problem.title)}
      </h2>
      <p
        className={`${styles.serif} max-w-[52ch] text-[1.0625rem] leading-[1.45] text-(--w1-soft)`}
      >
        {curl(problem.message)}
      </p>
      {problem.next === "featured" && <FeaturedPicks />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex h-10 items-center self-start border border-(--w1-ink) px-4 text-[0.9rem] font-semibold hover:bg-(--w1-ink) hover:text-(--w1-on-ink)"
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
    <div className="mt-3">
      <h3 className="text-[0.95rem] font-semibold">
        Or open a show Echo has run
      </h3>
      <ul className="mt-2 border-t border-(--w1-line)">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id} className="border-b border-(--w1-line)">
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 py-2"
            >
              <Cover show={show} size={36} />
              <span className="text-[0.95rem] font-semibold decoration-1 underline-offset-4 group-hover:underline">
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
