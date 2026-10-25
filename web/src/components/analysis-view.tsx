"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import type { Analysis, Filters, Guest, Idea, Step } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { analysisPath, readPath } from "@/lib/paths";
import { stats as computeStats, type Stats } from "@/lib/stats";
import { useAnalysis } from "@/lib/use-analysis";
import { useStart } from "@/lib/use-start";

import { Chat } from "./chat";
import { Dossier } from "./dossier";
import { FeaturedFallback } from "./featured";
import { GuestList, lockLine } from "./guest-list";
import { Chip, FRAME, hue, Lamp, ZoneHead } from "./hud";
import { Invite, MAX_PICKS } from "./invite";
import { LockHeader, ShowLock } from "./lock-header";
import { Problem } from "./problem";
import { Scope } from "./scope";
import { CommonGround, FanAges, Spectrum } from "./spectrum";

const NARROW = "(max-width: 1023px)";

const TABS = ["guests", "audience", "invite"] as const;
type Tab = (typeof TABS)[number];
const isTab = (value: string | null): value is Tab => TABS.includes(value as Tab);

type OpenAnalysis = {
  analysis: Analysis;
  selected: string | null;
  onSelect: (guestRef: string) => void;
  picked: string[];
  onPick: (guestRef: string) => void;
};

type Choice<T> = { id: string | null; value: T };

