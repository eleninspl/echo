"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { echo, type Analysis, type Draft, type Guest, type InviteDetails } from "@/lib/echo";
import type { HostError } from "@/lib/errors";
import { saveHostName, useHostName } from "@/lib/host-name";
import {
  NOTE_LIMIT,
  NO_NAME,
  SHARED_NOTE_LIMIT,
  cleanDetails,
  isEmail,
  mailto,
  saved,
  signedAs,
  useDetails,
  useDrafts,
  useEmails,
  useNotes,
  useStatuses,
  writingProblem,
  type InviteStatus,
  type SavedDraft,
} from "@/lib/invitations";
import { LABELS } from "@/lib/format";
import { analysisPath, yourGuestsPath } from "@/lib/paths";
import type { Pick as SavedPick } from "@/lib/picks";
import { readRewrites, rewrittenIdea, withRewrites } from "@/lib/rewrites";

import { CopyButton } from "./copy-button";
import { GuestLinks } from "./dossier";
import { Picture } from "./guest-list";
import { LABEL_HUE, hue } from "./hud";
import { BookingLine, GuestDetailsLine } from "./invite-details";
import { Logo } from "./logo";
import { Equalizer } from "./show-finder";
import { Voiceprint } from "./voiceprint";
import { Problem } from "./problem";

// The engine writes at most 5 drafts a request; more picks go in parallel requests.
const BATCH = 5;

// A field drawn as a line to write on, not a box.
const LINE =
  "w-full border-0 border-b border-steel-hi bg-transparent px-0 py-2 text-base text-ink outline-none! transition-colors placeholder:text-ink-dim hover:border-ink-dim focus:border-brand";

const TITLE = "font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.02em] text-balance";

// Asked to write drafts the host has changed: from the form (`all`) or from one guest's card.
type Confirm = { ids: string[]; from: "all" | string };

type Invitee = { analysisId: string; guest: Guest };

