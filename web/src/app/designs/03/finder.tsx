"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { s } from "./styles";
import { Cover, Led } from "./parts";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

export function Finder() {
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
    <div className="flex flex-col gap-2.5">
      <label htmlFor="show-03" className={`${s.label} flex items-center gap-2 text-[0.75rem]`}>
        <span>Show name</span>
        <span aria-hidden className={`${s.seam} flex-1`} />
        <span className="text-(--print-soft)">Podcasts in Qloo</span>
      </label>
      <div className="flex items-start gap-3">
        <div className={`${s.screen} ${s.dotGrid} min-w-0 flex-1 overflow-hidden rounded-[14px]`}>
          <form id="find-03" role="search" onSubmit={submit} noValidate className="flex flex-col">
            <div className="flex items-center gap-3 px-4 pt-4 pb-2 sm:px-5">
              <span aria-hidden className={`${s.mono} text-xl font-bold text-(--orange)`}>
                &gt;
              </span>
              <input
                id="show-03"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
                placeholder="Your podcast's name"
                aria-invalid={hint !== null}
                aria-describedby="find-03-status"
                className={`${s.mono} min-w-0 flex-1 bg-transparent py-1 text-lg text-(--lcd) caret-(--orange) placeholder:text-(--lcd-dim) focus:outline-none sm:text-xl [&::-webkit-search-cancel-button]:hidden`}
              />
            </div>
            <StatusLine search={search} hint={hint} />
          </form>

          {search.state === "found" && search.shows.length > 0 && (
            <section aria-labelledby="pick-03" className="border-t border-(--screen-line)">
              <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
                <h2 id="pick-03" className={`${s.dot} text-xl font-black uppercase sm:text-2xl`}>
                  Which one is yours?
                </h2>
                <span className={`${s.mono} shrink-0 text-[0.6875rem] text-(--lcd-dim) uppercase`}>
                  {search.shows.length} {search.shows.length === 1 ? "match" : "matches"}
                </span>
              </div>
              <ul className="flex flex-col pb-2">
                {search.shows.map((show, index) => (
                  <li
                    key={show.id}
                    className={`${s.appear} border-t border-dashed border-(--screen-line) first:border-t-0`}
                    style={{ "--order": index } as CSSProperties}
                  >
                    <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                      <Cover show={show} size={52} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[1.0625rem] leading-tight font-semibold">{show.title}</p>
                        {show.description && (
                          <p className={`${s.mono} mt-1 line-clamp-2 text-xs leading-snug text-(--lcd-dim)`}>
                            {show.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => start(show.id)}
                        disabled={pending !== null}
                        aria-label={`Run Echo on ${show.title}`}
                        className={`${s.label} shrink-0 rounded-[8px] px-3 py-2.5 text-[0.75rem] disabled:cursor-wait ${
                          pending === show.id ? "bg-(--orange) text-(--print)" : `${s.softKey} disabled:opacity-40`
                        }`}
                      >
                        {pending === show.id ? <span className={s.blink}>Opening</span> : "Run Echo"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {startError && <Alert problem={describe(startError)} />}

          {search.state === "found" && search.shows.length === 0 && (
            <Alert
              problem={{
                code: "show_unusable",
                title: "Echo can't analyse this show yet",
                message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
                next: "featured",
              }}
            />
          )}

          {search.state === "failed" && <Alert problem={search.problem} onRetry={() => find(search.query)} />}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="submit"
            form="find-03"
            disabled={searching}
            className={`${s.keyOrange} ${s.label} flex size-16 flex-col items-center justify-center gap-1.5 rounded-[14px] text-[0.8125rem] sm:size-[4.75rem]`}
          >
            <Led on={searching} className="size-1.5" />
            <span>{searching ? "Wait" : "Find"}</span>
          </button>
          <span aria-hidden className={`${s.label} text-[0.625rem] text-(--print-soft)`}>
            Enter ↵
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusLine({ search, hint }: { search: Search; hint: string | null }) {
  const text = hint
    ? hint
    : search.state === "searching"
      ? `Looking for "${search.query}"`
      : search.state === "found"
        ? `${search.shows.length} ${search.shows.length === 1 ? "show" : "shows"} found for "${search.query}"`
        : search.state === "failed"
          ? "Search failed"
          : "Ready. Type a show, press Enter.";
  return (
    <div className="relative flex items-center gap-2 px-4 pt-1 pb-3.5 sm:px-5">
      <Led on={hint !== null || search.state === "searching"} onScreen className="size-1.5" />
      <p
        id="find-03-status"
        aria-live="polite"
        className={`${s.mono} min-w-0 truncate text-[0.6875rem] uppercase ${hint ? "text-(--orange)" : "text-(--lcd-dim)"}`}
      >
        {text}
      </p>
      {search.state === "searching" && (
        <span aria-hidden className="absolute right-0 bottom-0 left-0 h-[2px] overflow-hidden">
          <span className={`${s.scan} block h-full w-1/4 bg-(--orange)`} />
        </span>
      )}
    </div>
  );
}

function Alert({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div role="alert" className="flex flex-col gap-2 border-t border-(--screen-line) px-4 py-4 sm:px-5">
      <p className={`${s.label} flex items-center gap-2 text-[0.6875rem] text-(--lcd-dim)`}>
        <Led on={!notice} onScreen className="size-1.5" />
        {notice ? "Notice" : "Alert"}
      </p>
      <h2 className="text-xl leading-tight font-semibold">{problem.title}</h2>
      <p className={`${s.mono} text-xs leading-relaxed text-(--lcd-dim)`}>{problem.message}</p>
      {problem.next === "featured" && <FeaturedFallback />}
      {problem.next === "retry" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${s.softKey} ${s.label} mt-1 self-start rounded-[8px] px-3 py-2.5 text-[0.75rem]`}
        >
          Try again
        </button>
      )}
    </div>
  );
}

function FeaturedFallback() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-2">
      <h3 className={`${s.label} text-[0.6875rem] text-(--lcd-dim)`}>Or open a show Echo has run</h3>
      <ul className="flex flex-col gap-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="flex items-center gap-3 rounded-[8px] px-1 py-1 hover:bg-(--screen-hi)"
            >
              <Cover show={show} size={32} />
              <span className="font-semibold underline-offset-4 hover:underline">{show.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
