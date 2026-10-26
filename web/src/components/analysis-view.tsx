"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { Analysis, Filters, Idea, Step } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { analysisPath, guestPath, readPath } from "@/lib/paths";
import { readPicks, savePicks } from "@/lib/picks";
import { stats as computeStats } from "@/lib/stats";
import { useAnalysis } from "@/lib/use-analysis";
import { useStart } from "@/lib/use-start";

import { Backdrop } from "./backdrop";
import { AskSection, Chat } from "./chat";
import { FeaturedFallback } from "./featured";
import { GuestList } from "./guest-list";
import { GuestSheet } from "./guest-sheet";
import { Chip, FRAME, hue, Lamp, SectionHead, SHEET_ROOM } from "./hud";
import { MAX_PICKS } from "./invite";
import { LabelSpectrum, LockHeader, ShowLock } from "./lock-header";
import { PickBar } from "./pick-bar";
import { Problem } from "./problem";
import { Scope } from "./scope";
import { CommonGround, FanAges } from "./spectrum";
import { TasteMap } from "./taste-map";
import { TopPicks } from "./top-picks";

type OpenAnalysis = {
  analysis: Analysis;
  openGuest: string | null;
  onOpen: (guestRef: string) => void;
  onClose: () => void;
  picked: string[];
  onPick: (guestRef: string) => void;
  rewritten: Rewrite | null;
  onAskSlot: Dispatch<SetStateAction<HTMLElement | null>>;
};

export type Rewrite = { id: string; ref: string; idea: Idea };

type Choice<T> = { id: string | null; value: T };

const OpenAnalysisContext = createContext<OpenAnalysis | null>(null);

export function useOpenAnalysis(): OpenAnalysis {
  const open = useContext(OpenAnalysisContext);
  if (!open) throw new Error("useOpenAnalysis is only available under the analyses layout.");
  return open;
}

export function AnalysisShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { id, guestRef, inviting } = readPath(usePathname());
  const { analysis, error, retry, update } = useAnalysis(id);
  const [picks, setPicks] = useState<Choice<string[]>>({ id: null, value: [] });
  const openId = analysis?.id ?? null;
  const picked = (picks.id === openId ? picks.value : openId ? readPicks(openId) : []).filter((ref) =>
    analysis?.guests.some((guest) => guest.ref === ref),
  );
  const [rewritten, setRewritten] = useState<Rewrite | null>(null);
  const [askSlot, setAskSlot] = useState<HTMLElement | null>(null);
  const openedHere = useRef(false);
  const openGuest = openId === id ? guestRef : null;

  useEffect(() => {
    if (!guestRef) openedHere.current = false;
  }, [guestRef]);

  const rerun = useCallback(
    (next: Analysis) => router.push(analysisPath(next.id), { scroll: inviting }),
    [router, inviting],
  );
  const onOpen = useCallback(
    (ref: string) => {
      if (!openId || ref === guestRef) return;
      if (guestRef) {
        router.replace(guestPath(openId, ref), { scroll: false });
        return;
      }
      openedHere.current = true;
      router.push(guestPath(openId, ref), { scroll: false });
    },
    [openId, guestRef, router],
  );
  const onClose = useCallback(() => {
    if (!openId) return;
    if (openedHere.current) router.back();
    else router.replace(analysisPath(openId), { scroll: false });
    openedHere.current = false;
  }, [openId, router]);
  const rewrite = useCallback(
    (ref: string, idea: Idea) => {
      update((current) => ({
        ...current,
        guests: current.guests.map((guest) => (guest.ref === ref ? { ...guest, idea } : guest)),
      }));
      if (!openId) return;
      setRewritten({ id: openId, ref, idea });
      onOpen(ref);
    },
    [update, openId, onOpen],
  );
  const onPick = useCallback(
    (ref: string) => {
      if (!openId) return;
      const value = picked.includes(ref) ? picked.filter((other) => other !== ref) : [...picked, ref];
      setPicks({ id: openId, value });
      savePicks(openId, value);
    },
    [openId, picked],
  );

  if (!analysis) {
    if (!error) return <ConsoleSkeleton />;
    return (
      <div className={`${FRAME} py-4`}>
        <Problem problem={describe(error)}>
          <NextStep problem={describe(error)} onRetry={retry} />
        </Problem>
      </div>
    );
  }

  if (analysis.status !== "done" || error) {
    return (
      <>
        <title>{`${analysis.show.title} · Echo`}</title>
        <div className={`${FRAME} flex flex-col gap-8 pt-10 pb-16`}>
          <section aria-label="Your show">
            <ShowLock analysis={analysis} />
          </section>
          {error ? (
            <Problem problem={describe(error)}>
              <NextStep problem={describe(error)} onRetry={retry} />
            </Problem>
          ) : analysis.status === "running" ? (
            <Rundown steps={analysis.steps} />
          ) : (
            <Failed analysis={analysis} />
          )}
        </div>
      </>
    );
  }

  return (
    <OpenAnalysisContext
      value={{ analysis, openGuest, onOpen, onClose, picked, onPick, rewritten, onAskSlot: setAskSlot }}
    >
      {children}
      <Chat analysis={analysis} onRerun={rerun} onRewrite={rewrite} beside={openGuest !== null} slot={askSlot} />
    </OpenAnalysisContext>
  );
}

