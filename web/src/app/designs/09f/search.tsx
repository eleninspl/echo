"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Show } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { useStart } from "@/lib/use-start";

import { Cover } from "./cover";
import { styles } from "./styles";
import { Bars } from "./wave";

type Search =
  | { state: "idle" }
  | { state: "searching"; query: string }
  | { state: "found"; query: string; shows: Show[] }
  | { state: "failed"; query: string; problem: HostError };

const SLAB = `${styles.slab} bg-(--v9f-black) text-(--v9f-ink) shadow-[0_24px_60px_-28px_rgb(23_10_21/0.9)]`;

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
    <div className="flex flex-col gap-4">
      <form id="find" onSubmit={submit} noValidate role="search" className="flex scroll-mt-8 flex-col gap-3">
        <label htmlFor="v9f-show" className={`${styles.wide} text-xs font-semibold tracking-[0.14em] uppercase`}>
          Find your show
        </label>
        <div
          className={`${SLAB} flex items-center gap-2 rounded-full p-2 pl-5 ring-(--v9f-amber) sm:pl-6 transition-shadow focus-within:ring-4`}
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-6 shrink-0 text-(--v9f-fit)" focusable="false">
            {[3, 7, 11, 15].map((x, index) => (
              <rect
                key={x}
                x={x - 1.25}
                y={10 - [3, 8, 5.5, 2.5][index]}
                width={2.5}
                height={[3, 8, 5.5, 2.5][index] * 2}
                rx={1.25}
                fill="currentColor"
              />
            ))}
          </svg>
          <input
            id="v9f-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Your podcast's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "v9f-show-hint" : "v9f-show-help"}
            className="min-w-0 flex-1 bg-transparent py-3.5 text-lg font-medium sm:text-xl text-(--v9f-ink) placeholder:text-(--v9f-dim) focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className={`${styles.poster} inline-flex min-h-13 shrink-0 items-center gap-2 rounded-full bg-(--v9f-ink) px-5 text-lg sm:min-h-14 sm:px-7 sm:text-xl text-(--v9f-black) uppercase transition-colors hover:bg-(--v9f-amber) disabled:cursor-wait`}
          >
            {searching ? (
              <>
                <Bars />
                Looking
              </>
            ) : (
              "Find it"
            )}
          </button>
        </div>
        {hint ? (
          <p
            id="v9f-show-hint"
            className="w-fit rounded-full bg-(--v9f-black) px-4 py-1.5 text-base font-semibold text-(--v9f-amber)"
          >
            {hint}
          </p>
        ) : (
          <p id="v9f-show-help" className="pl-6 text-base font-medium">
            Searches the podcasts Qloo knows. Press Enter to look.
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section aria-labelledby="v9f-which" className={`${SLAB} rounded-[30px] p-2 sm:p-3`}>
          <div className="flex items-baseline justify-between gap-4 px-3 pt-3 pb-2 sm:px-4">
            <h2 id="v9f-which" className={`${styles.poster} text-3xl uppercase sm:text-4xl`}>
              Which one is yours?
            </h2>
            <span className={`${styles.wide} shrink-0 text-xs font-semibold tracking-[0.12em] text-(--v9f-soft) uppercase`}>
              {search.shows.length} {search.shows.length === 1 ? "match" : "matches"}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {search.shows.map((show, index) => (
              <li key={show.id} className={styles.rise} style={{ "--order": index } as CSSProperties}>
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="group flex w-full items-center gap-4 rounded-[22px] p-3 text-left transition-colors hover:bg-(--v9f-plum-hi) disabled:cursor-wait"
                >
                  <Cover show={show} size={60} />
                  <span className="min-w-0 flex-1">
                    <span className={`${styles.poster} block text-2xl leading-none uppercase sm:text-[1.7rem]`}>
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-1.5 line-clamp-2 block text-base text-(--v9f-soft)">{show.description}</span>
                    )}
                  </span>
                  <span
                    className={`${styles.gradientFill} ${styles.poster} inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-lg text-(--v9f-black) uppercase transition-[filter] group-hover:brightness-110 group-disabled:opacity-60`}
                  >
                    {pending === show.id ? (
                      <>
                        <Bars />
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
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <Trouble problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

function Trouble({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div role="alert" className={`${SLAB} flex gap-4 rounded-[30px] p-5 sm:p-6`}>
      <svg aria-hidden viewBox="0 0 40 40" className="mt-1 size-10 shrink-0" focusable="false">
        <circle cx={20} cy={20} r={18} fill="none" stroke={notice ? "#bba2b0" : "#ff5c93"} strokeWidth={2} />
        <path
          d="M7 20h7l2-5 3 10 2-5h12"
          fill="none"
          stroke={notice ? "#bba2b0" : "#ff5c93"}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex min-w-0 flex-col gap-2">
        <h2
          className={`${styles.poster} text-2xl leading-none uppercase sm:text-3xl ${notice ? "text-(--v9f-ink)" : "text-(--v9f-love)"}`}
        >
          {problem.title}
        </h2>
        <p className="text-base text-(--v9f-soft)">{problem.message}</p>
        {problem.next === "featured" && <FeaturedPicks />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`${styles.poster} mt-1 self-start rounded-full bg-(--v9f-ink) px-6 py-2 text-lg text-(--v9f-black) uppercase hover:bg-(--v9f-amber)`}
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
      <h3 className={`${styles.wide} text-xs font-semibold tracking-[0.12em] text-(--v9f-soft) uppercase`}>
        Or open a show Echo has run
      </h3>
      <ul className="flex flex-col gap-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 rounded-2xl p-1.5 pr-3 hover:bg-(--v9f-plum-hi)"
            >
              <Cover show={show} size={40} />
              <span className={`${styles.poster} text-xl uppercase group-hover:underline`}>{show.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
