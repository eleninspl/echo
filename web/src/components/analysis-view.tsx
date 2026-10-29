"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { Analysis, Idea, LeaveOutWhy, MapFocus } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { filterPhrases } from "@/lib/format";
import { LEFT_OUT_LIMIT, useLeftOut, WHY_NAMES, type LeftOutGuest } from "@/lib/left-out";
import { analysisPath, guestPath, readPath } from "@/lib/paths";
import { readPicks, savePicks, type Pick } from "@/lib/picks";
import type { Ask, Pointer } from "@/lib/pointer";
import { readRewrites, saveRewrite, withRewrites } from "@/lib/rewrites";
import { stats as computeStats } from "@/lib/stats";
import { useAnalysis, useRerun, type Rerun } from "@/lib/use-analysis";
import { usePacedRun } from "@/lib/use-paced";
import { useStart } from "@/lib/use-start";

import { Backdrop } from "./backdrop";
import { AskSection, carryChat, Chat } from "./chat";
import { FeaturedFallback } from "./featured";
import { GuestList } from "./guest-list";
import { GuestSheet } from "./guest-sheet";
import { Chip, FRAME, hue, SectionHead, SHEET_ROOM } from "./hud";
import { LabelSpectrum, LockHeader, requestFilters, ShowLock } from "./lock-header";
import { PageNav } from "./page-nav";
import { PickBar } from "./pick-bar";
import { Rundown } from "./run-board";
import { Problem } from "./problem";
import { Scope } from "./scope";
import { FanAges } from "./spectrum";
import { TasteMap } from "./taste-map";
import { TopPicks } from "./top-picks";