export function Console() {
  const { analysis, openGuest, onOpen, onClose, picked, onPick, rewritten, onAskSlot } = useOpenAnalysis();
  const { guests } = analysis;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const figures = computeStats(analysis);
  const open = guests.find((guest) => guest.ref === openGuest);
  const beside = openGuest !== null;

  useLayoutEffect(() => () => setHighlighted(null), []);

  if (!guests.length) {
    return (
      <div className={`${FRAME} flex flex-col gap-10 pt-10 pb-16`}>
        <title>{`${analysis.show.title} · Echo`}</title>
        <section aria-label="Your show">
          <ShowLock analysis={analysis} />
        </section>
        <div>
          <p className="font-display text-2xl font-semibold">No guests came back for this show.</p>
          <Link href="/" className="btn mt-4">
            Find another show
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-1 flex-col transition-[padding] duration-500 ease-(--ease-out) motion-reduce:transition-none ${beside ? SHEET_ROOM : ""}`}
    >
      <title>{open ? `${open.name} · ${analysis.show.title} · Echo` : `${analysis.show.title} · Echo`}</title>
      <Backdrop>
        <div className={`${FRAME} @container pt-10 pb-12 sm:pt-12`}>
          <LockHeader key={`lock-${analysis.id}`} analysis={analysis} stats={figures} />
        </div>
      </Backdrop>

      <div className={`${FRAME} @container flex flex-1 flex-col gap-20 pb-36`}>
        <TopPicks
          key={`picks-${analysis.id}`}
          guests={guests}
          picked={picked}
          full={picked.length >= MAX_PICKS}
          onPick={onPick}
          onOpen={onOpen}
        />
        <Scope
          key={`scope-${analysis.id}`}
          title={`How all ${guests.length} compare`}
          guests={guests}
          selected={openGuest}
          highlighted={highlighted}
          onSelect={onOpen}
          onHighlight={setHighlighted}
        >
          <div className="flex flex-col gap-5 @4xl:flex-row @4xl:items-end @4xl:justify-between @4xl:gap-12">
            <p className="max-w-[62ch] text-ink-soft">
              Each dot is a guest. Higher up, your listeners like them more. Further right, more of their fans are new
              to you. A bigger dot means their fans are likelier to enjoy your show. The shaded box at the top right is
              the sweet spot.
            </p>
            <LabelSpectrum stats={figures} className="@4xl:w-[30rem] @4xl:shrink-0" />
          </div>
        </Scope>
        <GuestList
          key={`list-${analysis.id}`}
          analysisId={analysis.id}
          guests={guests}
          open={openGuest}
          highlighted={highlighted}
          picked={picked}
          full={picked.length >= MAX_PICKS}
          onOpen={onOpen}
          onPick={onPick}
          onHighlight={setHighlighted}
        />
        <section
          aria-label="Your listeners"
          className="grid grid-cols-1 gap-x-12 gap-y-14 border-t border-steel pt-14 @3xl:grid-cols-3"
        >
          <div className="@3xl:col-span-3">
            <TasteMap key={`tastes-${analysis.id}`} analysis={analysis} />
          </div>
          <FanAges stats={figures} />
          <CommonGround guests={guests} />
          <LeftOut analysis={analysis} />
        </section>
        <AskSection onSlot={onAskSlot} />
      </div>

      <GuestSheet
        analysis={analysis}
        guestRef={openGuest}
        picked={picked}
        rewritten={rewritten}
        onPick={onPick}
        onOpen={onOpen}
        onClose={onClose}
      />
      <PickBar analysis={analysis} picked={picked} beside={beside} />
    </div>
  );
}

function LeftOut({ analysis }: { analysis: Analysis }) {
  return (
    <section aria-labelledby="left-out" className="flex flex-col gap-4">
      <SectionHead id="left-out" title="Left out" small>
        <span>{analysis.left_out.length}</span>
      </SectionHead>
      <div className="flex flex-col gap-3">
        {analysis.left_out.length ? (
          <ul className="flex flex-col gap-1.5">
            {analysis.left_out.map(({ name, why }) => (
              <li
                key={`${name}-${why}`}
                className="flex items-center justify-between gap-3 border-b border-steel pb-1.5 text-sm"
              >
                {name}
                <Chip color={why === "host" ? "var(--long-shot)" : "var(--balanced)"}>
                  {why === "host" ? "Host" : "Past guest"}
                </Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-dim">Nobody: no hosts or past guests came back.</p>
        )}
        <p className="text-xs text-ink-dim">
          Echo leaves out the show&apos;s hosts and people already in its episode titles.
        </p>
      </div>
    </section>
  );
}

// Holds the console's place while the page loads, so nothing jumps when it arrives.
export function ConsoleSkeleton() {
  return (
    <div aria-busy className={`${FRAME} flex flex-col gap-12 pt-10 pb-16`}>
      <title>Echo</title>
      <span className="sr-only">Loading the analysis</span>
      <div className="flex items-center gap-6">
        <div className="size-20 shrink-0 animate-pulse rounded-2xl bg-deck sm:size-28" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-10 w-2/3 max-w-xl animate-pulse rounded-lg bg-deck" />
          <div className="h-4 w-1/2 max-w-md animate-pulse rounded bg-deck" />
        </div>
      </div>
      <div className="h-[28rem] animate-pulse rounded-2xl bg-deck/60" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-14 animate-pulse rounded-xl bg-deck/60" />
        ))}
      </div>
    </div>
  );
}

// The run's six steps beside echo rings sounding while Echo works. Fixed heights, so polling never moves
// the page.
function Rundown({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((step) => !step.done);
  const done = steps.filter((step) => step.done).length;
  return (
    <section aria-labelledby="running" className="flex flex-col gap-4">
      <SectionHead id="running" title="Echo is running">
        <span className="text-accent">
          {done} / {steps.length}
        </span>
      </SectionHead>
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <ol className="flex flex-col">
          {steps.map((step, index) => {
            const on = index === current;
            return (
              <li
                key={step.key}
                aria-current={on ? "step" : undefined}
                className={`flex h-12 items-center gap-4 border-b border-steel last:border-b-0 ${step.done || on ? "text-ink" : "text-ink-dim"}`}
              >
                <span className="readout w-6 text-sm text-ink-dim">{String(index + 1).padStart(2, "0")}</span>
                <Lamp
                  color={step.done ? "var(--ink-soft)" : "var(--accent)"}
                  on={step.done || on}
                  className={`size-2.5 ${on ? "pulse" : ""}`}
                />
                <span className={on ? "font-semibold" : ""}>{step.label}</span>
                <span className="sr-only">{step.done ? "(done)" : on ? "(running)" : "(waiting)"}</span>
              </li>
            );
          })}
        </ol>
        <Radar label={current >= 0 ? steps[current].label : "Finishing"} done={done} total={steps.length} />
      </div>
      <p className="text-sm text-ink-soft">It usually takes a few seconds.</p>
      <p aria-live="polite" className="sr-only">
        {current >= 0 ? `${steps[current].label}, step ${current + 1} of ${steps.length}.` : "Finishing."}
      </p>
    </section>
  );
}

// Echo rings sounding from the show while it works, and the steps done as an arc around them.
function Radar({ label, done, total }: { label: string; done: number; total: number }) {
  const r = 120;
  const arc = 2 * Math.PI * (r + 14);
  return (
    <div aria-hidden className="relative mx-auto size-72 shrink-0">
      <svg viewBox="-150 -150 300 300" className="absolute inset-0 size-full overflow-visible">
        {[0.33, 0.66, 1].map((t) => (
          <circle key={t} r={r * t} fill="none" stroke="var(--steel)" />
        ))}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="ring"
            r="12"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${i * 0.93}s` }}
          />
        ))}
        <circle r="7" fill="var(--accent)" />
        <circle r={r + 14} fill="none" stroke="var(--sweet)" strokeOpacity="0.16" strokeWidth="5" />
        <circle
          r={r + 14}
          fill="none"
          stroke="var(--sweet)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(arc * done) / Math.max(total, 1)} ${arc}`}
          transform="rotate(-90)"
          style={{ transition: "stroke-dasharray 600ms var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-x-0 -bottom-2 flex flex-col items-center">
        <span className="tag text-accent">{label}</span>
      </div>
    </div>
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

function NextStep({
  problem,
  onRetry,
  retrying = false,
}: {
  problem: HostError;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const router = useRouter();
  switch (problem.next) {
    case "featured":
      return (
        <>
          <FeaturedFallback />
          <Link href="/" className="btn self-start">
            Search for another show
          </Link>
        </>
      );
    case "retry":
      return (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="btn btn-solid self-start"
          style={hue("var(--ink)")}
        >
          {retrying ? "Starting…" : "Try again"}
        </button>
      );
    case "previous":
      return (
        <button type="button" onClick={() => router.back()} className="btn self-start">
          Go back
        </button>
      );
    case "home":
      return (
        <Link href="/" className="btn self-start">
          Find your show
        </Link>
      );
    default:
      return null;
  }
}
