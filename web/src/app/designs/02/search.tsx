"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import styles from "./classes";
import { DISPLAY, GRID } from "./grid";
import { Cover } from "./parts";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

export function Finder({ figure }: { figure: ReactNode }) {
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const inFlight = useRef<AbortController | null>(null);
  const answer = useRef<HTMLDivElement | null>(null);
  const { start, pending, error: startError } = useStart();

  useEffect(() => {
    if (search.state !== "found" && search.state !== "failed") return;
    const target = answer.current;
    if (!target || target.getBoundingClientRect().top < window.innerHeight * 0.75) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [search]);

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
    <>
      <div id="d02-search" className="col-span-full mt-12 flex flex-col gap-10 md:col-span-6 md:mt-16 lg:col-span-5 lg:col-start-1 lg:row-start-2">
        <p className="max-w-[34ch] text-[clamp(1.125rem,1.5vw,1.375rem)] leading-[1.35]">
          Name your show. Echo reads what your listeners love in Qloo&apos;s taste data, then ranks guests they will
          love whose own fans will love your show back.
        </p>
        <form role="search" onSubmit={submit} noValidate className="flex flex-col gap-3">
          <label htmlFor="d02-show" className="flex items-baseline gap-4 text-[15px] font-bold">
            <span className="text-(--red)">01</span>
            <span>Find your show</span>
          </label>
          <div className={`${styles.field} relative flex items-stretch border-b-[3px] border-(--ink)`}>
            <input
              id="d02-show"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              placeholder="The podcast's name"
              aria-invalid={hint !== null}
              aria-describedby={hint ? "d02-hint" : undefined}
              className={`${styles.search} min-h-16 min-w-0 flex-1 bg-transparent py-2 pr-3 text-[clamp(1.5rem,2.4vw,2.25rem)] font-medium tracking-[-0.02em]`}
            />
            <button
              type="submit"
              disabled={searching}
              className="my-2 flex min-w-32 items-center justify-between gap-6 bg-(--ink) px-5 text-[17px] font-bold text-(--paper) transition-colors hover:bg-(--red) disabled:cursor-wait disabled:bg-(--red)"
            >
              <span>{searching ? "Looking" : "Find it"}</span>
              <span aria-hidden>→</span>
            </button>
            {searching && (
              <span aria-hidden className="absolute right-0 -bottom-[3px] left-0 h-[3px] overflow-hidden">
                <span className={`${styles.scan} block h-full w-full bg-(--red)`} />
              </span>
            )}
          </div>
          {hint ? (
            <p id="d02-hint" className="text-[15px] font-bold text-(--red)">
              {hint}
            </p>
          ) : (
            <p className="text-[15px] text-(--grey)">Press Enter to search the podcasts Qloo knows.</p>
          )}
        </form>
      </div>

      <div className="col-span-full mt-16 md:col-span-6 md:col-start-7 md:mt-16 md:self-end lg:row-span-2 lg:row-start-1 lg:mt-0">
        {figure}
      </div>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      <div ref={answer} className="col-span-full scroll-mt-6 lg:row-start-3">
        {searching && (
          <div className={`${GRID} mt-24 border-t-2 border-(--ink) pt-5`}>
            <p className="col-span-full text-[15px] font-bold md:col-span-9 md:col-start-3">
              Looking for &ldquo;{search.query}&rdquo; in Qloo<span className="text-(--red)">…</span>
            </p>
          </div>
        )}

        {search.state === "found" && search.shows.length > 0 && (
          <section aria-labelledby="d02-matches" className="mt-24">
            <div className={`${GRID} gap-y-3 border-t-2 border-(--ink) pt-5`}>
              <p aria-hidden className={`${DISPLAY} col-span-1 text-[clamp(2.25rem,5.4vw,5.25rem)] leading-[0.92] text-(--red) md:col-span-2`}>
                ?
              </p>
              <h2 id="d02-matches" className={`${DISPLAY} col-span-3 text-[clamp(2.25rem,5.4vw,5.25rem)] leading-[0.92] md:col-span-7`}>
                Which one is yours?
              </h2>
              <p className="col-span-3 col-start-2 text-[15px] leading-snug md:col-span-3 md:col-start-10 md:pt-3">
                <span className="font-bold">
                  {search.shows.length} {search.shows.length === 1 ? "match" : "matches"}
                </span>{" "}
                for &ldquo;{search.query}&rdquo;. Pick yours and Echo starts the analysis.
              </p>
            </div>
            <ol className="mt-10 border-t border-(--ink)">
              {search.shows.map((show, index) => (
                <li
                  key={show.id}
                  className={`${styles.rise} ${GRID} items-center gap-y-4 border-b border-(--ink) py-5`}
                  style={{ "--order": index } as CSSProperties}
                >
                  <span className="col-span-1 self-start text-[15px] font-bold tabular-nums md:col-span-1">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Cover show={show} className="col-span-1 w-full max-w-20 md:col-span-1" />
                  <div className="col-span-2 min-w-0 md:col-span-7">
                    <h3 className="text-[clamp(1.375rem,2.4vw,2.25rem)] leading-[1.02] font-bold tracking-[-0.03em]">
                      {show.title}
                    </h3>
                    {show.description && (
                      <p className="mt-1.5 line-clamp-2 max-w-[60ch] text-[16px] leading-snug text-(--grey)">
                        {show.description}
                      </p>
                    )}
                  </div>
                  <div className="col-span-3 col-start-2 md:col-span-3 md:col-start-10 md:justify-self-end">
                    <button
                      type="button"
                      onClick={() => start(show.id)}
                      disabled={pending !== null}
                      aria-label={`Run Echo on ${show.title}`}
                      className={`flex min-h-12 w-full items-center justify-between gap-8 px-5 text-[17px] font-bold transition-colors disabled:cursor-wait md:w-auto ${
                        pending === show.id
                          ? "bg-(--red) text-(--paper)"
                          : "border-2 border-(--ink) text-(--ink) hover:bg-(--ink) hover:text-(--paper) disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-(--ink)"
                      }`}
                    >
                      <span>{pending === show.id ? "Opening" : "Run Echo"}</span>
                      <span aria-hidden>→</span>
                    </button>
                  </div>
                </li>
              ))}
            </ol>
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

        {search.state === "failed" && <Trouble problem={search.problem} onRetry={() => find(search.query)} />}
      </div>
    </>
  );
}

function Trouble({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div role="alert" className={`${GRID} mt-16 gap-y-4 border-t-[6px] pt-5 ${notice ? "border-(--ink)" : "border-(--red)"}`}>
      <p className={`col-span-full text-[15px] font-bold md:col-span-2 ${notice ? "" : "text-(--red)"}`}>
        {notice ? "Notice" : "Alert"}
      </p>
      <div className="col-span-full flex flex-col gap-4 md:col-span-8 md:col-start-3">
        <h2 className={`${DISPLAY} text-[clamp(2rem,4vw,3.5rem)] leading-[0.95] ${notice ? "" : "text-(--red)"}`}>
          {problem.title}
        </h2>
        <p className="max-w-[56ch] text-[18px] leading-snug">{problem.message}</p>
        {problem.next === "featured" && <FeaturedFallback />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-12 items-center gap-8 self-start border-2 border-(--ink) px-5 text-[17px] font-bold hover:bg-(--ink) hover:text-(--paper)"
          >
            <span>Try again</span>
            <span aria-hidden>→</span>
          </button>
        )}
      </div>
    </div>
  );
}

function FeaturedFallback() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-4">
      <h3 className="text-[15px] font-bold">Or open a show Echo has run</h3>
      <ul className="mt-3 border-t border-(--ink)">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id} className="border-b border-(--ink)">
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className={`${styles.row} flex items-center gap-4 py-3 hover:text-(--red)`}
            >
              <Cover show={show} className="w-10" />
              <span className="flex-1 text-[20px] font-bold tracking-[-0.02em]">{show.title}</span>
              <span aria-hidden className={styles.arrow}>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