type OpenAnalysis = {
  analysis: Analysis;
  openGuest: string | null;
  onOpen: (guestRef: string) => void;
  onClose: () => void;
  picked: string[];
  onPick: (guestRef: string) => void;
  // Picks for this show that aren't in this run, and a way to drop them.
  missing: Pick[];
  onForget: () => void;
  onUnpick: (id: string) => void;
  rerun: Rerun;
  rewritten: Rewrite | null;
  onAskSlot: Dispatch<SetStateAction<HTMLElement | null>>;
  leftOut: LeftOutGuest[];
  onBringBack: (id: string) => void;
  pointer: Pointer | null;
  onClearPointer: () => void;
  bridged: string | null;
  onBridge: (guestId: string | null) => void;
  onAsk: (ask: Ask) => void;
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
  const { analysis: polled, error, retry, update } = useAnalysis(id);
  // The run screen shows each step long enough to read, so the page opens once it has caught up with the engine.
  const loadedAnalysis = usePacedRun(polled);
  const [picks, setPicks] = useState<Choice<Pick[]>>({ id: null, value: [] });
  const openId = loadedAnalysis?.id ?? null;
  const showId = loadedAnalysis?.show.id ?? null;
  const [leftOut, setLeftOut] = useLeftOut(showId ?? "");
  const excluded = useMemo(() => leftOut.map(({ id }) => id), [leftOut]);
  const analysis = useMemo(() => {
    if (!loadedAnalysis || !excluded.length) return loadedAnalysis;
    return { ...loadedAnalysis, guests: loadedAnalysis.guests.filter((guest) => !excluded.includes(guest.id)) };
  }, [loadedAnalysis, excluded]);
  const saved = useMemo(() => (picks.id === showId ? picks.value : showId ? readPicks(showId) : []), [picks, showId]);
  const guests = useMemo(() => analysis?.guests ?? [], [analysis]);
  // Picks are saved by entity ID and shown by this run's refs, in the order they were picked.
  const picked = saved.flatMap(({ id }) => guests.find((guest) => guest.id === id)?.ref ?? []);
  const missing = analysis?.status === "done" ? saved.filter(({ id }) => !guests.some((guest) => guest.id === id)) : [];
  const [rewritten, setRewritten] = useState<Rewrite | null>(null);
  const [askSlot, setAskSlot] = useState<HTMLElement | null>(null);
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [bridged, setBridged] = useState<string | null>(null);
  const pointed = useRef(0);
  const asker = useRef<((ask: Ask) => void) | null>(null);
  const onPoint = useCallback((focus: MapFocus) => {
    pointed.current += 1;
    setBridged(null);
    setPointer({ ...focus, key: pointed.current });
  }, []);
  const onClearPointer = useCallback(() => setPointer(null), []);
  const onAsker = useCallback((ask: ((ask: Ask) => void) | null) => {
    asker.current = ask;
  }, []);
  const onAsk = useCallback((ask: Ask) => asker.current?.(ask), []);
  const openedHere = useRef(false);
  const openGuest = openId === id ? guestRef : null;

  useEffect(() => {
    if (!guestRef) openedHere.current = false;
  }, [guestRef]);

  // Arriving from the landing, Next keeps its scroll, which would open the analysis part way down.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // This browser's rewritten ideas, in place before the page paints.
  const loaded = analysis?.status === "done" ? analysis.id : null;
  useLayoutEffect(() => {
    if (loaded) update((current) => (current.id === loaded ? withRewrites(current, readRewrites(loaded)) : current));
  }, [loaded, update]);

  const showRun = useCallback(
    (next: Analysis) => router.push(analysisPath(next.id), { scroll: inviting }),
    [router, inviting],
  );
  // A filter or taste rerun lands at the top, where the new guests and their filters are. Next keeps the scroll
  // across the shared layout, so the page scrolls itself once the new run is in.
  const toTop = useRef(false);
  const showRerun = useCallback(
    (next: Analysis) => {
      toTop.current = true;
      if (openId) {
        const phrases = filterPhrases(next.filters);
        carryChat(openId, next.id, `The page shows a new run${phrases.length ? `: ${phrases.join(", ")}` : ""}.`);
      }
      router.push(analysisPath(next.id), { scroll: false });
    },
    [router, openId],
  );
  const rerun = useRerun(showId ?? "", openId, showRerun, excluded);

  useEffect(() => {
    if (!toTop.current || !openId) return;
    toTop.current = false;
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [openId]);
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
      if (!openId) return;
      saveRewrite(openId, ref, idea);
      update((current) => withRewrites(current, { [ref]: idea }));
      setRewritten({ id: openId, ref, idea });
      onOpen(ref);
    },
    [update, openId, onOpen],
  );
  const keep = useCallback(
    (value: Pick[]) => {
      if (!showId) return;
      setPicks({ id: showId, value });
      savePicks(showId, value);
    },
    [showId],
  );
  const onPick = useCallback(
    (ref: string) => {
      const guest = guests.find((other) => other.ref === ref);
      if (!guest) return;
      keep(
        saved.some(({ id }) => id === guest.id)
          ? saved.filter(({ id }) => id !== guest.id)
          : [
              ...saved,
              {
                id: guest.id,
                name: guest.name,
                analysis: openId ?? undefined,
                ref: guest.ref,
                image_url: guest.image_url ?? undefined,
                label: guest.label,
              },
            ],
      );
    },
    [guests, saved, keep, openId],
  );
  const onUnpick = useCallback((id: string) => keep(saved.filter((pick) => pick.id !== id)), [saved, keep]);
  const onLeaveOut = useCallback(
    (ref: string, why: LeaveOutWhy) => {
      const index = guests.findIndex((other) => other.ref === ref);
      const guest = guests[index];
      if (!guest || !openId) return;
      setLeftOut((current) =>
        [...current.filter(({ id }) => id !== guest.id), { id: guest.id, name: guest.name, why }].slice(
          -LEFT_OUT_LIMIT,
        ),
      );
      if (saved.some(({ id }) => id === guest.id)) keep(saved.filter(({ id }) => id !== guest.id));
      if (guestRef !== ref) return;
      const next = guests[index + 1] ?? guests[index - 1];
      if (next) router.replace(guestPath(openId, next.ref), { scroll: false });
      else onClose();
    },
    [guests, openId, setLeftOut, saved, keep, guestRef, router, onClose],
  );
  const onBringBack = useCallback(
    (id: string) => setLeftOut((current) => current.filter((guest) => guest.id !== id)),
    [setLeftOut],
  );
  const onForget = useCallback(
    () => keep(saved.filter(({ id }) => guests.some((guest) => guest.id === id))),
    [guests, saved, keep],
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
            <Rundown analysis={analysis} />
          ) : (
            <Failed analysis={analysis} />
          )}
        </div>
      </>
    );
  }

  return (
    <OpenAnalysisContext
      value={{
        analysis,
        openGuest,
        onOpen,
        onClose,
        picked,
        onPick,
        missing,
        onForget,
        onUnpick,
        rerun,
        rewritten,
        onAskSlot: setAskSlot,
        leftOut,
        onBringBack,
        pointer,
        onClearPointer,
        bridged,
        onBridge: setBridged,
        onAsk,
      }}
    >
      {children}
      <Chat
        analysis={analysis}
        exclude={excluded}
        onRerun={showRun}
        onRewrite={rewrite}
        onLeaveOut={onLeaveOut}
        onPoint={onPoint}
        onOpenGuest={onOpen}
        onAsker={onAsker}
        beside={openGuest !== null}
        slot={askSlot}
      />
    </OpenAnalysisContext>
  );
}

