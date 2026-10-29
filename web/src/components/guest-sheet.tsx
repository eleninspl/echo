"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import type { Analysis, Guest } from "@/lib/echo";
import { labelMeans, LABELS } from "@/lib/format";
import { useEpisodeLength } from "@/lib/invitations";
import { rewrittenIdea } from "@/lib/rewrites";

import type { Rewrite } from "./analysis-view";
import { AgeLamps, GuestLinks, PickButton, Scores, TasteChips } from "./dossier";
import { GuestEpisode, GuestFans, useGuestDetails } from "./guest-details";
import { Picture } from "./guest-list";
import { Chip, LABEL_HUE, out100, Part, rank, SHEET_WIDTH } from "./hud";


type Props = {
  analysis: Analysis;
  guestRef: string | null;
  picked: string[];
  rewritten: Rewrite | null;
  onPick: (guestRef: string) => void;
  onOpen: (guestRef: string) => void;
  onClose: () => void;
};

export function GuestSheet({
  analysis,
  guestRef,
  picked,
  rewritten,
  onPick,
  onOpen,
  onClose,
}: Props) {
  const { guests } = analysis;
  const [last, setLast] = useState(guestRef);
  if (guestRef !== null && guestRef !== last) setLast(guestRef);
  const shown = guestRef ?? last;
  const index = guests.findIndex((guest) => guest.ref === shown);
  const guest: Guest | undefined = guests[index];
  const previous = index > 0 ? guests[index - 1] : undefined;
  const next = index >= 0 ? guests[index + 1] : undefined;
  const open = guestRef !== null;
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const shownRewrite = useRef(rewritten);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [shown]);

  useEffect(() => {
    if (!rewritten || rewritten.ref !== shown || rewritten === shownRewrite.current) return;
    shownRewrite.current = rewritten;
    document.getElementById("sheet-idea")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [rewritten, shown]);

  useEffect(() => {
    if (open) heading.current?.focus({ preventScroll: true });
  }, [open, shown]);

  useEffect(() => {
    if (!open) return;
    const keys = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [role=dialog]")) return;
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && previous) onOpen(previous.ref);
      else if (event.key === "ArrowRight" && next) onOpen(next.ref);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [open, previous, next, onOpen, onClose]);

  return (
    <aside
      aria-label={guest ? guest.name : "Guest"}
      inert={!open}
      className={`fixed inset-0 z-50 flex flex-col bg-void transition-[translate,visibility] duration-500 ease-(--ease-out) motion-reduce:transition-none lg:top-14 lg:left-auto lg:z-30 lg:border-l lg:border-steel lg:shadow-pop ${SHEET_WIDTH} ${
        open ? "visible translate-x-0" : "invisible translate-x-full"
      }`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-steel px-3 sm:px-5">
        <div className="flex items-center">
          <Round label="Close" onClick={onClose}>
            <path d="M3 3l6 6M9 3l-6 6" />
          </Round>
          <span aria-hidden className="mx-2 h-5 w-px bg-steel" />
          <Round label="Previous guest" disabled={!previous} onClick={() => previous && onOpen(previous.ref)}>
            <path d="M7.5 2.5L4 6l3.5 3.5" />
          </Round>
          <span className="readout px-1 text-sm">
            {guest ? rank(index) : "–"}
            <span className="text-ink-dim"> / {guests.length}</span>
          </span>
          <Round label="Next guest" disabled={!next} onClick={() => next && onOpen(next.ref)}>
            <path d="M4.5 2.5L8 6 4.5 9.5" />
          </Round>
        </div>
        {guest && (
          <div className="flex items-center gap-2">
            <PickButton guestName={guest.name} picked={picked.includes(guest.ref)} onPick={() => onPick(guest.ref)} />
          </div>
        )}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {guest ? (
          <GuestBody
            key={guest.ref}
            analysis={analysis}
            guest={guest}
            rewritten={Boolean(guest.idea?.rewritten)}
            heading={heading}
          />
        ) : (
          <p className="px-5 pt-8 font-display text-2xl font-semibold sm:px-8">This guest isn&apos;t in this run.</p>
        )}
      </div>
    </aside>
  );
}

function GuestBody({
  analysis,
  guest,
  rewritten,
  heading,
}: {
  analysis: Analysis;
  guest: Guest;
  rewritten: boolean;
  heading: RefObject<HTMLHeadingElement | null>;
}) {
  const { scores, idea, evidence } = guest;
  const color = LABEL_HUE[guest.label];
  const sweet = guest.label === "sweet_spot";
  const length = useEpisodeLength(analysis.show.id);
  // A rewrite brings its own episode.
  const details = useGuestDetails(analysis.id, guest.ref, rewrittenIdea(guest), length);
  // Narrow, the parts run in one column; wide, the guest and their idea sit on the left, the evidence and the
  // episode on the right, and the two audiences side by side across the bottom, in the same reading order.
  return (
    <div className="@container">
      <div className="rise grid grid-cols-1 gap-10 px-5 pt-7 pb-28 sm:px-8 @[46rem]:grid-cols-2 @[46rem]:gap-x-10">
        <div className="flex min-w-0 flex-col gap-10">
          <header className="flex flex-col gap-6">
            <div className="flex items-center gap-5">
              <span
                className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-well sm:size-28 @[46rem]:size-20"
                style={{
                  boxShadow: sweet ? `0 0 0 2px var(--void), 0 0 0 4px ${color}` : "inset 0 0 0 1px var(--steel)",
                }}
              >
                <Picture guest={guest} sizes="112px" />
              </span>
              <div className="min-w-0">
                <Chip color={color}>{LABELS[guest.label].name}</Chip>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="mt-1.5 font-display text-3xl leading-[1.05] font-semibold text-balance outline-none! sm:text-4xl @[46rem]:text-3xl"
                >
                  {guest.name}
                </h2>
                {(guest.bio || guest.description) && (
                  <p className="mt-1.5 text-pretty text-ink-soft">{guest.bio || guest.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="flex items-baseline justify-between gap-3">
                <span className="tag text-ink-dim">Scores, out of 100</span>
                <span className="flex items-baseline gap-2">
                  <span className="tag text-ink-dim">Echo score</span>
                  <span className="readout text-3xl">{out100(scores.echo)}</span>
                </span>
              </p>
              <Scores scores={scores} bars={64} height={44} readout="text-[1.75rem]" />
            </div>
            <p className="text-sm text-ink-soft">
              <span className="font-semibold" style={{ color }}>
                {LABELS[guest.label].name}.
              </span>{" "}
              {labelMeans(guest.label, scores.reach === null)}
            </p>
            <GuestLinks links={guest.links} />
          </header>

          <Part
            id="sheet-idea"
            title="Episode idea"
            className="scroll-mt-4"
            aside={
              rewritten && (
                <Chip color="var(--accent)" plain>
                  Rewritten by Echo
                </Chip>
              )
            }
          >
            {idea ? (
              <div className="flex flex-col gap-3">
                <p className="font-display text-2xl leading-tight font-semibold text-balance">{idea.title}</p>
                <p className="text-ink-soft">{idea.pitch}</p>
                <div className="mt-1 flex flex-col gap-1">
                  <p className="tag text-ink-dim">Why them</p>
                  <p className="text-sm">{idea.reason}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-dim">
                {!analysis.guests.some((other) => other.idea)
                  ? "Episode ideas are off in this demo."
                  : evidence
                    ? "No episode idea yet."
                    : "Echo writes ideas and evidence for the top 10."}
              </p>
            )}
          </Part>
        </div>
        <div className="flex min-w-0 flex-col gap-10">
          {evidence && (
            <Part id="sheet-meet" title="Where your audiences meet">
              <dl className="grid gap-6 sm:grid-cols-2">
                <Fact term="Both audiences love">
                  {evidence.shared_tastes.length ? (
                    <TasteChips names={evidence.shared_tastes} color="var(--fit)" />
                  ) : (
                    <span className="text-sm text-ink-dim">Nothing in common yet.</span>
                  )}
                </Fact>
                <Fact term="Their fans' podcasts, new to you">
                  {evidence.new_podcasts.length ? (
                    <TasteChips names={evidence.new_podcasts} color="var(--reach)" />
                  ) : (
                    <span className="text-sm text-ink-dim">None new to you.</span>
                  )}
                </Fact>
                {evidence.ages.length > 0 && (
                  <Fact term="Their fans' age groups" className="sm:col-span-2">
                    <AgeLamps ages={evidence.ages} />
                  </Fact>
                )}
              </dl>
            </Part>
          )}

          <GuestEpisode id={guest.ref} details={details} ideaTitle={guest.idea?.title} />
        </div>
        <GuestFans
          id={guest.ref}
          details={details}
          showMap={analysis.audience_map}
          guestName={guest.name}
          className="@[46rem]:col-span-2"
        />
      </div>
    </div>
  );
}

function Fact({ term, className = "", children }: { term: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <dt className="tag text-ink-dim">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Round({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-deck-hi hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      <svg aria-hidden viewBox="0 0 12 12" className="size-3.5">
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          {children}
        </g>
      </svg>
    </button>
  );
}
