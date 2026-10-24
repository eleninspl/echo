"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import type { Analysis, Filters, Guest, Idea, Step } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { stats } from "@/lib/stats";
import { useAnalysis } from "@/lib/use-analysis";
import { useStart } from "@/lib/use-start";

import { Bridge } from "./bridge";
import { Chat } from "./chat";
import { FeaturedFallback } from "./featured";
import { FRAME, hue, Lamp, PanelHead, Scribble } from "./gallery";
import { GuestDetails } from "./guest-details";
import { Invite, MAX_PICKS } from "./invite";
import { Preview } from "./preview";
import { Problem } from "./problem";
import { ProgramMonitor, Readouts } from "./program";
import { RouterLog } from "./router-log";
import { Scope } from "./scope";
import { CommonGround, FanAges, Spectrum } from "./spectrum";
import { onAirLine, Wall } from "./wall";

const PREFIX = "/analyses/";
const NARROW = "(max-width: 1023px)";

export function AnalysisView({ id }: { id: string }) {
  // A run the chat starts takes over the URL with history.pushState, so the analysis shown follows the
  // path, Back returns to the one before, and the chat stays as it was.
  const pathname = usePathname();
  const shown = pathname.startsWith(PREFIX) ? decodeURIComponent(pathname.slice(PREFIX.length)) : id;
  const { analysis, error, retry, update } = useAnalysis(shown);

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
    if (!error) return <GallerySkeleton />;
    return (
      <div className={`${FRAME} py-3`}>
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
        <Gallery analysis={analysis} onRerun={rerun} onRewrite={rewrite} />
      ) : (
        <div className={`${FRAME} grid grid-cols-1 gap-3 py-3 lg:grid-cols-12`}>
          <div className="lg:col-span-4">
            <ProgramMonitor analysis={analysis} />
          </div>
          <div className="lg:col-span-8">
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
        </div>
      )}
    </>
  );
}

type UiState = {
  id: string;
  selected: string | null;
  picked: string[];
  deep: string | null;
};
const fresh = (id: string): UiState => ({
  id,
  selected: null,
  picked: [],
  deep: null,
});

type GalleryProps = {
  analysis: Analysis;
  onRerun: (analysis: Analysis) => void;
  onRewrite: (guestRef: string, idea: Idea) => void;
};