export function Console() {
  const {
    analysis,
    openGuest,
    onOpen,
    onClose,
    picked,
    onPick,
    missing,
    onForget,
    rerun,
    rewritten,
    onAskSlot,
    leftOut,
    onBringBack,
    pointer,
    onClearPointer,
    bridged,
    onBridge,
    onAsk,
  } = useOpenAnalysis();
  const { guests } = analysis;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const figures = computeStats(analysis);
  const open = guests.find((guest) => guest.ref === openGuest);
  const beside = openGuest !== null;
  const place = useKeptPlace(beside);

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
      {...place}
      className={`flex flex-1 flex-col transition-[padding] duration-500 ease-(--ease-out) motion-reduce:transition-none ${beside ? SHEET_ROOM : ""}`}
    >
      <title>{open ? `${open.name} · ${analysis.show.title} · Echo` : `${analysis.show.title} · Echo`}</title>
      <PageNav
        show={analysis.show}
        lock="show-head"
        stops={[
          {
            id: "top-picks",
            label: guests.some(({ label }) => label === "sweet_spot") ? "Start with these" : "Closest",
          },
          { id: "scope", label: "Compare" },
          { id: "guests", label: "Ranked" },
          { id: "tastes", label: "Listeners" },
          { id: "ask-echo", label: "Ask Echo" },
        ]}
      />
      <Backdrop>
        <div id="show-head" className={`${FRAME} @container pt-10 pb-12 sm:pt-12`}>
          <LockHeader
            key={`lock-${analysis.id}`}
            analysis={analysis}
            stats={figures}
            missing={missing}
            onForget={onForget}
          />
        </div>
      </Backdrop>

      <div className={`${FRAME} @container flex flex-1 flex-col gap-20 pb-36`}>
        <TopPicks
          key={`picks-${analysis.id}`}
          guests={guests}
          ideas={figures.ideas > 0}
          picked={picked}
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
              to you. A bigger dot means their fans are likelier to enjoy your show. The box at the top right holds high
              fit and high reach: its ringed dots are the sweet spots, whose fans also love your show back, and the
              others are one-way, whose fans are less likely to.
            </p>
            <LabelSpectrum stats={figures} className="@4xl:w-[34rem] @4xl:shrink-0" />
          </div>
        </Scope>
        <GuestList
          key={`list-${analysis.id}`}
          analysisId={analysis.id}
          guests={guests}
          ideas={figures.ideas > 0}
          open={openGuest}
          highlighted={highlighted}
          picked={picked}
          onOpen={onOpen}
          onPick={onPick}
          onHighlight={setHighlighted}
        />
        <section
          aria-label="Your listeners"
          className="grid grid-cols-1 gap-x-12 gap-y-14 border-t border-steel pt-14 @3xl:grid-cols-2"
        >
          <div className="@3xl:col-span-2">
            <TasteMap
              key={`tastes-${analysis.id}`}
              analysis={analysis}
              rerun={rerun}
              pointer={pointer}
              onClearPointer={onClearPointer}
              bridged={bridged}
              onBridge={onBridge}
              onAsk={onAsk}
              onOpen={onOpen}
            />
          </div>
          {figures.withAges > 0 && <FanAges stats={figures} />}
          <LeftOut analysis={analysis} leftOut={leftOut} onBringBack={onBringBack} />
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
        onBridge={onBridge}
      />
      <PickBar analysis={analysis} picked={picked} earlier={missing} beside={beside} />
    </div>
  );
}

