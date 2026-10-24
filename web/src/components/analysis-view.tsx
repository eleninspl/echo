"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, useState, type KeyboardEvent } from "react";

import type { Analysis, Filters, Guest, Idea, Step } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { stats as computeStats, type Stats } from "@/lib/stats";
import { useAnalysis } from "@/lib/use-analysis";
import { useStart } from "@/lib/use-start";

import { Chat } from "./chat";
import { Dossier, type DossierView } from "./dossier";
import { FeaturedFallback } from "./featured";
import { GuestList, lockLine } from "./guest-list";
import { Chip, FRAME, hue, Lamp, ZoneHead } from "./hud";
import { Invite, MAX_PICKS } from "./invite";
import { LockHeader, ShowLock } from "./lock-header";
import { Problem } from "./problem";
import { RouterLog } from "./router-log";
import { Scope } from "./scope";
import { CommonGround, FanAges, Spectrum } from "./spectrum";

const PREFIX = "/analyses/";
const NARROW = "(max-width: 1023px)";

const TABS = ["guests", "audience", "invite", "qloo"] as const;
type Tab = (typeof TABS)[number];
const isTab = (value: string | null): value is Tab => TABS.includes(value as Tab);

export function AnalysisView({ id }: { id: string }) {
  // A run the chat starts takes over the URL with history.pushState, so the analysis shown follows the
  // path, Back returns to the one before, and the chat stays as it was.
  const pathname = usePathname();
  const shown = pathname.startsWith(PREFIX) ? decodeURIComponent(pathname.slice(PREFIX.length)) : id;
  const { analysis, error, retry, update } = useAnalysis(shown);

  const rerun = useCallback((next: Analysis) => {
    window.history.pushState(null, "", `${PREFIX}${encodeURIComponent(next.id)}${window.location.search}`);
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
    if (!error) return <ConsoleSkeleton />;
    return (
      <div className={`${FRAME} py-4`}>
        <Problem problem={describe(error)}>
          <NextStep problem={describe(error)} onRetry={retry} />
        </Problem>
      </div>
    );
  }

  return (
    <>
      <title>{`${analysis.show.title} · Echo`}</title>
      {analysis.status === "done" && !error ? (
        <Console analysis={analysis} onRerun={rerun} onRewrite={rewrite} />
      ) : (
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
      )}
    </>
  );
}

type UiState = {
  id: string;
  selected: string | null;
  picked: string[];
  view: DossierView;
};
const fresh = (id: string): UiState => ({ id, selected: null, picked: [], view: "profile" });

type ConsoleProps = {
  analysis: Analysis;
  onRerun: (analysis: Analysis) => void;
  onRewrite: (guestRef: string, idea: Idea) => void;
};

// The finished run: the lock header, four tabs, and the chat docked under them all.
function Console({ analysis, onRerun, onRewrite }: ConsoleProps) {
  const { guests } = analysis;
  // Not keyed by the analysis, so the chat and the tab stay across a rerun; what the host selected and
  // picked belongs to one analysis and starts over with the next.
  // A link to #guest-<ref> opens with that guest selected, and ?tab= opens a tab. The console only
  // mounts in the browser, once the analysis has loaded, so the URL is there to read.
  const [ui, setUi] = useState<UiState>(() => {
    const ref = typeof window === "undefined" ? undefined : window.location.hash.match(/^#guest-(.+)$/)?.[1];
    return { ...fresh(analysis.id), selected: ref && guests.some((guest) => guest.ref === ref) ? ref : null };
  });
  const [tab, setTab] = useState<Tab>(() => {
    const value = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return isTab(value) ? value : "guests";
  });
  const current = ui.id === analysis.id ? ui : fresh(analysis.id);
  const change = (next: Partial<UiState>) =>
    setUi((state) => ({ ...(state.id === analysis.id ? state : fresh(analysis.id)), ...next }));
  const { selected: selectedRef, picked, view } = current;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const figures = computeStats(analysis);

  const index = Math.max(
    guests.findIndex((guest) => guest.ref === selectedRef),
    0,
  );
  const selected: Guest | undefined = guests[index];

  const select = useCallback(
    (ref: string) => {
      setUi((state) => ({
        ...(state.id === analysis.id ? state : fresh(analysis.id)),
        selected: ref,
        view: "profile",
      }));
      window.history.replaceState(null, "", `#guest-${ref}`);
      // On one column the dossier is below the list: bring it up.
      if (window.matchMedia(NARROW).matches) {
        document.getElementById("dossier-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [analysis.id],
  );

  const openTab = (next: Tab) => {
    setTab(next);
    const search = next === "guests" ? "" : `?tab=${next}`;
    window.history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
  };

  const togglePick = (ref: string) =>
    change({ picked: picked.includes(ref) ? picked.filter((other) => other !== ref) : [...picked, ref] });

  if (!guests.length) {
    return (
      <div className={`${FRAME} flex flex-col gap-4 py-4`}>
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
      <div className={`${FRAME} pt-4`}>
        <LockHeader key={`lock-${analysis.id}`} analysis={analysis} stats={figures} line={lockLine(guests)} />
      </div>

      <TabBar tab={tab} onTab={openTab} stats={figures} picked={picked.length} />

      <div className={`${FRAME} flex-1 pt-4 pb-8`}>
        <div id="panel-guests" role="tabpanel" aria-labelledby="tab-guests" hidden={tab !== "guests"}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
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
            <aside id="dossier-panel" aria-label="Selected guest" className="min-w-0 scroll-mt-28 lg:col-span-5">
              <div className="lg:sticky lg:top-28 lg:max-h-[calc(100dvh-12.5rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]">
                {selected && (
                  <Dossier
                    analysis={analysis}
                    guest={selected}
                    index={index}
                    picked={picked.includes(selected.ref)}
                    full={picked.length >= MAX_PICKS}
                    view={view}
                    onPick={() => togglePick(selected.ref)}
                    onView={(next) => change({ view: next })}
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
          <Invite analysis={analysis} picked={picked} onToggle={togglePick} />
        </div>

        <div id="panel-qloo" role="tabpanel" aria-labelledby="tab-qloo" hidden={tab !== "qloo"}>
          {tab === "qloo" && <RouterLog calls={analysis.qloo_calls} stats={figures} />}
        </div>
      </div>

      <Chat analysis={analysis} onRerun={onRerun} onRewrite={onRewrite} />
    </div>
  );
}

const TAB_NAMES: Record<Tab, string> = { guests: "Guests", audience: "Audience", invite: "Invite", qloo: "Qloo" };

// The tabs, under the status bar while the page scrolls. Arrow keys move between them.
function TabBar({ tab, onTab, stats, picked }: { tab: Tab; onTab: (tab: Tab) => void; stats: Stats; picked: number }) {
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({
    guests: null,
    audience: null,
    invite: null,
    qloo: null,
  });
  const counts: Record<Tab, string> = {
    guests: String(stats.guests),
    audience: String(stats.tastes),
    invite: `${picked}/${MAX_PICKS}`,
    qloo: String(stats.calls),
  };
  const units: Record<Tab, string> = {
    guests: "guests",
    audience: "tastes",
    invite: "picked",
    qloo: "calls",
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
    <div className="sticky top-12 z-20 mt-4 border-y border-steel bg-void/90 backdrop-blur-md">
      <div className={FRAME}>
        <div
          role="tablist"
          aria-label="Analysis"
          onKeyDown={keys}
          className="-mx-2.5 flex overflow-x-auto [scrollbar-width:none] sm:mx-0"
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
                className={`group relative flex shrink-0 items-baseline gap-1.5 px-2.5 py-3.5 transition-colors sm:gap-2.5 sm:px-6 ${
                  on ? "text-ink" : "text-ink-dim hover:text-ink-soft"
                }`}
              >
                <span className="font-display text-sm font-semibold sm:text-[0.9375rem]">
                  {TAB_NAMES[name]}
                </span>
                <span className={`readout text-xs sm:text-sm ${on ? "text-fit" : ""}`}>
                  {counts[name]}
                  <span className="sr-only"> {units[name]}</span>
                </span>
                <span
                  aria-hidden
                  className={`absolute inset-x-3 bottom-0 h-0.5 transition-opacity ${on ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}
                  style={{ background: "var(--fit)" }}
                />
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
      <span className="sr-only">Loading the analysis</span>
      <div className="zone h-52 lg:col-span-12" />
      <div className="zone h-96 lg:col-span-7" />
      <div className="zone h-96 lg:col-span-5" />
    </div>
  );
}

// The run's six steps beside a radar sweeping while Echo works. Fixed heights, so polling never moves
// the page.
function Rundown({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((step) => !step.done);
  const done = steps.filter((step) => step.done).length;
  return (
    <section aria-labelledby="running" className="zone flex flex-col">
      <ZoneHead id="running" title="Echo is running">
        <span className="text-fit">
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
                className={`flex h-12 items-center gap-4 border-b border-steel ${step.done || on ? "text-ink" : "text-ink-dim"}`}
              >
                <span className="readout w-6 text-sm text-ink-dim">{String(index + 1).padStart(2, "0")}</span>
                <Lamp
                  color={step.done ? "var(--sweet)" : "var(--fit)"}
                  on={step.done || on}
                  className={`h-2 w-5 ${on ? "blink" : ""}`}
                />
                <span className={on ? "font-semibold" : ""}>{step.label}</span>
                <span className="sr-only">{step.done ? "(done)" : on ? "(running)" : "(waiting)"}</span>
              </li>
            );
          })}
        </ol>
        <Radar label={current >= 0 ? steps[current].label : "Finishing"} done={done} total={steps.length} />
      </div>
      <p className="px-5 pb-5 text-sm text-ink-soft">It usually takes under twenty seconds.</p>
      <p aria-live="polite" className="sr-only">
        {current >= 0 ? `${steps[current].label}, step ${current + 1} of ${steps.length}.` : "Finishing."}
      </p>
    </section>
  );
}

// A radar sweeping for guests: range rings, a rotating beam, and the steps done as an arc around it.
function Radar({ label, done, total }: { label: string; done: number; total: number }) {
  const r = 120;
  const arc = 2 * Math.PI * (r + 14);
  return (
    <div aria-hidden className="relative mx-auto size-72 shrink-0">
      <svg viewBox="-150 -150 300 300" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <radialGradient id="radar-glow">
            <stop offset="0" stopColor="var(--fit)" stopOpacity="0.12" />
            <stop offset="1" stopColor="var(--fit)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="radar-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--fit)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--fit)" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <circle r={r} fill="url(#radar-glow)" />
        {[0.33, 0.66, 1].map((t) => (
          <circle
            key={t}
            r={r * t}
            fill="none"
            stroke="var(--steel-hi)"
            strokeDasharray={t === 1 ? undefined : "2 4"}
          />
        ))}
        <line x1={-r} x2={r} stroke="var(--steel)" />
        <line y1={-r} y2={r} stroke="var(--steel)" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          const inner = i % 6 === 0 ? r - 8 : r - 4;
          return (
            <line
              key={i}
              x1={Math.cos(a) * inner}
              y1={Math.sin(a) * inner}
              x2={Math.cos(a) * r}
              y2={Math.sin(a) * r}
              stroke="var(--steel-hi)"
            />
          );
        })}
        <g className="sweep">
          <path
            d={`M 0 0 L ${r} 0 A ${r} ${r} 0 0 0 ${Math.cos(-0.6) * r} ${Math.sin(-0.6) * r} Z`}
            fill="url(#radar-beam)"
          />
          <line x1="0" y1="0" x2={r} y2="0" stroke="var(--fit)" strokeWidth="1.5" />
        </g>
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="ring"
            r="9"
            fill="none"
            stroke="var(--fit)"
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${i * 0.93}s` }}
          />
        ))}
        <circle r="5" fill="var(--fit)" />
        <circle r={r + 14} fill="none" stroke="var(--fit)" strokeOpacity="0.15" strokeWidth="3" />
        <circle
          r={r + 14}
          fill="none"
          stroke="var(--sweet)"
          strokeWidth="3"
          strokeDasharray={`${(arc * done) / Math.max(total, 1)} ${arc}`}
          transform="rotate(-90)"
          style={{ transition: "stroke-dasharray 600ms var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-x-0 -bottom-2 flex flex-col items-center">
        <span className="tag text-fit">{label}</span>
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
