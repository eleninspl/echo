"use client";

import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";

import { echo, type Analysis, type Draft, type Guest } from "@/lib/echo";
import type { HostError } from "@/lib/errors";
import { saveHostName, useHostName } from "@/lib/host-name";
import {
  NOTE_LIMIT,
  SHARED_NOTE_LIMIT,
  isEmail,
  mailto,
  saved,
  useDrafts,
  useEmails,
  useNotes,
  writingProblem,
  type SavedDraft,
} from "@/lib/invitations";
import { analysisPath } from "@/lib/paths";

import { Briefing } from "./briefing";
import { CopyButton } from "./copy-button";
import { GuestLinks } from "./dossier";
import { Picture } from "./guest-list";
import { LABEL_HUE, hue } from "./hud";
import { Problem } from "./problem";

// The engine writes at most 5 drafts a request; more picks go in parallel requests.
const BATCH = 5;

const input = "field w-full px-3 py-2";

const TITLE = "font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-semibold text-balance";

// Asked to write drafts the host has changed: from the form (`all`) or from one guest's card.
type Confirm = { refs: string[]; from: "all" | string };

// The invite page: a card per picked guest with their email, a note for them, the draft and the briefing. Drafts,
// notes and emails stay in this browser. Echo sends nothing: the host opens each draft in their own email.
export function Invite({
  analysis,
  picked,
  onToggle,
}: {
  analysis: Analysis;
  picked: string[];
  onToggle: (ref: string) => void;
}) {
  const savedName = useHostName();
  const [typed, setTyped] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const hostName = (typed ?? savedName).trim() || undefined;
  const [drafts, setDrafts] = useDrafts(analysis.id);
  const [notes, setNotes] = useNotes(analysis.id);
  const [emails, setEmails] = useEmails();
  const [writing, setWriting] = useState<string[]>([]);
  const [problem, setProblem] = useState<HostError | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const notSetUp = problem?.code === "not_implemented";
  const guests = picked
    .map((ref) => analysis.guests.find((guest) => guest.ref === ref))
    .filter((guest): guest is Guest => guest !== undefined);
  const missing = guests.filter((guest) => !drafts[guest.ref]).map((guest) => guest.ref);
  const noteFor = (ref: string) => notes.perGuest[ref]?.trim().slice(0, NOTE_LIMIT) || undefined;
  const forAll = notes.forAll.trim() || undefined;

  async function write(refs: string[]) {
    setConfirm(null);
    if (!refs.length) return;
    setWriting((current) => [...current, ...refs]);
    setProblem(null);
    if (hostName) saveHostName(hostName);
    setRenaming(false);
    const batches = Array.from({ length: Math.ceil(refs.length / BATCH) }, (_, index) =>
      refs.slice(index * BATCH, (index + 1) * BATCH),
    );
    const results = await Promise.allSettled(
      batches.map((guest_refs) =>
        echo.drafts({
          analysis_id: analysis.id,
          guest_refs,
          host_name: hostName,
          note: forAll,
          notes: Object.fromEntries(
            guest_refs.flatMap((ref) => [[ref, noteFor(ref) ?? ""]]).filter(([, note]) => note),
          ),
        }),
      ),
    );
    const written = results.flatMap((result) => (result.status === "fulfilled" ? result.value.drafts : []));
    const failed = results.find((result) => result.status === "rejected");
    if (written.length) {
      setDrafts((current) => ({
        ...current,
        ...Object.fromEntries(written.map((draft) => [draft.guest_ref, saved(draft)])),
      }));
    }
    if (failed) setProblem(writingProblem(failed.reason, "invitations"));
    setWriting((current) => current.filter((ref) => !refs.includes(ref)));
  }

  // Writes again, but asks first when that would replace a draft the host changed.
  function writeAgain(refs: string[], from: Confirm["from"]) {
    if (refs.some((ref) => drafts[ref]?.changed)) setConfirm({ refs, from });
    else void write(refs);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (missing.length) void write(missing);
    else writeAgain(picked, "all");
  }

  function update(ref: string, draft: SavedDraft) {
    setDrafts((current) => ({ ...current, [ref]: draft }));
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
  const changed = confirm ? confirm.refs.filter((ref) => drafts[ref]?.changed) : [];
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
    <div className="flex flex-col gap-10">
      <section aria-labelledby="invite-title" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 id="invite-title" className={TITLE}>
            Invite {one ? guests[0].name : `${guests.length} guests`}
          </h1>
          <p className="max-w-[60ch] text-ink-soft">
            An email to each, from what your audiences share. Echo sends nothing: open each one in your own email.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="grid gap-5 border-t border-steel pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-end md:gap-x-6"
        >
          {savedName && !renaming ? (
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-soft md:pb-3">
              Signed as <span className="font-semibold text-ink">{savedName}</span>
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="text-accent underline underline-offset-4 hover:text-ink"
              >
                Change
              </button>
            </p>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="tag text-ink-dim">Your name, to sign with</span>
              <input
                value={typed ?? savedName}
                onChange={(event) => setTyped(event.target.value)}
                maxLength={80}
                autoComplete="name"
                autoFocus={renaming}
                className={input}
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="tag text-ink-dim">{one ? "Anything to mention" : "For everyone"}</span>
            <input
              value={notes.forAll}
              onChange={(event) =>
                setNotes((current) => ({
                  ...current,
                  forAll: event.target.value,
                }))
              }
              maxLength={SHARED_NOTE_LIMIT}
              placeholder="Dates you record, the fee, a recent episode…"
              className={input}
            />
          </label>
          <button
            type="submit"
            disabled={writing.length > 0 || notSetUp}
            className={`btn min-h-12 px-6 text-base ${missing.length ? "btn-brand" : ""}`}
          >
            {label}
          </button>
        </form>

        {confirm?.from === "all" && (
          <Ask
            question={`You changed ${changed.length === 1 ? "one of these" : `${changed.length} of these`}. Replace ${changed.length === 1 ? "it" : "them"} too?`}
            onReplace={() => write(confirm.refs)}
            onKeep={() => write(confirm.refs.filter((ref) => !drafts[ref]?.changed))}
            onCancel={() => setConfirm(null)}
          />
        )}

        {problem && <Problem problem={problem} />}
      </section>

      <section aria-label="Guests to invite" className="flex flex-col gap-5">
        <ol className={`grid grid-cols-1 items-start gap-5 ${one ? "max-w-3xl" : "xl:grid-cols-2"}`}>
          {guests.map((guest, index) => (
            <GuestCard
              key={guest.ref}
              analysisId={analysis.id}
              guest={guest}
              order={index}
              draft={drafts[guest.ref]}
              writing={writing.includes(guest.ref)}
              email={emails[guest.id] ?? ""}
              onEmail={(email) => setEmails((current) => ({ ...current, [guest.id]: email }))}
              note={notes.perGuest[guest.ref] ?? ""}
              onNote={(note) =>
                setNotes((current) => ({
                  ...current,
                  perGuest: { ...current.perGuest, [guest.ref]: note },
                }))
              }
              revise={{ hostName, note: forAll, guestNote: noteFor(guest.ref) }}
              notSetUp={notSetUp}
              onChange={(draft) => update(guest.ref, draft)}
              onWriteAgain={() => writeAgain([guest.ref], guest.ref)}
              confirming={confirm?.from === guest.ref}
              onConfirm={(replace) => (replace ? write([guest.ref]) : setConfirm(null))}
              onRemove={() => onToggle(guest.ref)}
            />
          ))}
        </ol>
        {guests.length < analysis.guests.length && (
          <Link
            href={analysisPath(analysis.id)}
            className="flex items-center gap-3 self-start rounded-full py-1 pr-3 text-sm text-ink-soft hover:text-ink"
          >
            <span className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-steel-hi">
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
  revise: { hostName?: string; note?: string; guestNote?: string };
  notSetUp: boolean;
  onChange: (draft: SavedDraft) => void;
  onWriteAgain: () => void;
  confirming: boolean;
  onConfirm: (replace: boolean) => void;
  onRemove: () => void;
};

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
  revise,
  notSetUp,
  onChange,
  onWriteAgain,
  confirming,
  onConfirm,
  onRemove,
}: CardProps) {
  const emailWrong = email.trim() !== "" && !isEmail(email);
  return (
    <li
      className="rise flex flex-col gap-5 rounded-2xl bg-well p-5 shadow-[inset_0_0_0_1px_var(--steel)] sm:p-6"
      style={{ "--order": order * 2 } as CSSProperties}
    >
      <div className="flex items-start gap-4">
        <span
          className="relative block size-14 shrink-0 overflow-hidden rounded-full bg-deck"
          style={{
            boxShadow: `0 0 0 2px var(--well), 0 0 0 3.5px ${LABEL_HUE[guest.label]}`,
          }}
        >
          <Picture guest={guest} sizes="56px" small />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-display text-xl leading-tight font-semibold">{guest.name}</h2>
          {Object.keys(guest.links).length > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-dim">
              <span>Find them on</span>
              <GuestLinks links={guest.links} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-deck-hi hover:text-ink"
        >
          <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span className="sr-only">Remove {guest.name}</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="tag text-ink-dim">Their email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="Kept in this browser only"
            aria-invalid={emailWrong || undefined}
            className={input}
          />
          {emailWrong && <span className="text-xs text-alert">That doesn&apos;t look like an email yet</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="tag text-ink-dim">Just for them</span>
          <input
            value={note}
            onChange={(event) => onNote(event.target.value)}
            maxLength={NOTE_LIMIT}
            placeholder="Your angle, how you know them…"
            className={input}
          />
        </label>
      </div>

      {writing ? (
        <div aria-live="polite" className="flex flex-col gap-3 border-t border-steel pt-5">
          <span className="sr-only">Writing the invitation to {guest.name}</span>
          <span className="h-4 w-1/2 animate-pulse rounded-full bg-deck-hi" />
          {[100, 92, 96, 60].map((width) => (
            <span key={width} className="h-3 animate-pulse rounded-full bg-deck" style={{ width: `${width}%` }} />
          ))}
        </div>
      ) : draft ? (
        <DraftBody
          analysisId={analysisId}
          guest={guest}
          draft={draft}
          email={email}
          revise={revise}
          notSetUp={notSetUp}
          onChange={onChange}
          onWriteAgain={onWriteAgain}
          confirming={confirming}
          onConfirm={onConfirm}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-steel-hi px-4 py-6 text-center text-sm text-ink-dim">
          Not written yet
        </p>
      )}

      {draft && !writing && (
        <div className="flex flex-col gap-3 border-t border-steel pt-5">
          <span className="tag text-ink-dim">Then prepare</span>
          <Briefing id={analysisId} guestRef={guest.ref} guestName={guest.name} />
        </div>
      )}
    </li>
  );
}

function DraftBody({
  analysisId,
  guest,
  draft,
  email,
  revise,
  notSetUp,
  onChange,
  onWriteAgain,
  confirming,
  onConfirm,
}: Pick<
  CardProps,
  "analysisId" | "guest" | "email" | "revise" | "notSetUp" | "onChange" | "onWriteAgain" | "confirming" | "onConfirm"
> & { draft: SavedDraft }) {
  const [instruction, setInstruction] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<HostError | null>(null);

  async function rewrite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    setPending(true);
    setProblem(null);
    try {
      const { drafts } = await echo.drafts({
        analysis_id: analysisId,
        guest_refs: [guest.ref],
        host_name: revise.hostName,
        note: revise.note,
        notes: revise.guestNote ? { [guest.ref]: revise.guestNote } : undefined,
        previous: { subject: draft.subject, body: draft.body },
        instruction: instruction.trim(),
      });
      const [revised]: (Draft | undefined)[] = drafts;
      if (revised) onChange(saved(revised, true));
      setInstruction("");
    } catch (error) {
      setProblem(writingProblem(error, "invitations"));
    }
    setPending(false);
  }

  const edit = (change: Partial<SavedDraft>) => onChange({ ...draft, ...change, changed: true });
  return (
    <div className="flex flex-col gap-4 border-t border-steel pt-5">
      <div className="flex items-center justify-between gap-3">
        <span className="tag text-ink-dim">Invitation</span>
        {draft.changed && <span className="tag text-ink-soft">Edited</span>}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Subject of the invitation to {guest.name}</span>
        <input
          value={draft.subject}
          onChange={(event) => edit({ subject: event.target.value })}
          className={`${input} font-semibold`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Invitation to {guest.name}</span>
        <textarea
          value={draft.body}
          onChange={(event) => edit({ body: event.target.value })}
          rows={10}
          className={`${input} min-h-48 resize-y text-sm leading-relaxed text-ink-soft [field-sizing:content]`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={mailto(draft, email)}
          className="btn btn-solid"
          style={hue("var(--brand)")}
          title={isEmail(email) ? `A new email to ${email.trim()}` : "A new email; add their address there"}
        >
          Open in email
          <span className="sr-only">, the invitation to {guest.name}</span>
        </a>
        <CopyButton
          text={`Subject: ${draft.subject}\n\n${draft.body}`}
          label="Copy"
          of={`the invitation to ${guest.name}`}
        />
        {!notSetUp && !confirming && (
          <button type="button" onClick={onWriteAgain} className="btn btn-sm ml-auto">
            Write again
            <span className="sr-only"> the invitation to {guest.name}</span>
          </button>
        )}
      </div>
      {confirming && (
        <Ask question="Replace your changes?" onReplace={() => onConfirm(true)} onCancel={() => onConfirm(false)} />
      )}
      {!notSetUp && (
        <form onSubmit={rewrite} className="flex gap-2">
          <label className="flex flex-1">
            <span className="sr-only">Change the invitation to {guest.name}</span>
            <input
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              maxLength={300}
              placeholder="Shorter, warmer, mention the tour…"
              className={input}
            />
          </label>
          <button type="submit" disabled={pending || !instruction.trim()} className="btn">
            {pending ? "Rewriting…" : "Rewrite"}
          </button>
        </form>
      )}
      {problem && (
        <p role="alert" className="text-sm">
          <span className={`font-semibold ${problem.code === "not_implemented" ? "text-ink" : "text-alert"}`}>
            {problem.title}.
          </span>{" "}
          <span className="text-ink-soft">{problem.message}</span>
        </p>
      )}
    </div>
  );
}
