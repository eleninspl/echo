"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import type { Analysis, Filters, Idea, Step } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { useAnalysis } from "@/lib/use-analysis";
import { useStart } from "@/lib/use-start";

import { AudienceMap } from "./audience-map";
import { Bill } from "./bill";
import { Chat } from "./chat";
import { FeaturedFallback } from "./featured";
import { GuestTable } from "./guest-table";
import { Invite } from "./invite";
import { Ring } from "./logo";
import { Problem } from "./problem";
import { QlooCalls } from "./qloo-calls";
import { ShowCover } from "./show-cover";

const PREFIX = "/analyses/";

export function AnalysisView({ id }: { id: string }) {
  // A run the chat starts takes over the URL with history.pushState, so the analysis shown follows the
  // path, Back returns to the one before, and the chat stays as it was.
  const pathname = usePathname();
  const shown = pathname.startsWith(PREFIX) ? decodeURIComponent(pathname.slice(PREFIX.length)) : id;
  const { analysis, error, retry, update } = useAnalysis(shown);
  const [picks, setPicks] = useState<{ id: string; refs: string[] }>({ id: "", refs: [] });
  const picked = analysis && picks.id === analysis.id ? picks.refs : [];

  const rerun = useCallback((next: Analysis) => {
    window.history.pushState(null, "", `${PREFIX}${encodeURIComponent(next.id)}`);
  }, []);
  const rewrite = useCallback(
    (guestRef: string, idea: Idea) =>
      update((current) => ({
        ...current,
        guests: current.guests.map((guest) => (guest.ref === guestRef ? { ...guest, idea } : guest)),
      })),
    [update],
  );

  if (!analysis) {
    if (!error) return <VenueSkeleton />;
    return (
      <Field>
        <Problem problem={describe(error)}>
          <NextStep problem={describe(error)} onRetry={retry} />
        </Problem>
      </Field>
    );
  }

  return (
    <>
      <title>{`${analysis.show.title} · Echo`}</title>
      <Field fill={analysis.status !== "done"}>
        <Venue analysis={analysis} />
        {error ? (
          <Problem problem={describe(error)}>
            <NextStep problem={describe(error)} onRetry={retry} />
          </Problem>
        ) : analysis.status === "running" ? (
          <RunSheet steps={analysis.steps} />
        ) : analysis.status === "failed" ? (
          <Failed analysis={analysis} />
        ) : (
          <Bill key={analysis.id} guests={analysis.guests} />
        )}
      </Field>
      {analysis.status === "done" && (
        <>
          <Chat analysis={analysis} onRerun={rerun} onRewrite={rewrite} />
          <GuestTable
            key={`guests-${analysis.id}`}
            id={analysis.id}
            guests={analysis.guests}
            showMap={analysis.audience_map}
            picked={picked}
            onPick={(refs) => setPicks({ id: analysis.id, refs })}
          />
          <Invite key={`invite-${analysis.id}`} analysis={analysis} picked={picked} />
          <AudienceMap rows={analysis.audience_map} />
          <LeftOut analysis={analysis} />
          <QlooCalls calls={analysis.qloo_calls} />
        </>
      )}
    </>
  );
}

// The printed band. It fills the page down to the footer when nothing follows it.
function Field({ children, fill = true }: { children: ReactNode; fill?: boolean }) {
  return (
    <div className={`flex flex-col bg-field text-on-field ${fill ? "flex-1" : ""}`}>
      <div className="grid-lines mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-4 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-20">
        {children}
      </div>
    </div>
  );
}

// Holds the venue's place while the page loads, so nothing jumps when it arrives.
export function VenueSkeleton() {
  return (
    <Field>
      <div aria-busy className="flex items-center gap-5">
        <span className="sr-only">Loading the analysis</span>
        <span className="size-16 shrink-0 bg-field-rule sm:size-24" />
        <span className="h-14 w-2/3 max-w-xl bg-field-rule sm:h-20" />
      </div>
    </Field>
  );
}

