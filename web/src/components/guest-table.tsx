"use client";

import { useState } from "react";

import type { Guest, Label, MapRow } from "@/lib/echo";
import { AGES, LABELS, labelMeans, score } from "@/lib/format";

import { GuestDetails } from "./guest-details";
import { MAX_PICKS } from "./invite";

const TAG: Record<Label, string> = {
  sweet_spot: "bg-vermilion text-tag-ink border-vermilion",
  safe: "bg-tag-safe text-tag-ink border-tag-safe",
  far: "border-link text-link",
  long_shot: "border-dashed border-ink",
  balanced: "border-ink",
};

// A picked row takes the well tint, bled past the text edge on both sides so the rules stay aligned.
const PICKED = "bg-well shadow-[-0.75rem_0_0_var(--well),0.75rem_0_0_var(--well)]";

const SITES: Record<string, string> = { imdb: "IMDb", spotify: "Spotify", musicbrainz: "MusicBrainz" };

type TableProps = {
  id: string;
  guests: Guest[];
  showMap: MapRow[];
  picked: string[];
  onPick: (picked: string[]) => void;
};

export function GuestTable({ id, guests, showMap, picked, onPick }: TableProps) {
  const toggle = (ref: string) =>
    onPick(picked.includes(ref) ? picked.filter((other) => other !== ref) : [...picked, ref]);
  const names = picked.map((ref) => guests.find((guest) => guest.ref === ref)?.name).filter(Boolean);
  return (
    <section aria-labelledby="guests">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <h2 id="guests" className="font-display text-5xl leading-none font-extrabold uppercase">
          The guests
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Each score is out of 100, ranked within these {guests.length}. Fit is how much your listeners over-index on
          the guest beyond their fame; love back, how much the guest&apos;s fans over-index on your show; reach, how
          new those fans are to you.
        </p>
        <ol className="mt-8 border-t-2 border-ink">
          {guests.map((guest, index) => (
            <GuestRow
              key={guest.ref}
              id={id}
              guest={guest}
              rank={index + 1}
              showMap={showMap}
              picked={picked.includes(guest.ref)}
              full={picked.length >= MAX_PICKS}
              onToggle={() => toggle(guest.ref)}
            />
          ))}
        </ol>
        {picked.length > 0 && (
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3 text-stock sm:mx-0">
            <p className="text-sm">
              <span className="font-semibold">{picked.length} to invite:</span> {names.join(", ")}
            </p>
            <a href="#invite" className="bg-stock px-3 py-1.5 text-sm font-semibold text-ink hover:opacity-90">
              Write the invitations
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

type RowProps = {
  id: string;
  guest: Guest;
  rank: number;
  showMap: MapRow[];
  picked: boolean;
  full: boolean;
  onToggle: () => void;
};

function GuestRow({ id, guest, rank, showMap, picked, full, onToggle }: RowProps) {
  const { scores, idea, evidence } = guest;
  // Details load on the first open and stay mounted after, so closing and reopening doesn't fetch again.
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const detailsId = `details-${guest.ref}`;
  return (
    <li
      id={`guest-${guest.ref}`}
      className={`grid scroll-mt-6 grid-cols-[2.5rem_1fr] gap-x-4 gap-y-5 border-b border-rule py-6 md:grid-cols-12 md:gap-x-8 ${picked ? PICKED : ""}`}
    >
      <p className="font-display text-3xl leading-none font-extrabold tabular-nums md:col-span-1" aria-hidden>
        {rank}
      </p>
      <div className="flex flex-col items-start gap-2 md:col-span-4">
        <h3 className="font-display text-3xl leading-none font-extrabold uppercase">
          <span className="sr-only">{rank}. </span>
          {guest.name}
        </h3>
        {guest.description && <p className="text-ink-soft">{guest.description}</p>}
        <p className="flex flex-col items-start gap-1.5">
          <span className={`border-2 px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${TAG[guest.label]}`}>
            {LABELS[guest.label].name}
          </span>
          <span className="text-sm text-ink-soft">{labelMeans(guest.label, scores.reach === null)}</span>
        </p>
        <Links links={guest.links} />
        <label className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${full && !picked ? "text-ink-soft" : ""}`}>
          <input
            type="checkbox"
            checked={picked}
            disabled={full && !picked}
            onChange={onToggle}
            className="size-4 accent-[var(--ink)]"
          />
          Invite {guest.name}
          {full && !picked && <span className="font-normal">(up to {MAX_PICKS})</span>}
        </label>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => {
            setOpen(!open);
            setOpened(true);
          }}
          className="inline-flex items-center gap-2 border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-ink hover:text-stock"
        >
          {open ? "Hide the details" : "The full episode and their fans"}
          <span className="sr-only">, {guest.name}</span>
          <svg aria-hidden viewBox="0 0 12 12" className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>
      <dl className="col-start-2 flex flex-col gap-3 md:col-span-3 md:col-start-auto">
        <Meter name="Fit" value={scores.fit} />
        <Meter name="Love back" value={scores.love_back} />
        <Meter name="Reach" value={scores.reach} />
      </dl>
      <div className="col-start-2 flex flex-col gap-4 md:col-span-4 md:col-start-auto">
        {idea ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-lg leading-snug font-semibold">{idea.title}</p>
            <p>{idea.reason}</p>
            <p className="text-ink-soft">{idea.pitch}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Echo writes the episode idea and evidence for the top 10.</p>
        )}
        {evidence && <Evidence evidence={evidence} />}
      </div>
      <div id={detailsId} hidden={!open} className="col-span-2 border-t border-rule pt-6 md:col-span-11 md:col-start-2">
        {opened && <GuestDetails id={id} guestRef={guest.ref} guestName={guest.name} showMap={showMap} />}
      </div>
    </li>
  );
}

function Meter({ name, value }: { name: string; value: number | null }) {
  if (value === null) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <dt>{name}</dt>
          <dd className="font-semibold">Not scored</dd>
        </div>
        <p className="mt-1 text-xs text-ink-soft">Too few of their fans&apos; podcasts came back to tell.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <dt>{name}</dt>
        <dd className="font-display text-2xl leading-none font-extrabold tabular-nums">{score(value)}</dd>
      </div>
      <div aria-hidden className="mt-1 h-1.5 bg-rule">
        <div className="h-full bg-ink" style={{ width: `${Math.max(value * 100, 2)}%` }} />
      </div>
    </div>
  );
}

function Evidence({ evidence }: { evidence: NonNullable<Guest["evidence"]> }) {
  return (
    <dl className="flex flex-col gap-1 border-t border-rule pt-3 text-sm [&_dt]:text-xs [&_dt]:font-semibold [&_dt]:tracking-wide [&_dt]:text-ink-soft [&_dt]:uppercase [&_dt:not(:first-child)]:mt-2">
      {evidence.shared_tastes.length > 0 && (
        <>
          <dt>Both audiences over-index on</dt>
          <dd>{evidence.shared_tastes.join(", ")}</dd>
        </>
      )}
      {evidence.new_podcasts.length > 0 && (
        <>
          <dt>Their fans&apos; podcasts, new to you</dt>
          <dd>{evidence.new_podcasts.join(", ")}</dd>
        </>
      )}
      <dt>Their fans skew</dt>
      <dd>{evidence.ages.length ? evidence.ages.map((age) => AGES[age]).join(", ") : "No age data for their fans yet"}</dd>
    </dl>
  );
}

function Links({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links);
  if (!entries.length) return null;
  return (
    <p className="flex flex-wrap gap-x-4 text-sm">
      {entries.map(([site, url]) => (
        <a key={site} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link underline">
          {SITES[site] ?? site}
          <svg aria-hidden viewBox="0 0 12 12" className="size-3">
            <path d="M4 2h6v6M10 2L3 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ))}
    </p>
  );
}