function useEarlierRuns(picks: SavedPick[]): Invitee[] {
  const ids = [...new Set(picks.flatMap(({ analysis }) => analysis ?? []))].sort().join(",");
  const [runs, setRuns] = useState<Record<string, Analysis>>({});

  useEffect(() => {
    const controller = new AbortController();
    for (const id of ids.split(",").filter(Boolean)) {
      echo
        .analysis(id, controller.signal)
        .then((run) => {
          if (run.status === "done") setRuns((current) => ({ ...current, [id]: withRewrites(run, readRewrites(id)) }));
        })
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, [ids]);

  return picks.flatMap(({ id, analysis, ref }) => {
    const guest = analysis ? runs[analysis]?.guests.find((each) => each.ref === ref && each.id === id) : undefined;
    return guest && analysis ? [{ analysisId: analysis, guest }] : [];
  });
}

// The invite page: a card per picked guest with their email, a note for them, the draft and the briefing. Drafts,
// notes and emails stay in this browser. Echo sends nothing: the host opens each draft in their own email.
export function Invite({
  analysis,
  picked,
  earlier,
  onUnpick,
}: {
  analysis: Analysis;
  picked: string[];
  earlier: SavedPick[];
  onUnpick: (id: string) => void;
}) {
  const savedName = useHostName();
  const [typed, setTyped] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const hostName = (typed ?? savedName).trim() || undefined;
  const [drafts, setDrafts] = useDrafts(analysis.show.id);
  const [notes, setNotes] = useNotes(analysis.show.id);
  const [emails, setEmails] = useEmails();
  const [statuses, setStatuses] = useStatuses(analysis.show.id);
  const [writing, setWriting] = useState<string[]>([]);
  const [problem, setProblem] = useState<HostError | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const notSetUp = problem?.code === "not_implemented";
  const fromEarlier = useEarlierRuns(earlier);
  const invitees: Invitee[] = [
    ...picked.flatMap((ref) => {
      const guest = analysis.guests.find((each) => each.ref === ref);
      return guest ? [{ analysisId: analysis.id, guest }] : [];
    }),
    ...fromEarlier,
  ];
  const guests = invitees.map(({ guest }) => guest);
  const missing = guests.filter((guest) => !drafts[guest.id]).map((guest) => guest.id);
  const [details, setDetails] = useDetails(analysis.show.id);
  const noteFor = (id: string) => notes.perGuest[id]?.trim().slice(0, NOTE_LIMIT) || undefined;
  const forAll = notes.forAll.trim() || undefined;
  const sharedDetails = cleanDetails(details.forAll);
  // A guest's own dates and fee are kept by their entity ID, like their email.
  const ownDetails = (id: string) => cleanDetails(details.perGuest[id]);

  async function write(ids: string[]) {
    setConfirm(null);
    if (!ids.length) return;
    setWriting((current) => [...current, ...ids]);
    setProblem(null);
    if (hostName) saveHostName(hostName);
    setRenaming(false);
    const chosen = invitees.filter(({ guest }) => ids.includes(guest.id));
    const runs = [...new Set(chosen.map(({ analysisId }) => analysisId))];
    const batches = runs.flatMap((analysisId) => {
      const inRun = chosen.filter((invitee) => invitee.analysisId === analysisId).map(({ guest }) => guest);
      return Array.from({ length: Math.ceil(inRun.length / BATCH) }, (_, index) => ({
        analysisId,
        guests: inRun.slice(index * BATCH, (index + 1) * BATCH),
      }));
    });
    const results = await Promise.allSettled(
      batches.map(async ({ analysisId, guests: batch }) => {
        const { drafts: written } = await echo.drafts({
          analysis_id: analysisId,
          guest_refs: batch.map((guest) => guest.ref),
          host_name: hostName,
          note: forAll,
          notes: Object.fromEntries(
            batch.flatMap((guest) => {
              const note = noteFor(guest.id);
              return note ? [[guest.ref, note]] : [];
            }),
          ),
          details: sharedDetails,
          details_by_ref: Object.fromEntries(
            batch.flatMap((guest) => {
              const own = ownDetails(guest.id);
              return own ? [[guest.ref, own]] : [];
            }),
          ),
          ideas: Object.fromEntries(
            batch.flatMap((guest) => {
              const idea = rewrittenIdea(guest);
              return idea ? [[guest.ref, idea]] : [];
            }),
          ),
        });
        return written.flatMap((draft) => {
          const guest = batch.find((each) => each.ref === draft.guest_ref);
          return guest ? [[guest.id, saved(draft)] as const] : [];
        });
      }),
    );
    const written = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const failed = results.find((result) => result.status === "rejected");
    if (written.length) setDrafts((current) => ({ ...current, ...Object.fromEntries(written) }));
    if (failed) setProblem(writingProblem(failed.reason, "invitations"));
    setWriting((current) => current.filter((id) => !ids.includes(id)));
  }

  // Writes again, but asks first when that would replace a draft the host changed.
  function writeAgain(ids: string[], from: Confirm["from"]) {
    if (ids.some((id) => drafts[id]?.changed)) setConfirm({ ids, from });
    else void write(ids);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (missing.length) void write(missing);
    else
      writeAgain(
        guests.map((guest) => guest.id),
        "all",
      );
  }

  function update(id: string, draft: SavedDraft) {
    setDrafts((current) => ({ ...current, [id]: draft }));
  }

  if (!guests.length) {
    return (
      <section aria-labelledby="invite-title" className="flex max-w-[60ch] flex-col items-start gap-4">
        <h1 id="invite-title" className={TITLE}>
          No guests picked yet
        </h1>
        <p className="text-ink-soft">Pick guests with + on the guests page, and Echo drafts an invitation to each.</p>
        <Link href={analysisPath(analysis.id)} className="btn btn-brand mt-2 min-h-12 px-6 text-base">
          Choose guests
        </Link>
      </section>
    );
  }

  const one = guests.length === 1;
  const changed = confirm ? confirm.ids.filter((id) => drafts[id]?.changed) : [];
  const label = writing.length
    ? "Writing…"
    : notSetUp
      ? "Not set up here"
      : missing.length === guests.length
        ? one
          ? "Write the invitation"
          : `Write ${guests.length} invitations`
        : missing.length
          ? missing.length === 1
            ? "Write the missing one"
            : `Write the ${missing.length} missing`
          : one
            ? "Write it again"
            : "Write all again";

  return (
    <div className="flex flex-col gap-20 sm:gap-24">
      <section aria-labelledby="invite-title" className="flex flex-col gap-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="flex max-w-3xl flex-col gap-5">
            <h1 id="invite-title" className={TITLE}>
              {one ? `An invitation to ${guests[0].name}` : `${countWord(guests.length)} invitations, one for each`}
            </h1>
            <p className="max-w-[56ch] text-lg text-pretty text-ink-soft">
              Each written from what your audiences share. Echo sends nothing: open each in your own email, then follow
              up in{" "}
              <Link href={yourGuestsPath()} className="text-ink underline underline-offset-4 hover:text-brand">
                Your guests
              </Link>
              .
            </p>
          </div>
          <Cast invitees={invitees} drafts={drafts} writing={writing} statuses={statuses} />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-10 border-t border-steel pt-10">
          <BookingLine
            details={details.forAll}
            onChange={(change) => setDetails((current) => ({ ...current, forAll: { ...current.forAll, ...change } }))}
            className="max-w-5xl font-display text-[clamp(1.5rem,2.8vw,2.375rem)] leading-[1.4] font-medium text-balance text-ink-soft"
          />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="tag text-ink-dim">Anything else to say</span>
              <input
                value={notes.forAll}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    forAll: event.target.value,
                  }))
                }
                maxLength={SHARED_NOTE_LIMIT}
                placeholder="A recent episode, a reply-by date, or how to write: shorter, warmer…"
                className={LINE}
              />
            </label>
            {savedName && !renaming ? (
              <p className="flex items-baseline gap-x-2 pb-2 text-ink-soft lg:w-64">
                Signed,
                <span className="font-display text-lg font-semibold text-ink">{savedName}</span>
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  className="text-sm text-ink-dim underline underline-offset-4 hover:text-ink"
                >
                  Change
                </button>
              </p>
            ) : (
              <label className="flex flex-col gap-1 lg:w-64">
                <span className="tag text-ink-dim">Signed</span>
                <input
                  value={typed ?? savedName}
                  onChange={(event) => setTyped(event.target.value)}
                  maxLength={80}
                  autoComplete="name"
                  autoFocus={renaming}
                  placeholder="Your name"
                  className={`${LINE} font-display text-lg font-semibold`}
                />
              </label>
            )}
            <button
              type="submit"
              disabled={writing.length > 0 || notSetUp}
              className={`btn min-h-14 shrink-0 px-8 text-base ${missing.length ? "btn-brand" : ""}`}
            >
              {writing.length > 0 && <Equalizer />}
              {label}
            </button>
          </div>
        </form>

        {confirm?.from === "all" && (
          <Ask
            question={`You changed ${changed.length === 1 ? "one of these" : `${changed.length} of these`}. Replace ${changed.length === 1 ? "it" : "them"} too?`}
            onReplace={() => write(confirm.ids)}
            onKeep={() => write(confirm.ids.filter((id) => !drafts[id]?.changed))}
            onCancel={() => setConfirm(null)}
          />
        )}

        {problem && <Problem problem={problem} />}
      </section>

      <section aria-label="Invitations" className="flex flex-col gap-24 sm:gap-32">
        <ol className="flex flex-col gap-24 sm:gap-32">
          {invitees.map(({ analysisId, guest }, index) => (
            <GuestCard
              key={guest.id}
              analysisId={analysisId}
              guest={guest}
              order={index}
              draft={drafts[guest.id]}
              writing={writing.includes(guest.id)}
              email={emails[guest.id] ?? ""}
              onEmail={(email) => setEmails((current) => ({ ...current, [guest.id]: email }))}
              note={notes.perGuest[guest.id] ?? ""}
              onNote={(note) =>
                setNotes((current) => ({
                  ...current,
                  perGuest: { ...current.perGuest, [guest.id]: note },
                }))
              }
              sharedDetails={details.forAll}
              ownDetails={details.perGuest[guest.id] ?? {}}
              onOwnDetails={(own) =>
                setDetails((current) => {
                  const perGuest = { ...current.perGuest, [guest.id]: own };
                  if (!cleanDetails(own)) delete perGuest[guest.id];
                  return { ...current, perGuest };
                })
              }
              revise={{
                hostName,
                note: forAll,
                guestNote: noteFor(guest.id),
                details: sharedDetails,
                guestDetails: ownDetails(guest.id),
              }}
              notSetUp={notSetUp}
              onChange={(draft) => update(guest.id, draft)}
              onWrite={() => write([guest.id])}
              onWriteAgain={() => writeAgain([guest.id], guest.id)}
              confirming={confirm?.from === guest.id}
              onConfirm={(replace) => (replace ? write([guest.id]) : setConfirm(null))}
              onRemove={() => onUnpick(guest.id)}
              status={statuses[guest.id]}
              onStatus={(status) =>
                setStatuses((current) => {
                  const next = { ...current };
                  if (status) next[guest.id] = status;
                  else delete next[guest.id];
                  return next;
                })
              }
              prepare={yourGuestsPath(analysis.show.id, guest.id)}
            />
          ))}
        </ol>
        {picked.length < analysis.guests.length && (
          <Link
            href={analysisPath(analysis.id)}
            className="flex items-center gap-3 self-start rounded-full py-1 pr-3 text-ink-soft hover:text-ink"
          >
            <span className="flex size-11 items-center justify-center rounded-full border-2 border-dashed border-steel-hi">
              <svg aria-hidden viewBox="0 0 12 12" className="size-3">
                <path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            Add more guests
          </Link>
        )}
      </section>
    </div>
  );
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const countWord = (count: number) => WORDS[count] ?? String(count);

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