const hashGuest = () =>
  typeof window === "undefined" ? null : (window.location.hash.match(/^#guest-(.+)$/)?.[1] ?? null);

const OpenAnalysisContext = createContext<OpenAnalysis | null>(null);

export function useOpenAnalysis(): OpenAnalysis {
  const open = useContext(OpenAnalysisContext);
  if (!open) throw new Error("useOpenAnalysis is only available under the analyses layout.");
  return open;
}

export function AnalysisShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { id, guestRef } = readPath(usePathname());
  const { analysis, error, retry, update } = useAnalysis(id);
  const [selection, setSelection] = useState<Choice<string | null>>(() => ({ id, value: hashGuest() }));
  const [picks, setPicks] = useState<Choice<string[]>>({ id: null, value: [] });
  const openId = analysis?.id ?? null;
  const selected = selection.id === openId ? selection.value : null;
  const picked = picks.id === openId ? picks.value : [];

  if (guestRef && openId === id && selected !== guestRef) setSelection({ id: openId, value: guestRef });

  const onGuestPage = guestRef !== null;
  const rerun = useCallback(
    (next: Analysis) => router.push(`${analysisPath(next.id)}${window.location.search}`, { scroll: onGuestPage }),
    [router, onGuestPage],
  );
  const rewrite = useCallback(
    (ref: string, idea: Idea) =>
      update((current) => ({
        ...current,
        guests: current.guests.map((guest) => (guest.ref === ref ? { ...guest, idea } : guest)),
      })),
    [update],
  );
  const onSelect = useCallback((ref: string) => setSelection({ id: openId, value: ref }), [openId]);
  const onPick = useCallback(
    (ref: string) =>
      setPicks((state) => {
        const refs = state.id === openId ? state.value : [];
        return { id: openId, value: refs.includes(ref) ? refs.filter((other) => other !== ref) : [...refs, ref] };
      }),
    [openId],
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
        <div className={`${FRAME} flex flex-col gap-4 py-4`}>
          <section aria-label="Your show" className="zone p-4 sm:p-5">
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
    <OpenAnalysisContext value={{ analysis, selected, onSelect, picked, onPick }}>
      {children}
      <Chat analysis={analysis} onRerun={rerun} onRewrite={rewrite} />
    </OpenAnalysisContext>
  );
}

export function Console() {
  const { analysis, selected: selectedRef, onSelect, picked, onPick } = useOpenAnalysis();
  const { guests } = analysis;
  const [tab, setTab] = useState<Tab>(() => {
    const value = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return isTab(value) ? value : "guests";
  });
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const figures = computeStats(analysis);

  useLayoutEffect(() => () => setHighlighted(null), []);

  const index = Math.max(
    guests.findIndex((guest) => guest.ref === selectedRef),
    0,
  );
  const selected: Guest | undefined = guests[index];

  const select = useCallback(
    (ref: string) => {
      onSelect(ref);
      window.history.replaceState(null, "", `#guest-${ref}`);
      if (window.matchMedia(NARROW).matches) {
        document.getElementById("dossier-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [onSelect],
  );

  const openTab = (next: Tab) => {
    setTab(next);
    const search = next === "guests" ? "" : `?tab=${next}`;
    window.history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
  };

  if (!guests.length) {
    return (
      <div className={`${FRAME} flex flex-col gap-4 py-4`}>
        <title>{`${analysis.show.title} · Echo`}</title>
        <section aria-label="Your show" className="zone p-4 sm:p-5">
          <ShowLock analysis={analysis} />
        </section>
        <div className="zone p-6">
          <p className="font-display text-2xl font-semibold">No guests came back for this show.</p>
          <Link href="/" className="btn mt-4">
            Find another show
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <title>{`${analysis.show.title} · Echo`}</title>
      <div className={`${FRAME} pt-4`}>
        <LockHeader key={`lock-${analysis.id}`} analysis={analysis} stats={figures} line={lockLine(guests)} />
      </div>

      <TabBar tab={tab} onTab={openTab} stats={figures} picked={picked.length} />

      <div className={`${FRAME} flex-1 pt-4 pb-24`}>
        <div id="panel-guests" role="tabpanel" aria-labelledby="tab-guests" hidden={tab !== "guests"}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 xl:col-span-8">
              <Scope
                key={`scope-${analysis.id}`}
                guests={guests}
                selected={selected?.ref ?? null}
                highlighted={highlighted}
                onSelect={select}
                onHighlight={setHighlighted}
              />
              <GuestList
                key={`list-${analysis.id}`}
                guests={guests}
                selected={selected?.ref ?? null}
                highlighted={highlighted}
                picked={picked}
                onSelect={select}
                onHighlight={setHighlighted}
              />
            </div>
            <aside
              id="dossier-panel"
              aria-label="Selected guest"
              className="min-w-0 scroll-mt-28 lg:col-span-5 xl:col-span-4"
            >
              <div
                key={selected?.ref}
                className="lg:sticky lg:top-28 lg:max-h-[calc(100dvh-12.5rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]"
              >
                {selected && (
                  <Dossier
                    analysisId={analysis.id}
                    guest={selected}
                    index={index}
                    picked={picked.includes(selected.ref)}
                    full={picked.length >= MAX_PICKS}
                    onPick={() => onPick(selected.ref)}
                  />
                )}
              </div>
            </aside>
          </div>
        </div>

        <div id="panel-audience" role="tabpanel" aria-labelledby="tab-audience" hidden={tab !== "audience"}>
          {tab === "audience" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <Spectrum rows={analysis.audience_map} />
              </div>
              <FanAges stats={figures} />
              <CommonGround guests={guests} />
              <LeftOut analysis={analysis} />
            </div>
          )}
        </div>

        <div id="panel-invite" role="tabpanel" aria-labelledby="tab-invite" hidden={tab !== "invite"}>
          <Invite analysis={analysis} picked={picked} onToggle={onPick} />
        </div>
      </div>
    </div>
  );
}

const TAB_NAMES: Record<Tab, string> = { guests: "Guests", audience: "Audience", invite: "Invite" };

// The tabs, under the status bar while the page scrolls. Arrow keys move between them.
function TabBar({ tab, onTab, stats, picked }: { tab: Tab; onTab: (tab: Tab) => void; stats: Stats; picked: number }) {
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({
    guests: null,
    audience: null,
    invite: null,
  });
  const counts: Record<Tab, string> = {
    guests: String(stats.guests),
    audience: String(stats.tastes),
    invite: `${picked}/${MAX_PICKS}`,
  };
  const units: Record<Tab, string> = {
    guests: "guests",
    audience: "tastes",
    invite: "picked",
  };

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    const at = TABS.indexOf(tab);
    const next =
      event.key === "ArrowRight"
        ? TABS[(at + 1) % TABS.length]
        : event.key === "ArrowLeft"
          ? TABS[(at - 1 + TABS.length) % TABS.length]
          : event.key === "Home"
            ? TABS[0]
            : event.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    onTab(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="sticky top-14 z-20 mt-4 bg-void/85 backdrop-blur-md">
      <div className={FRAME}>
        <div
          role="tablist"
          aria-label="Analysis"
          onKeyDown={keys}
          className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]"
        >
          {TABS.map((name) => {
            const on = tab === name;
            return (
              <button
                key={name}
                ref={(element) => {
                  refs.current[name] = element;
                }}
                id={`tab-${name}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${name}`}
                tabIndex={on ? 0 : -1}
                onClick={() => onTab(name)}
                className={`flex shrink-0 items-baseline gap-1.5 rounded-full px-4 py-2 transition-colors sm:gap-2 sm:px-5 ${
                  on
                    ? "bg-deck text-ink shadow-[inset_0_0_0_1px_var(--steel)]"
                    : "text-ink-dim hover:bg-deck/60 hover:text-ink-soft"
                }`}
              >
                <span className="font-display text-sm font-semibold sm:text-[0.9375rem]">{TAB_NAMES[name]}</span>
                <span className={`readout text-xs sm:text-sm ${on ? "text-accent" : ""}`}>
                  {counts[name]}
                  <span className="sr-only"> {units[name]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LeftOut({ analysis }: { analysis: Analysis }) {
  return (
    <section aria-labelledby="left-out" className="zone flex flex-col">
      <ZoneHead id="left-out" title="Left out">
        <span>{analysis.left_out.length}</span>
      </ZoneHead>
      <div className="flex flex-col gap-3 p-4">
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
    <div aria-busy className={`${FRAME} grid grid-cols-1 gap-4 py-4 lg:grid-cols-12`}>
      <title>Echo</title>
      <span className="sr-only">Loading the analysis</span>
      <div className="zone h-52 lg:col-span-12" />
      <div className="zone h-96 lg:col-span-7 xl:col-span-8" />
      <div className="zone h-96 lg:col-span-5 xl:col-span-4" />
    </div>
  );
}

// The run's six steps beside echo rings sounding while Echo works. Fixed heights, so polling never moves
// the page.
function Rundown({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((step) => !step.done);
  const done = steps.filter((step) => step.done).length;
  return (
    <section aria-labelledby="running" className="zone flex flex-col">
      <ZoneHead id="running" title="Echo is running">
        <span className="text-accent">
          {done} / {steps.length}
        </span>
      </ZoneHead>
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center">
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
      <p className="px-5 pb-5 text-sm text-ink-soft">It usually takes a few seconds.</p>
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