// The guest panel takes room from the page on a wide screen, so everything reflows under the pointer. This keeps
// what was pressed to open it (a card, a row, a dot) where it was while the page settles, and again when it
// closes, when focus goes back to it. Spread the handlers on the page, outside the panel.
function useKeptPlace(beside: boolean) {
  const pressed = useRef<Element | null>(null);
  const opener = useRef<Element | null>(null);
  const was = useRef(beside);

  useLayoutEffect(() => {
    if (was.current === beside) return;
    was.current = beside;
    if (beside) {
      const on = pressed.current;
      opener.current = on?.isConnected && !on.closest("aside") ? on : null;
      return opener.current ? pin(opener.current) : undefined;
    }
    const back = opener.current;
    opener.current = null;
    if (!back?.isConnected) return;
    back.closest<HTMLElement>("a, button, [tabindex]")?.focus({ preventScroll: true });
    return pin(back);
  }, [beside]);

  return {
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => {
      pressed.current = event.target as Element;
    },
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") pressed.current = event.target as Element;
    },
  };
}

// Holds an element at its place in the viewport for as long as the panel's slide takes, unless you scroll first.
function pin(anchor: Element): (() => void) | undefined {
  const top = anchor.getBoundingClientRect().top;
  if (top < 0 || top > window.innerHeight) return undefined;
  const until = performance.now() + 700;
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchmove", stop);
  };
  const step = () => {
    const drift = anchor.getBoundingClientRect().top - top;
    if (Math.abs(drift) >= 1) window.scrollBy(0, drift);
    if (performance.now() < until) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchmove", stop, { passive: true });
  return stop;
}

function LeftOut({
  analysis,
  leftOut,
  onBringBack,
}: {
  analysis: Analysis;
  leftOut: LeftOutGuest[];
  onBringBack: (id: string) => void;
}) {
  const count = analysis.left_out.length + leftOut.length;
  return (
    <section aria-labelledby="left-out" className="flex flex-col gap-4">
      <SectionHead id="left-out" title="Left out" small>
        <span>{count}</span>
      </SectionHead>
      <div className="flex flex-col gap-3">
        {count ? (
          <ul className="flex flex-col gap-1.5">
            {leftOut.map(({ id, name, why }) => (
              <li key={id} className="flex items-center justify-between gap-3 border-b border-steel pb-1.5 text-sm">
                <span className="min-w-0 truncate">{name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Chip color="var(--accent)">{WHY_NAMES[why]}</Chip>
                  <button
                    type="button"
                    onClick={() => onBringBack(id)}
                    className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
                  >
                    Bring back<span className="sr-only"> {name}</span>
                  </button>
                </span>
              </li>
            ))}
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
          Echo leaves out the show&apos;s hosts, people already in its episode titles, and anyone you leave out. Yours
          stay out of every run of this show until you bring them back.
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

function Failed({ analysis }: { analysis: Analysis }) {
  const { start, pending, error } = useStart();
  // A failed restart replaces the run's own error, and its next step with it.
  const problem = describe(error ?? analysis.error);
  return (
    <Problem problem={problem}>
      <NextStep
        problem={problem}
        onRetry={() => start(analysis.show.id, requestFilters(analysis.filters))}
        onBroaden={() => start(analysis.show.id)}
        retrying={pending !== null}
      />
    </Problem>
  );
}

function NextStep({
  problem,
  onRetry,
  onBroaden,
  retrying = false,
}: {
  problem: HostError;
  onRetry: () => void;
  // Runs the show again without filters, for a run they narrowed too far.
  onBroaden?: () => void;
  retrying?: boolean;
}) {
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
    // Never the browser's Back: from a direct link it would leave Echo.
    case "previous":
      return (
        <div className="flex flex-wrap gap-2">
          {onBroaden && (
            <button
              type="button"
              onClick={onBroaden}
              disabled={retrying}
              className="btn btn-solid"
              style={hue("var(--ink)")}
            >
              {retrying ? "Starting…" : "Run without filters"}
            </button>
          )}
          <Link href="/" className="btn">
            Find another show
          </Link>
        </div>
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