// Where each invitation stands, as it reads in the header's row of portraits and on the letter.
type Stage = "to_write" | "writing" | "ready" | "sent" | "booked";

const STAGE: Record<Stage, { name: string; color: string }> = {
  to_write: { name: "To write", color: "var(--steel-hi)" },
  writing: { name: "Writing", color: "var(--brand)" },
  ready: { name: "Ready", color: "var(--brand)" },
  sent: { name: "Sent", color: "var(--sweet)" },
  booked: { name: "Booked", color: "var(--sweet)" },
};

function stageOf(draft: SavedDraft | undefined, writing: boolean, status: InviteStatus | undefined): Stage {
  if (status) return status;
  if (writing) return "writing";
  return draft ? "ready" : "to_write";
}

// The guests in a row of portraits, each ringed by where their invitation stands; a portrait jumps to its letter.
function Cast({
  invitees,
  drafts,
  writing,
  statuses,
}: {
  invitees: Invitee[];
  drafts: Record<string, SavedDraft>;
  writing: string[];
  statuses: Record<string, InviteStatus>;
}) {
  return (
    <ol aria-label="Where each invitation stands" className="flex flex-wrap gap-x-4 gap-y-5 lg:justify-end">
      {invitees.map(({ guest }, index) => {
        const stage = stageOf(drafts[guest.id], writing.includes(guest.id), statuses[guest.id]);
        const { name, color } = STAGE[stage];
        return (
          <li key={guest.id} className="rise" style={{ "--order": index * 2 } as CSSProperties}>
            <a
              href={`#letter-${guest.id}`}
              className="group flex w-20 flex-col items-center gap-2 rounded-2xl text-center"
            >
              <span
                className={`relative block size-16 overflow-hidden rounded-full bg-deck transition-[box-shadow,translate] duration-300 ease-(--ease-out) group-hover:-translate-y-0.5 ${stage === "writing" ? "pulse" : ""}`}
                style={{ boxShadow: `0 0 0 3px var(--void), 0 0 0 5px ${color}` }}
              >
                <Picture guest={guest} sizes="64px" small />
              </span>
              <span className="w-full truncate text-sm text-ink">{firstName(guest.name)}</span>
              <span className="tag -mt-1.5 flex items-center gap-1" style={{ color: stage === "to_write" ? "var(--ink-dim)" : color }}>
                {(stage === "sent" || stage === "booked") && <Check />}
                {name}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function Ask({
  question,
  onReplace,
  onKeep,
  onCancel,
}: {
  question: string;
  onReplace: () => void;
  onKeep?: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="alertdialog" aria-label={question} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <p className="font-semibold">{question}</p>
      <div className="flex flex-wrap gap-2">
        {onKeep && (
          <button type="button" onClick={onKeep} className="btn btn-sm">
            Keep my changes
          </button>
        )}
        <button type="button" onClick={onReplace} className="btn btn-sm" style={hue("var(--alert)")}>
          Replace
        </button>
        <button type="button" onClick={onCancel} className="btn btn-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

type CardProps = {
  analysisId: string;
  guest: Guest;
  order: number;
  draft: SavedDraft | undefined;
  writing: boolean;
  email: string;
  onEmail: (email: string) => void;
  note: string;
  onNote: (note: string) => void;
  sharedDetails: InviteDetails;
  ownDetails: InviteDetails;
  onOwnDetails: (own: InviteDetails) => void;
  revise: {
    hostName?: string;
    note?: string;
    guestNote?: string;
    details?: InviteDetails;
    guestDetails?: InviteDetails;
  };
  notSetUp: boolean;
  onChange: (draft: SavedDraft) => void;
  onWrite: () => void;
  onWriteAgain: () => void;
  confirming: boolean;
  onConfirm: (replace: boolean) => void;
  onRemove: () => void;
  status: InviteStatus | undefined;
  onStatus: (status: InviteStatus | undefined) => void;
  prepare: string;
};

// One guest's spread: who they are on the left, held in view on a wide screen, and their letter on the right.
function GuestCard({
  analysisId,
  guest,
  order,
  draft,
  writing,
  email,
  onEmail,
  note,
  onNote,
  sharedDetails,
  ownDetails,
  onOwnDetails,
  revise,
  notSetUp,
  onChange,
  onWrite,
  onWriteAgain,
  confirming,
  onConfirm,
  onRemove,
  status,
  onStatus,
  prepare,
}: CardProps) {
  const bio = guest.bio ?? guest.description;
  const color = LABEL_HUE[guest.label];
  const { scores } = guest;
  // A letter Echo has just written fills in from the top; one already there on load simply shows.
  const [wasWriting, setWasWriting] = useState(writing);
  const [arrivals, setArrivals] = useState(0);
  if (writing !== wasWriting) {
    setWasWriting(writing);
    if (!writing) setArrivals(arrivals + 1);
  }
  const link = "text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline";
  return (
    <li
      id={`letter-${guest.id}`}
      className="rise grid scroll-mt-24 gap-8 lg:grid-cols-[minmax(15rem,21rem)_minmax(0,1fr)] lg:gap-16 xl:gap-20"
      style={{ "--order": order * 3 } as CSSProperties}
    >
      <div className="flex min-w-0 flex-col gap-7 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-5 lg:flex-col lg:items-start lg:gap-6">
          <span
            className="relative block size-24 shrink-0 overflow-hidden rounded-full bg-deck sm:size-28 lg:size-40"
            style={{ boxShadow: `0 0 0 4px var(--void), 0 0 0 6px ${color}` }}
          >
            <Picture guest={guest} sizes="160px" />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <span className="tag" style={{ color }}>
              {LABELS[guest.label].name}
            </span>
            <h2 className="font-display text-3xl leading-[1.02] font-semibold text-balance lg:text-[2.5rem]">
              {guest.name}
            </h2>
            {bio && <p className="line-clamp-3 text-pretty text-ink-soft">{bio}</p>}
          </div>
        </div>
        <Voiceprint fit={scores.fit} love={scores.love_back} reach={scores.reach} bars={44} height={40} className="w-full max-w-80" />
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="tag text-ink-dim">Just for {firstName(guest.name)}</span>
            <input
              value={note}
              onChange={(event) => onNote(event.target.value)}
              maxLength={NOTE_LIMIT}
              placeholder="Your angle, how you know them…"
              className={LINE}
            />
          </label>
          <GuestDetailsLine name={guest.name} shared={sharedDetails} own={ownDetails} onOwn={onOwnDetails} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {status === "booked" ? (
            <span className="tag flex items-center gap-1.5 text-sweet">
              <Check />
              Booked
            </span>
          ) : (
            draft && (
              <button
                type="button"
                aria-pressed={status === "sent"}
                onClick={() => onStatus(status === "sent" ? undefined : "sent")}
                className={`btn btn-sm ${status === "sent" ? "btn-solid" : ""}`}
                style={hue("var(--sweet)")}
              >
                {status === "sent" && <Check />}
                {status === "sent" ? "Sent" : "Mark as sent"}
                <span className="sr-only"> the invitation to {guest.name}</span>
              </button>
            )
          )}
          <Link href={prepare} className={`group inline-flex items-center gap-1.5 ${link}`}>
            Briefing and episode
            <span className="sr-only"> for {guest.name}</span>
            <svg
              aria-hidden
              viewBox="0 0 12 12"
              className="size-3 transition-transform duration-200 ease-(--ease-out) group-hover:translate-x-0.5"
            >
              <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
          {Object.keys(guest.links).length > 0 && <GuestLinks links={guest.links} />}
          <button type="button" onClick={onRemove} className={link}>
            Remove
            <span className="sr-only"> {guest.name}</span>
          </button>
        </div>
      </div>

      <Letter
        analysisId={analysisId}
        guest={guest}
        draft={draft}
        writing={writing}
        arrivals={arrivals}
        email={email}
        onEmail={onEmail}
        revise={revise}
        notSetUp={notSetUp}
        onChange={onChange}
        onWrite={onWrite}
        onWriteAgain={onWriteAgain}
        confirming={confirming}
        onConfirm={onConfirm}
        stage={stageOf(draft, writing, status)}
      />
    </li>
  );
}

// The invitation as the email it will be, on a raised sheet: To and Subject, then the letter, edited in place,
// with Echo's rewrite and the ways out (copy, open in email) along its foot.
function Letter({
  analysisId,
  guest,
  draft,
  writing,
  arrivals,
  email,
  onEmail,
  revise,
  notSetUp,
  onChange,
  onWrite,
  onWriteAgain,
  confirming,
  onConfirm,
  stage,
}: Pick<
  CardProps,
  | "analysisId"
  | "guest"
  | "draft"
  | "writing"
  | "email"
  | "onEmail"
  | "revise"
  | "notSetUp"
  | "onChange"
  | "onWrite"
  | "onWriteAgain"
  | "confirming"
  | "onConfirm"
> & { arrivals: number; stage: Stage }) {
  const [instruction, setInstruction] = useState("");
  const [pending, setPending] = useState(false);
  const [rewrites, setRewrites] = useState(0);
  const [problem, setProblem] = useState<HostError | null>(null);
  // Signed with the host's name as soon as they give it, without writing the draft again.
  const body = draft ? signedAs(draft.body, revise.hostName) : "";
  const shown = draft && { subject: draft.subject, body };
  const emailWrong = email.trim() !== "" && !isEmail(email);
  const reveal = arrivals + rewrites;
  const name = firstName(guest.name);

  async function rewrite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim() || !shown) return;
    setPending(true);
    setProblem(null);
    const idea = rewrittenIdea(guest);
    try {
      const { drafts } = await echo.drafts({
        analysis_id: analysisId,
        guest_refs: [guest.ref],
        host_name: revise.hostName,
        note: revise.note,
        notes: revise.guestNote ? { [guest.ref]: revise.guestNote } : undefined,
        details: revise.details,
        details_by_ref: revise.guestDetails ? { [guest.ref]: revise.guestDetails } : undefined,
        ideas: idea && { [guest.ref]: idea },
        previous: shown,
        instruction: instruction.trim(),
      });
      const [revised]: (Draft | undefined)[] = drafts;
      if (revised) {
        onChange(saved(revised, true));
        setRewrites(rewrites + 1);
      }
      setInstruction("");
    } catch (error) {
      setProblem(writingProblem(error, "invitations"));
    }
    setPending(false);
  }

  const edit = (change: Partial<SavedDraft>) => draft && onChange({ ...draft, body, ...change, changed: true });
  const busy = writing || pending;
  return (
    <div className="relative min-w-0">
      {(stage === "sent" || stage === "booked") && (
        <span
          aria-hidden
          className="stamp absolute -top-5 right-3 z-10 flex size-[4.5rem] rotate-[-12deg] flex-col items-center justify-center rounded-full border-2 border-sweet text-sweet sm:-top-6 sm:right-10 sm:size-24"
        >
          <span className="sm:scale-150">
            <Check />
          </span>
          <span className="mt-1 font-display text-base leading-none font-semibold sm:mt-1.5 sm:text-xl">{STAGE[stage].name}</span>
        </span>
      )}
      <article
        aria-label={`Invitation to ${guest.name}`}
        className="flex flex-col overflow-hidden rounded-[1.75rem] bg-deck shadow-float ring-1 ring-steel"
      >
        <header className="flex flex-col px-6 pt-5 sm:px-10 sm:pt-7">
          <label className="flex items-baseline gap-4 border-b border-steel py-3">
            <span className="w-14 shrink-0 text-sm text-ink-dim sm:w-16">To</span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmail(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={`${name}'s email, kept in this browser only`}
              aria-invalid={emailWrong || undefined}
              className="min-w-0 flex-1 bg-transparent text-ink outline-none! placeholder:text-ink-dim"
            />
          </label>
          {emailWrong && <span className="pt-1 pl-18 text-xs text-alert sm:pl-20">That doesn&apos;t look like an email yet</span>}
          <label className="flex items-baseline gap-4 border-b border-steel py-3">
            <span className="w-14 shrink-0 text-sm text-ink-dim sm:w-16">Subject</span>
            {draft && !writing ? (
              <textarea
                value={draft.subject}
                onChange={(event) => edit({ subject: event.target.value.replace(/\n/g, " ") })}
                rows={1}
                className="min-w-0 flex-1 resize-none bg-transparent font-display text-lg leading-snug font-semibold text-ink outline-none! [field-sizing:content]"
              />
            ) : (
              <span className={`h-3.5 w-2/5 rounded-full bg-steel ${writing ? "ink-line" : ""}`} />
            )}
          </label>
        </header>

        <div className="relative flex min-h-[24rem] flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10">
          {draft && !writing ? (
            <label key={reveal} className={`flex flex-1 flex-col ${reveal ? "letter-in" : ""}`}>
              <span className="sr-only">Invitation to {guest.name}</span>
              <textarea
                value={body}
                onChange={(event) => edit({ body: event.target.value })}
                rows={12}
                className="w-full max-w-[68ch] flex-1 resize-none bg-transparent text-[1.0625rem] leading-[1.75] text-ink outline-none! [field-sizing:content]"
              />
              {body.includes(NO_NAME) && (
                <span className="mt-4 text-sm text-ink-dim">Sign at the top and your name goes in.</span>
              )}
            </label>
          ) : (
            <BlankSheet
              writing={writing}
              name={name}
              action={
                notSetUp ? (
                  <p className="text-ink-soft">Writing isn&apos;t set up here.</p>
                ) : (
                  <button type="button" onClick={onWrite} className="btn btn-brand min-h-12 px-6 text-base">
                    Write to {name}
                  </button>
                )
              }
            />
          )}
          {draft?.changed && !writing && (
            <span className="tag absolute top-4 right-6 text-ink-dim sm:right-10">Edited</span>
          )}
        </div>

        {draft && !writing && (
          <footer className="flex flex-col gap-3 border-t border-steel bg-well px-4 py-4 sm:px-6">
            {confirming ? (
              <Ask question="Replace your changes?" onReplace={() => onConfirm(true)} onCancel={() => onConfirm(false)} />
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                {!notSetUp && (
                  <form
                    onSubmit={rewrite}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-deck py-1 pr-1 pl-4 ring-1 ring-steel focus-within:ring-ink-dim"
                  >
                    <Logo className="size-4 shrink-0 text-brand" />
                    <label className="flex min-w-0 flex-1">
                      <span className="sr-only">Ask Echo to change the invitation to {guest.name}</span>
                      <input
                        value={instruction}
                        onChange={(event) => setInstruction(event.target.value)}
                        maxLength={300}
                        placeholder="Ask Echo: shorter, warmer, mention the tour…"
                        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none! placeholder:text-ink-dim"
                      />
                    </label>
                    {/* One button: with an ask it rewrites this draft, without one it writes a fresh one. */}
                    {instruction.trim() || busy ? (
                      <button type="submit" disabled={busy} className="btn btn-sm min-h-9 rounded-full">
                        {pending ? "Rewriting…" : "Rewrite"}
                      </button>
                    ) : (
                      <button type="button" onClick={onWriteAgain} className="btn btn-sm min-h-9 rounded-full">
                        Write again
                        <span className="sr-only"> the invitation to {guest.name}</span>
                      </button>
                    )}
                  </form>
                )}
                <span className="flex shrink-0 items-center gap-2">
                  <CopyButton text={`Subject: ${draft.subject}\n\n${body}`} label="Copy" of={`the invitation to ${guest.name}`} />
                  <a
                    href={mailto({ subject: draft.subject, body }, email)}
                    className="btn btn-brand"
                    title={isEmail(email) ? `A new email to ${email.trim()}` : "A new email; add their address there"}
                  >
                    Open in email
                    <span className="sr-only">, the invitation to {guest.name}</span>
                  </a>
                </span>
              </div>
            )}
            {problem && (
              <p role="alert" className="text-sm">
                <span className={`font-semibold ${problem.code === "not_implemented" ? "text-ink" : "text-alert"}`}>
                  {problem.title}.
                </span>{" "}
                <span className="text-ink-soft">{problem.message}</span>
              </p>
            )}
          </footer>
        )}
      </article>
    </div>
  );
}

// The sheet before its letter: faint lines where the words will go, and the way to write it. While Echo writes, the
// lines shimmer in turn.
function BlankSheet({ writing, name, action }: { writing: boolean; name: string; action: ReactNode }) {
  const lines = [38, 0, 96, 92, 88, 64, 0, 94, 90, 72, 0, 24];
  return (
    <div className={`relative flex flex-1 flex-col ${writing ? "writing" : ""}`}>
      <div aria-hidden className="flex flex-col gap-3.5">
        {lines.map((width, index) =>
          width ? (
            <span
              key={index}
              className={`h-3 rounded-full bg-steel ${writing ? "ink-line" : "opacity-70"}`}
              style={{ width: `${width}%`, "--order": index } as CSSProperties}
            />
          ) : (
            <span key={index} className="h-2" />
          ),
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        {writing ? (
          <p aria-live="polite" className="flex items-center gap-3 rounded-full bg-deck px-5 py-3 text-ink shadow-pop ring-1 ring-steel">
            <Equalizer />
            Echo is writing to {name}…
          </p>
        ) : (
          <div className="rounded-full bg-deck p-2 shadow-pop">{action}</div>
        )}
      </div>
    </div>
  );
}

export function Check() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3">
      <path d="M2.5 6.25l2.25 2.25L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
