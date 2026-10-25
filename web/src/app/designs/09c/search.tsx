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
    <div className="flex flex-col gap-5">
      <form
        id="find"
        onSubmit={submit}
        noValidate
        role="search"
        className="flex scroll-mt-8 flex-col gap-3"
      >
        <label
          htmlFor="v9c-show"
          className="text-[0.95rem] font-semibold text-(--v9c-ink)"
        >
          Find your show
        </label>
        <div className="flex items-center gap-2 rounded-full bg-(--v9c-paper) p-1.5 pl-5 shadow-[0_22px_44px_-26px_rgb(219_43_110/0.55)] ring-1 ring-(--v9c-line-strong) transition-shadow focus-within:ring-2 focus-within:ring-(--v9c-reach-ink)">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-5 shrink-0 text-(--v9c-love)"
            focusable="false"
          >
            {[3, 7, 11, 15].map((x, index) => (
              <rect
                key={x}
                x={x - 1}
                y={10 - [3, 7, 5, 2][index]}
                width={2}
                height={[3, 7, 5, 2][index] * 2}
                rx={1}
                fill="currentColor"
              />
            ))}
          </svg>
          <input
            id="v9c-show"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            placeholder="Your podcast's name"
            aria-invalid={hint !== null}
            aria-describedby={hint ? "v9c-show-hint" : undefined}
            className="min-w-0 flex-1 bg-transparent py-3 text-lg text-(--v9c-ink) placeholder:text-(--v9c-dim) focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-(--v9c-ink) px-6 font-semibold text-(--v9c-on-ink) transition-colors hover:bg-[#45204d] disabled:cursor-wait"
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
            id="v9c-show-hint"
            className="pl-5 text-[0.95rem] font-semibold text-(--v9c-love-ink)"
          >
            {hint}
          </p>
        ) : (
          <p className="pl-5 text-[0.95rem] text-(--v9c-dim)">
            Searches the podcasts Qloo knows. Press Enter to look.
          </p>
        )}
      </form>

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" &&
          `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "found" && search.shows.length > 0 && (
        <section
          aria-labelledby="v9c-which"
          className="rounded-[28px] bg-(--v9c-paper) p-2 shadow-[0_30px_60px_-40px_rgb(42_16_48/0.45)] ring-1 ring-(--v9c-line)"
        >
          <div className="flex items-baseline justify-between gap-4 px-4 pt-3 pb-2">
            <h2
              id="v9c-which"
              className={`${styles.display} text-lg font-semibold sm:text-xl`}
            >
              Which one is yours?
            </h2>
            <span className="text-[0.95rem] text-(--v9c-dim)">
              {search.shows.length}{" "}
              {search.shows.length === 1 ? "match" : "matches"}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className={styles.rise}
                style={{ "--order": index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  className="group flex w-full items-center gap-4 rounded-[20px] p-3 text-left transition-colors hover:bg-(--v9c-well)/60 disabled:cursor-wait"
                >
                  <Cover show={show} size={56} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`${styles.display} block text-base leading-snug font-semibold sm:text-lg`}
                    >
                      {show.title}
                    </span>
                    {show.description && (
                      <span className="mt-1 line-clamp-2 block text-[0.95rem] text-(--v9c-soft)">
                        {show.description}
                      </span>
                    )}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      pending === show.id
                        ? "bg-(--v9c-ink) text-(--v9c-on-ink)"
                        : "text-(--v9c-ink) ring-1 ring-(--v9c-ink)/35 group-hover:bg-(--v9c-ink) group-hover:text-(--v9c-on-ink) group-disabled:opacity-50"
                    }`}
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
      className="flex gap-4 rounded-[28px] bg-(--v9c-paper) p-5 ring-1 ring-(--v9c-line) sm:p-6"
    >
      <svg
        aria-hidden
        viewBox="0 0 40 40"
        className="mt-1 size-9 shrink-0"
        focusable="false"
      >
        <circle
          cx={20}
          cy={20}
          r={18}
          fill="none"
          stroke={notice ? "#765d73" : "#db2b6e"}
          strokeOpacity={0.45}
        />
        <path
          d="M7 20h7l2-5 3 10 2-5h12"
          fill="none"
          stroke={notice ? "#765d73" : "#db2b6e"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex min-w-0 flex-col gap-2">
        <h2
          className={`${styles.display} text-xl leading-tight font-semibold ${notice ? "text-(--v9c-ink)" : "text-(--v9c-love-ink)"}`}
        >
          {problem.title}
        </h2>
        <p className="text-(--v9c-soft)">{problem.message}</p>
        {problem.next === "featured" && <FeaturedPicks />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 self-start rounded-full px-5 py-2 text-sm font-semibold text-(--v9c-ink) ring-1 ring-(--v9c-ink)/35 hover:bg-(--v9c-ink) hover:text-(--v9c-on-ink)"
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
      <h3 className="text-[0.95rem] font-semibold text-(--v9c-dim)">
        Or open a show Echo has run
      </h3>
      <ul className="flex flex-col gap-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="group flex items-center gap-3 rounded-2xl p-1.5 pr-3 hover:bg-(--v9c-well)/60"
            >
              <Cover show={show} size={36} />
              <span
                className={`${styles.display} text-sm font-semibold group-hover:underline`}
              >
                {show.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