// The finished run: the desk readout and the program, then every guest on the bridge and the wall, the
// selected one on the preview monitor, and the run's data below.
function Gallery({ analysis, onRerun, onRewrite }: GalleryProps) {
  const { guests } = analysis;
  // Not keyed by the analysis, so the chat keeps its conversation across a rerun; what the host
  // selected and picked belongs to one analysis and starts over with the next.
  // A link to #guest-<ref> opens with that guest on preview. The gallery only mounts in the browser,
  // once the analysis has loaded, so the hash is there to read.
  const [ui, setUi] = useState<UiState>(() => {
    const ref = typeof window === "undefined" ? undefined : window.location.hash.match(/^#guest-(.+)$/)?.[1];
    return {
      ...fresh(analysis.id),
      selected: ref && guests.some((guest) => guest.ref === ref) ? ref : null,
    };
  });
  const current = ui.id === analysis.id ? ui : fresh(analysis.id);
  const change = (next: Partial<UiState>) =>
    setUi((state) => ({
      ...(state.id === analysis.id ? state : fresh(analysis.id)),
      ...next,
    }));
  const { selected: selectedRef, picked, deep } = current;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const deepRef = useRef<HTMLDivElement>(null);
  const figures = stats(analysis);

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
      }));
      window.history.replaceState(null, "", `#guest-${ref}`);
      // On one column the preview is below the wall: bring it up.
      if (window.matchMedia(NARROW).matches) {
        document.getElementById("preview-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [analysis.id],
  );

  const togglePick = (ref: string) =>
    change({
      picked: picked.includes(ref) ? picked.filter((other) => other !== ref) : [...picked, ref],
    });

  const openDeep = (ref: string) => {
    const next = deep === ref ? null : ref;
    change({ deep: next });
    if (next) requestAnimationFrame(() => deepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (!guests.length) {
    return (
      <div className={`${FRAME} grid grid-cols-1 gap-3 py-3 lg:grid-cols-12`}>
        <div className="lg:col-span-4">
          <ProgramMonitor analysis={analysis} />
        </div>
        <div className="panel rounded-[4px] p-6 lg:col-span-8">
          <p className="font-cond text-2xl font-semibold">No guests came back for this show.</p>
          <Link href="/" className="key mt-4">
            Find another show
          </Link>
        </div>
      </div>
    );
  }

  const deepGuest = guests.find((guest) => guest.ref === deep);

  return (
    <div className={`${FRAME} grid grid-cols-1 gap-3 py-3 lg:grid-cols-12`}>
      <div className="lg:col-span-4">
        <ProgramMonitor analysis={analysis} />
      </div>
      <div className="lg:col-span-8">
        <Readouts key={`readouts-${analysis.id}`} stats={figures} line={onAirLine(guests)} />
      </div>

      <div className="min-w-0 lg:col-span-8 lg:row-start-2">
        <Wall
          key={`wall-${analysis.id}`}
          guests={guests}
          selected={selected?.ref ?? null}
          highlighted={highlighted}
          picked={picked}
          onSelect={select}
          onHighlight={setHighlighted}
        />
      </div>

      {/* The preview sticks inside its column, which spans the wall row and the row below it. On one column it
          comes straight after the wall. */}
      <div className="lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-2">
        <aside
          id="preview-panel"
          aria-label="Preview"
          className="flex scroll-mt-16 flex-col gap-3 lg:sticky lg:top-15 lg:max-h-[calc(100dvh-4.5rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]"
        >
          {selected && (
            <Preview
              guest={selected}
              index={index}
              picked={picked.includes(selected.ref)}
              full={picked.length >= MAX_PICKS}
              open={deep === selected.ref}
              onPick={() => togglePick(selected.ref)}
              onOpen={() => openDeep(selected.ref)}
            />
          )}
          <PickBus guests={guests} picked={picked} onRemove={togglePick} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-col gap-3 lg:col-span-8 lg:row-start-3">
        <Bridge
          key={`bridge-${analysis.id}`}
          guests={guests}
          selected={selected?.ref ?? null}
          highlighted={highlighted}
          onSelect={select}
          onHighlight={setHighlighted}
        />
        <div ref={deepRef} id="deep-dive" className="scroll-mt-16" hidden={!deepGuest}>
          {deepGuest && (
            <section aria-labelledby="deep-title" className="panel rounded-[4px]">
              <PanelHead id="deep-title" title={`Episode & fans · ${deepGuest.name}`}>
                <button
                  type="button"
                  onClick={() => change({ deep: null })}
                  className="key min-h-8 px-2.5 py-1 text-xs"
                >
                  Close
                </button>
              </PanelHead>
              <div className="p-4">
                <GuestDetails
                  key={deepGuest.ref}
                  id={analysis.id}
                  guestRef={deepGuest.ref}
                  guestName={deepGuest.name}
                  showMap={analysis.audience_map}
                />
              </div>
            </section>
          )}
        </div>
        <Scope
          key={`scope-${analysis.id}`}
          guests={guests}
          selected={selected?.ref ?? null}
          highlighted={highlighted}
          onSelect={select}
          onHighlight={setHighlighted}
        />
        <Chat analysis={analysis} onRerun={onRerun} onRewrite={onRewrite} />
      </div>

      <div className="lg:col-span-12">
        <Spectrum key={`spectrum-${analysis.id}`} rows={analysis.audience_map} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:col-span-12">
        <FanAges stats={figures} />
        <CommonGround guests={guests} />
        <LeftOut analysis={analysis} />
      </div>

      {picked.length > 0 && (
        <div className="lg:col-span-12">
          <Invite analysis={analysis} picked={picked} onRemove={togglePick} />
        </div>
      )}

      <div className="lg:col-span-12">
        <RouterLog key={`routerlog-${analysis.id}`} calls={analysis.qloo_calls} stats={figures} />
      </div>
    </div>
  );
}

// The preview bus: the guests picked to invite, and the way to the invitations.
function PickBus({ guests, picked, onRemove }: { guests: Guest[]; picked: string[]; onRemove: (ref: string) => void }) {
  return (
    <section aria-labelledby="bus" className="panel rounded-[4px]">
      <PanelHead id="bus" title="Invite bus">
        <span className={picked.length ? "text-pvw" : ""}>
          {picked.length} / {MAX_PICKS}
        </span>
      </PanelHead>
      <div className="flex flex-col gap-3 p-3">
        <ol aria-label="Picked guests" className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: MAX_PICKS }, (_, slot) => {
            const guest = guests.find((g) => g.ref === picked[slot]);
            return (
              <li
                key={slot}
                className={`flex h-9 items-center justify-center rounded-[2px] ${guest ? "lamp" : "lamp-off"}`}
                style={hue("var(--pvw)")}
              >
                {guest ? (
                  <button
                    type="button"
                    onClick={() => onRemove(guest.ref)}
                    title={`Remove ${guest.name}`}
                    className="h-full w-full truncate px-1 font-cond text-xs font-semibold text-on-light uppercase"
                  >
                    {guest.name.split(/\s+/).pop()}
                    <span className="sr-only">: remove {guest.name}</span>
                  </button>
                ) : (
                  <span className="sr-only">Empty</span>
                )}
              </li>
            );
          })}
        </ol>
        {picked.length > 0 ? (
          <a href="#invite" className="key key-lit w-full" style={hue("var(--pvw)")}>
            Write {picked.length === 1 ? "the invitation" : `${picked.length} invitations`}
          </a>
        ) : (
          <p className="text-sm text-ink-dim">Pick guests with Invite to draft their invitations.</p>
        )}
      </div>
    </section>
  );
}

