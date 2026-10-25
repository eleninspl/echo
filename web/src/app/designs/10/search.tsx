"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { Logo } from "@/components/logo";
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

export function ShowChat() {
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
      setHint("Type at least two letters of your show's name, then press Enter.");
      return;
    }
    setHint(null);
    find(text);
  }

  const searching = search.state === "searching";

  return (
    <div className="flex flex-col gap-4">
      <EchoSays>
        <label htmlFor="show" className="block text-[1.05rem] leading-snug font-medium">
          Hi, I&apos;m Echo. What&apos;s your show called?
        </label>
      </EchoSays>

      <form role="search" onSubmit={submit} noValidate className="flex justify-end pl-6 sm:pl-12">
        <div className="flex w-full items-center gap-2 rounded-[26px] rounded-br-[8px] border-2 border-(--ink) bg-(--lilac-tint) p-1.5 pl-4 transition-shadow focus-within:shadow-[0_0_0_5px_var(--lilac)]">
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
            className={`${styles.search} min-h-12 min-w-0 flex-1 bg-transparent text-lg caret-(--lilac-deep) placeholder:text-(--ink-soft)/75 focus-visible:outline-none`}
          />
          <button
            type="submit"
            disabled={searching}
            className="min-h-12 shrink-0 rounded-full bg-(--ink) px-5 text-base font-semibold text-(--cream) transition-colors hover:bg-[#463b35] disabled:cursor-wait disabled:opacity-80"
          >
            {searching ? "Looking…" : "Find it"}
          </button>
        </div>
      </form>

      {hint && (
        <EchoSays tone="rose">
          <p id="show-hint" className="font-medium text-(--rose-deep)">
            {hint}
          </p>
        </EchoSays>
      )}

      <p aria-live="polite" className="sr-only">
        {search.state === "searching" && `Looking for ${search.query}.`}
        {search.state === "found" && `${search.shows.length} shows found for ${search.query}.`}
      </p>

      {search.state === "searching" && (
        <EchoSays>
          <span className="flex items-center gap-3">
            <span className={styles.typing} aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className="text-(--ink-soft)">Looking for &ldquo;{search.query}&rdquo; in Qloo</span>
          </span>
        </EchoSays>
      )}

      {search.state === "found" && search.shows.length > 0 && (
        <div className="flex flex-col gap-3">
          <EchoSays>
            <h2 className={`${styles.display} text-xl leading-tight font-bold`}>Which one is yours?</h2>
            <p className="mt-0.5 text-sm text-(--ink-soft)">
              {search.shows.length === 1
                ? `One show matches “${search.query}”.`
                : `${search.shows.length} shows match “${search.query}”.`}
            </p>
          </EchoSays>
          <ul className="flex flex-col gap-2.5 sm:pl-12">
            {search.shows.map((show, index) => (
              <li
                key={show.id}
                className={`${styles.arrive} grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 rounded-[22px] border border-(--line) bg-(--paper) p-3 shadow-[0_10px_24px_-18px_rgb(80_50_20/0.5)] sm:grid-cols-[auto_minmax(0,1fr)_auto]`}
                style={{ "--order": index } as CSSProperties}
              >
                <Cover show={show} size={60} />
                <span className="min-w-0">
                  <span className={`${styles.display} block text-[1.15rem] leading-tight font-bold`}>{show.title}</span>
                  {show.description && (
                    <span className="mt-1 line-clamp-2 block text-sm leading-snug text-(--ink-soft)">
                      {show.description}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => start(show.id)}
                  disabled={pending !== null}
                  aria-label={`Run Echo on ${show.title}`}
                  className="col-start-2 min-h-11 justify-self-start rounded-full border-2 border-(--ink) bg-(--butter) px-5 text-[0.95rem] font-bold whitespace-nowrap transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 sm:col-start-3 sm:row-start-1 sm:justify-self-end"
                  style={pending === show.id ? { opacity: 1 } : undefined}
                >
                  {pending === show.id ? (
                    <span className="flex items-center gap-2">
                      <span className={styles.typing} aria-hidden>
                        <span />
                        <span />
                        <span />
                      </span>
                      Starting
                    </span>
                  ) : (
                    "Run Echo"
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {startError && <ProblemSays problem={describe(startError)} />}

      {search.state === "found" && search.shows.length === 0 && (
        <ProblemSays
          problem={{
            code: "show_unusable",
            title: "Echo can't analyse this show yet",
            message: `Qloo doesn't know "${search.query}", or knows too little about its audience. Check the spelling, or try another show.`,
            next: "featured",
          }}
        />
      )}

      {search.state === "failed" && <ProblemSays problem={search.problem} onRetry={() => find(search.query)} />}
    </div>
  );
}

export function EchoAvatar() {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-(--ink) text-(--butter) shadow-[0_0_0_3px_var(--paper)]"
    >
      <Logo className="size-[1.15rem]" />
    </span>
  );
}

function EchoSays({ children, tone = "paper" }: { children: ReactNode; tone?: "paper" | "rose" }) {
  const surface =
    tone === "rose" ? "border-[#efc3cf] bg-(--rose-tint)" : "border-(--line) bg-(--paper)";
  return (
    <div className={`${styles.arrive} flex items-end gap-2.5`}>
      <EchoAvatar />
      <div className={`max-w-[34rem] min-w-0 rounded-[22px] rounded-bl-[6px] border px-4 py-3 ${surface}`}>{children}</div>
    </div>
  );
}

function ProblemSays({ problem, onRetry }: { problem: HostError; onRetry?: () => void }) {
  const notice = problem.code === "not_implemented";
  return (
    <div role="alert" className={`${styles.arrive} flex items-end gap-2.5`}>
      <EchoAvatar />
      <div
        className={`flex max-w-[34rem] min-w-0 flex-col gap-2 rounded-[22px] rounded-bl-[6px] border px-4 py-3.5 ${
          notice ? "border-(--line) bg-(--paper)" : "border-[#efc3cf] bg-(--rose-tint)"
        }`}
      >
        <h3 className={`${styles.display} text-lg leading-tight font-bold ${notice ? "" : "text-(--rose-deep)"}`}>
          {problem.title}
        </h3>
        <p className="text-[0.95rem] leading-snug text-(--ink-soft)">{problem.message}</p>
        {problem.next === "featured" && <FeaturedLinks />}
        {problem.next === "retry" && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 min-h-10 self-start rounded-full border-2 border-(--ink) bg-(--paper) px-4 text-sm font-bold hover:bg-(--cream)"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

function FeaturedLinks() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <p className="text-sm font-semibold">Or open a show Echo has already run:</p>
      <ul className="flex flex-col gap-1">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id}>
            <Link
              href={`/analyses/${encodeURIComponent(analysis_id)}`}
              className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 font-semibold hover:bg-(--paper)"
            >
              <Cover show={show} size={32} />
              <span className="underline decoration-2 underline-offset-4 decoration-(--line)">{show.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