function Venue({ analysis }: { analysis: Analysis }) {
  const { show, filters } = analysis;
  const phrases = filterPhrases(filters);
  const unused = filters.episode_about && filters.episode_about.used === null && analysis.status === "done";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-5">
        <ShowCover show={show} size={96} />
        <h1 className="font-display text-[clamp(2.75rem,8vw,6rem)] leading-[0.88] font-extrabold tracking-tight text-balance uppercase">
          {show.title}
        </h1>
      </div>
      {(show.description || phrases.length > 0) && (
        <div className="flex max-w-3xl flex-col gap-2 text-on-field-soft">
          {show.description && <p>{show.description}</p>}
          {phrases.length > 0 && (
            <p className="font-semibold text-on-field">
              <span className="sr-only">Filters: </span>
              {phrases.join(" · ")}
            </p>
          )}
          {unused && (
            <p>
              Qloo couldn&apos;t use &ldquo;{filters.episode_about?.query}&rdquo; for the episode, so these guests
              don&apos;t account for it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// The six steps, each row a fixed height so polling never moves the page.
function RunSheet({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((step) => !step.done);
  return (
    <section aria-labelledby="running" className="max-w-xl">
      <h2 id="running" className="text-sm font-semibold tracking-wide uppercase">
        Echo is running. It usually takes under twenty seconds.
      </h2>
      <ol className="mt-4 border-t-2 border-on-field">
        {steps.map((step, index) => (
          <li
            key={step.key}
            aria-current={index === current ? "step" : undefined}
            className={`flex h-14 items-center gap-4 border-b border-field-rule text-lg ${
              step.done || index === current ? "" : "text-on-field-soft"
            }`}
          >
            <StepMark done={step.done} current={index === current} />
            <span className={index === current ? "font-semibold" : ""}>{step.label}</span>
            <span className="sr-only">{step.done ? "(done)" : index === current ? "(running)" : "(waiting)"}</span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">
        {current >= 0 ? `${steps[current].label}, step ${current + 1} of ${steps.length}.` : "Finishing."}
      </p>
    </section>
  );
}

function StepMark({ done, current }: { done: boolean; current: boolean }) {
  if (done) {
    return (
      <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0">
        <rect width="20" height="20" fill="currentColor" />
        <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="var(--field)" strokeWidth="2.4" />
      </svg>
    );
  }
  return (
    <span aria-hidden className="relative flex size-5 shrink-0 items-center justify-center">
      {current && <Ring className="ping absolute size-5" />}
      <Ring className="size-5" />
    </span>
  );
}

function Failed({ analysis }: { analysis: Analysis }) {
  const { start, pending, error } = useStart();
  // A failed restart replaces the run's own error, and its next step with it.
  const problem = describe(error ?? analysis.error);
  return (
    <Problem problem={problem}>
      <NextStep
        problem={problem}
        onRetry={() => start(analysis.show.id, requestFilters(analysis.filters))}
        retrying={pending !== null}
      />
    </Problem>
  );
}

// The filters as a request, without what the engine filled in.
function requestFilters(filters: Filters): Filters {
  const about = filters.episode_about;
  return { ...filters, episode_about: about && { query: about.query, type: about.type } };
}

function NextStep({ problem, onRetry, retrying = false }: { problem: HostError; onRetry: () => void; retrying?: boolean }) {
  const router = useRouter();
  const button = "self-start border-2 border-current px-4 py-2 font-semibold disabled:opacity-60";
  switch (problem.next) {
    case "featured":
      return (
        <>
          <FeaturedFallback />
          <Link href="/" className="self-start font-semibold underline">
            Search for another show
          </Link>
        </>
      );
    case "retry":
      return (
        <button type="button" onClick={onRetry} disabled={retrying} className={button}>
          {retrying ? "Starting…" : "Try again"}
        </button>
      );
    case "previous":
      return (
        <button type="button" onClick={() => router.back()} className={button}>
          Go back
        </button>
      );
    case "home":
      return (
        <Link href="/" className={button}>
          Find your show
        </Link>
      );
    default:
      return null;
  }
}

function LeftOut({ analysis }: { analysis: Analysis }) {
  if (!analysis.left_out.length) return null;
  const names = analysis.left_out.map(({ name, why }) => `${name} (${why === "host" ? "a host" : "a past guest"})`);
  return (
    <section aria-labelledby="left-out" className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-8">
      <h2 id="left-out" className="text-sm font-semibold tracking-wide uppercase">
        Left out
      </h2>
      <p className="mt-2 max-w-3xl text-ink-soft">
        {names.join(", ")}. Echo leaves out the show&apos;s hosts and people already in its episode titles.
      </p>
    </section>
  );
}