function LeftOut({ analysis }: { analysis: Analysis }) {
  return (
    <section aria-labelledby="left-out" className="panel flex flex-col rounded-[4px]">
      <PanelHead id="left-out" title="Left out">
        <span>{analysis.left_out.length}</span>
      </PanelHead>
      <div className="flex flex-col gap-3 p-4">
        {analysis.left_out.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {analysis.left_out.map(({ name, why }) => (
              <li key={`${name}-${why}`} className="flex items-center gap-1.5 rounded-[2px] bg-bezel px-2 py-1 text-sm">
                <Scribble color={why === "host" ? "var(--amber)" : "var(--balanced)"} className="text-[0.625rem]">
                  {why === "host" ? "Host" : "Past guest"}
                </Scribble>
                {name}
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

// Holds the gallery's place while the page loads, so nothing jumps when it arrives.
export function GallerySkeleton() {
  return (
    <div aria-busy className={`${FRAME} grid grid-cols-1 gap-3 py-3 lg:grid-cols-12`}>
      <span className="sr-only">Loading the analysis</span>
      <div className="panel h-72 rounded-[4px] lg:col-span-4" />
      <div className="panel h-72 rounded-[4px] lg:col-span-8" />
      <div className="panel h-56 rounded-[4px] lg:col-span-8" />
      <div className="panel h-56 rounded-[4px] lg:col-span-4" />
    </div>
  );
}

// The run's six steps as a rundown, with a scope searching while Echo works. Fixed heights, so polling
// never moves the page.
function Rundown({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((step) => !step.done);
  const done = steps.filter((step) => step.done).length;
  return (
    <section aria-labelledby="running" className="panel flex h-full flex-col rounded-[4px]">
      <PanelHead id="running" title="Rundown">
        <span className="text-amber">
          {done} / {steps.length}
        </span>
      </PanelHead>
      <div className="grid flex-1 gap-4 p-4 md:grid-cols-[1fr_1.2fr]">
        <ol className="flex flex-col">
          {steps.map((step, index) => {
            const on = index === current;
            return (
              <li
                key={step.key}
                aria-current={on ? "step" : undefined}
                className={`flex h-11 items-center gap-3 border-b border-line ${step.done || on ? "text-ink" : "text-ink-dim"}`}
              >
                <span className="silk w-6 text-ink-dim">{String(index + 1).padStart(2, "0")}</span>
                <Lamp
                  color={step.done ? "var(--pvw)" : "var(--amber)"}
                  on={step.done || on}
                  className={`h-3 w-5 ${on ? "cue" : ""}`}
                />
                <span className={on ? "font-semibold" : ""}>{step.label}</span>
                <span className="sr-only">{step.done ? "(done)" : on ? "(running)" : "(waiting)"}</span>
              </li>
            );
          })}
        </ol>
        <div aria-hidden className="monitor relative flex min-h-64 flex-col overflow-hidden rounded-[2px]">
          <svg viewBox="0 0 400 260" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {[0.25, 0.5, 0.75].map((t) => (
              <g key={t} stroke="var(--line)" strokeOpacity="0.6">
                <line x1={t * 400} x2={t * 400} y1={0} y2={260} />
                <line x1={0} x2={400} y1={t * 260} y2={t * 260} />
              </g>
            ))}
          </svg>
          <span className="searching absolute inset-y-0 w-1/4" />
          {/* The logo's rings, sounding while Echo listens. */}
          <svg viewBox="0 0 200 200" className="absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2">
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                className="ring"
                cx="100"
                cy="100"
                r="8"
                fill="none"
                stroke="var(--amber)"
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: `${i * 0.9}s` }}
              />
            ))}
            <circle cx="100" cy="100" r="5" fill="var(--amber)" />
          </svg>
          <div className="relative mt-auto flex flex-col gap-2 p-3">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-cond text-xl font-semibold text-amber">
                {current >= 0 ? steps[current].label : "Finishing"}
              </span>
              <span className="font-cond text-3xl leading-none font-semibold">
                {String(done).padStart(2, "0")}
                <span className="text-ink-dim">/{String(steps.length).padStart(2, "0")}</span>
              </span>
            </span>
            <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
              {steps.map((step, index) => (
                <span
                  key={step.key}
                  className={`h-1.5 rounded-[1px] ${step.done || index === current ? "lamp" : "lamp-off"} ${index === current ? "cue" : ""}`}
                  style={hue(step.done ? "var(--pvw)" : "var(--amber)")}
                />
              ))}
            </span>
          </div>
        </div>
      </div>
      <p className="px-4 pb-4 text-sm text-ink-soft">Echo is running. It usually takes under twenty seconds.</p>
      <p aria-live="polite" className="sr-only">
        {current >= 0 ? `${steps[current].label}, step ${current + 1} of ${steps.length}.` : "Finishing."}
      </p>
    </section>
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
  return {
    ...filters,
    episode_about: about && { query: about.query, type: about.type },
  };
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
          <Link href="/" className="key self-start">
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
          className="key key-lit self-start"
          style={hue("var(--ink)")}
        >
          {retrying ? "Starting…" : "Try again"}
        </button>
      );
    case "previous":
      return (
        <button type="button" onClick={() => router.back()} className="key self-start">
          Go back
        </button>
      );
    case "home":
      return (
        <Link href="/" className="key self-start">
          Find your show
        </Link>
      );
    default:
      return null;
  }
}
