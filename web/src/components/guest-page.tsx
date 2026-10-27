"use client";

import Link from "next/link";

import type { Guest } from "@/lib/echo";
import { labelMeans, LABELS } from "@/lib/format";
import { analysisPath, guestPath } from "@/lib/paths";

import { useOpenAnalysis } from "./analysis-view";
import { Briefing } from "./briefing";
import { AgeLamps, GuestLinks, PickButton, Scores, TasteChips } from "./dossier";
import { GuestDetails } from "./guest-details";
import { Picture } from "./guest-list";
import { Chip, FRAME, LABEL_HUE, out100, rank, ZoneHead } from "./hud";
import { MAX_PICKS } from "./invite";

export function GuestPage({ guestRef }: { guestRef: string }) {
  const { analysis, picked, onPick } = useOpenAnalysis();
  const { guests, show } = analysis;
  const index = guests.findIndex((guest) => guest.ref === guestRef);
  const guest: Guest | undefined = guests[index];

  if (!guest) {
    return (
      <div className={`${FRAME} pt-4 pb-24`}>
        <title>{`${show.title} · Echo`}</title>
        <div className="zone flex flex-col items-start gap-4 p-6">
          <p className="font-display text-2xl font-semibold">This guest isn&apos;t in this run.</p>
          <Link href={analysisPath(analysis.id)} className="btn">
            See all guests
          </Link>
        </div>
      </div>
    );
  }

  const { scores, idea, evidence } = guest;
  const color = LABEL_HUE[guest.label];
  return (
    <div className={`${FRAME} flex flex-col gap-4 pt-4 pb-24`}>
      <title>{`${guest.name} · ${show.title} · Echo`}</title>
      <GuestNav analysisId={analysis.id} showTitle={show.title} guests={guests} index={index} />

      <section aria-labelledby="profile-name" className="zone">
        <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-well md:aspect-[4/5]">
            <Picture guest={guest} sizes="(min-width: 1024px) 272px, (min-width: 768px) 240px, 100vw" />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="tag text-ink-dim">
                Guest {rank(index)} of {guests.length}
              </span>
              <Chip color={color}>{LABELS[guest.label].name}</Chip>
            </div>
            <div>
              <h1
                id="profile-name"
                className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[0.95] font-semibold text-balance"
              >
                {guest.name}
              </h1>
              {guest.description && <p className="mt-2 text-ink-soft">{guest.description}</p>}
            </div>
            <p className="max-w-[60ch] text-sm text-ink-soft">
              <span className="font-semibold" style={{ color }}>
                {LABELS[guest.label].name}.
              </span>{" "}
              {labelMeans(guest.label, scores.reach === null)}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <PickButton
                guestName={guest.name}
                picked={picked.includes(guest.ref)}
                full={picked.length >= MAX_PICKS}
                onPick={() => onPick(guest.ref)}
              />
              <GuestLinks links={guest.links} />
            </div>
          </div>
          <div className="screen flex flex-col gap-4 p-4 sm:p-5 md:col-span-2 lg:col-span-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="tag text-ink-dim">Scores, out of 100</p>
              <p className="flex items-baseline gap-2">
                <span className="tag text-ink-dim">Echo score</span>
                <span className="readout text-3xl">{out100(scores.echo)}</span>
              </p>
            </div>
            <Scores scores={scores} bars={72} height={48} readout="text-[2rem]" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section aria-labelledby="idea" className="zone flex flex-col lg:col-span-5">
          <ZoneHead id="idea" title="Episode idea" />
          <div className="flex flex-col gap-3 px-5 pt-2 pb-5">
            {idea ? (
              <>
                <p className="font-display text-2xl leading-tight font-semibold text-balance">{idea.title}</p>
                <p className="text-ink-soft">{idea.pitch}</p>
                <div className="flex flex-col gap-1.5 border-t border-steel pt-3">
                  <p className="tag text-ink-dim">Why them</p>
                  <p className="text-sm">{idea.reason}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-dim">
                {evidence ? "No episode idea yet." : "Echo writes ideas and evidence for the top 10."}
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="meet" className="zone flex flex-col lg:col-span-7">
          <ZoneHead id="meet" title="Where your audiences meet" />
          {evidence ? (
            <dl className="grid gap-5 px-5 pt-2 pb-5 sm:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-2">
                <dt className="tag text-ink-dim">Both audiences love</dt>
                <dd>
                  {evidence.shared_tastes.length ? (
                    <TasteChips names={evidence.shared_tastes} color="var(--fit)" />
                  ) : (
                    <span className="text-sm text-ink-dim">Nothing in common yet.</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-2">
                <dt className="tag text-ink-dim">Their fans&apos; podcasts, new to you</dt>
                <dd>
                  {evidence.new_podcasts.length ? (
                    <TasteChips names={evidence.new_podcasts} color="var(--reach)" />
                  ) : (
                    <span className="text-sm text-ink-dim">None new to you.</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-1">
                <dt className="tag text-ink-dim">Their fans&apos; ages</dt>
                <dd className="flex flex-col gap-2">
                  <AgeLamps ages={evidence.ages} />
                </dd>
              </div>
            </dl>
          ) : (
            <p className="px-5 pt-2 pb-5 text-sm text-ink-dim">Echo writes ideas and evidence for the top 10.</p>
          )}
        </section>
      </div>

      <GuestDetails
        key={`${analysis.id}/${guest.ref}`}
        id={analysis.id}
        guestRef={guest.ref}
        showMap={analysis.audience_map}
      />

      <section aria-labelledby="brief" className="zone flex flex-col">
        <ZoneHead id="brief" title="Before you record" />
        <div className="px-5 pt-2 pb-5">
          <Briefing key={`${analysis.id}/${guest.ref}`} id={analysis.id} guestRef={guest.ref} guestName={guest.name} />
        </div>
      </section>
    </div>
  );
}

function GuestNav({
  analysisId,
  showTitle,
  guests,
  index,
}: {
  analysisId: string;
  showTitle: string;
  guests: Guest[];
  index: number;
}) {
  const previous = guests[index - 1];
  const next = guests[index + 1];
  return (
    <nav aria-label="Guests" className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href={`${analysisPath(analysisId)}#guest-${guests[index].ref}`}
        className="group flex min-w-0 items-center gap-3 rounded-full py-1 pr-2"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-deck shadow-[inset_0_0_0_1px_var(--steel)] transition-colors group-hover:bg-deck-hi">
          <svg aria-hidden viewBox="0 0 12 12" className="size-3">
            <path d="M10 6H2M5.5 2.5L2 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-[0.9375rem] font-semibold">All guests</span>
          <span className="truncate text-xs text-ink-dim">{showTitle}</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <Step guest={previous} at={index - 1} analysisId={analysisId} direction="previous" />
        <Step guest={next} at={index + 1} analysisId={analysisId} direction="next" />
      </div>
    </nav>
  );
}

function Step({
  guest,
  at,
  analysisId,
  direction,
}: {
  guest: Guest | undefined;
  at: number;
  analysisId: string;
  direction: "previous" | "next";
}) {
  const arrow = (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0">
      <path
        d={direction === "previous" ? "M7.5 2.5L4 6l3.5 3.5" : "M4.5 2.5L8 6 4.5 9.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
  if (!guest) {
    return <span className="btn btn-sm pointer-events-none opacity-40">{arrow}</span>;
  }
  return (
    <Link
      href={guestPath(analysisId, guest.ref)}
      rel={direction === "previous" ? "prev" : "next"}
      className="btn btn-sm max-w-[16rem]"
    >
      {direction === "previous" && arrow}
      <span className="readout text-xs text-ink-dim">{rank(at)}</span>
      <span className="hidden truncate sm:inline">{guest.name}</span>
      <span className="sr-only">, {direction} guest</span>
      {direction === "next" && arrow}
    </Link>
  );
}
