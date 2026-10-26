"use client";

import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";

import { echo, type Analysis, type Draft, type Guest } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import { saveHostName, useHostName } from "@/lib/host-name";
import { analysisPath } from "@/lib/paths";

import { CopyButton } from "./copy-button";
import { Picture } from "./guest-list";
import { LABEL_HUE, SectionHead } from "./hud";
import { Problem } from "./problem";

export const MAX_PICKS = 5;

const input = "field w-full px-3 py-2";

const TITLE = "font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-semibold text-balance";

// The invite page: the guests picked on the guests page, then a draft for each to copy into the host's own
// email. Echo sends nothing.
export function Invite({
  analysis,
  picked,
  onToggle,
}: {
  analysis: Analysis;
  picked: string[];
  onToggle: (ref: string) => void;
}) {
  const saved = useHostName();
  const [typed, setTyped] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const hostName = typed ?? saved;
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<HostError | null>(null);
  const guests = picked
    .map((ref) => analysis.guests.find((guest) => guest.ref === ref))
    .filter((guest): guest is Guest => guest !== undefined);
  const written = drafts.filter((draft) => picked.includes(draft.guest_ref));

  async function write(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setProblem(null);
    if (hostName.trim()) saveHostName(hostName.trim());
    setRenaming(false);
    try {
      const response = await echo.drafts({
        analysis_id: analysis.id,
        guest_refs: picked,
        host_name: hostName.trim() || undefined,
        note: note.trim() || undefined,
      });
      setDrafts(response.drafts);
    } catch (error) {
      setProblem(describe(error));
    }
    setPending(false);
  }

  function replace(draft: Draft) {
    setDrafts((current) => current.map((old) => (old.guest_ref === draft.guest_ref ? draft : old)));
  }

  if (!guests.length) {
    return (
      <section aria-labelledby="invite-title" className="flex max-w-[60ch] flex-col items-start gap-4">
        <h1 id="invite-title" className={TITLE}>
          No guests picked yet
        </h1>
        <p className="text-ink-soft">
          Pick up to {MAX_PICKS} guests with + on the guests page, and Echo drafts an invitation to each.
        </p>
        <Link href={analysisPath(analysis.id)} className="btn btn-brand mt-2 min-h-12 px-6 text-base">
          Choose guests
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-14">
      <section aria-labelledby="invite-title" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 id="invite-title" className={TITLE}>
            Invite {guests.length === 1 ? guests[0].name : `${guests.length} guests`}
          </h1>
          <p className="max-w-[60ch] text-ink-soft">
            Echo drafts an email to each, from what your audiences share. It sends nothing: copy each one into your own
            email.
          </p>
        </div>

        <ul aria-label="Picked to invite" className="flex flex-wrap gap-x-5 gap-y-5">
          {guests.map((guest, index) => (
            <li
              key={guest.ref}
              className="rise flex w-24 flex-col items-center gap-2.5 text-center"
              style={{ "--order": index } as CSSProperties}
            >
              <span className="relative">
                <span
                  className="relative block size-20 overflow-hidden rounded-full bg-well"
                  style={{ boxShadow: `0 0 0 2px var(--void), 0 0 0 3.5px ${LABEL_HUE[guest.label]}` }}
                >
                  <Picture guest={guest} sizes="80px" small />
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(guest.ref)}
                  title="Remove"
                  className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-deck text-ink-soft shadow-[inset_0_0_0_1px_var(--steel-hi)] transition-colors hover:bg-deck-hi hover:text-ink"
                >
                  <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  <span className="sr-only">Remove {guest.name}</span>
                </button>
              </span>
              <span className="line-clamp-2 font-display text-sm leading-tight font-semibold">{guest.name}</span>
            </li>
          ))}
          {guests.length < MAX_PICKS && (
            <li className="flex w-24 flex-col items-center gap-2.5 text-center">
              <Link
                href={analysisPath(analysis.id)}
                className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-steel-hi text-ink-dim transition-colors hover:border-ink-dim hover:text-ink"
              >
                <svg aria-hidden viewBox="0 0 12 12" className="size-4">
                  <path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="sr-only">Add more guests</span>
              </Link>
              <span aria-hidden className="text-sm text-ink-dim">
                Add more
              </span>
            </li>
          )}
        </ul>

        <form
          onSubmit={write}
          className="grid gap-5 border-t border-steel pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-end md:gap-x-6"
        >
          {saved && !renaming ? (
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-soft md:pb-3">
              Signed as <span className="font-semibold text-ink">{saved}</span>
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
                value={hostName}
                onChange={(event) => setTyped(event.target.value)}
                maxLength={80}
                autoComplete="name"
                autoFocus={renaming}
                className={input}
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="tag text-ink-dim">Anything to mention</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              placeholder="Dates you record, the fee, a recent episode…"
              className={input}
            />
          </label>
          <button type="submit" disabled={pending} className="btn btn-brand min-h-12 px-6 text-base">
            {pending
              ? "Writing…"
              : `${written.length ? "Rewrite" : "Write"} ${guests.length === 1 ? "the invitation" : `${guests.length} invitations`}`}
          </button>
        </form>

        {problem && <Problem problem={problem} />}
      </section>

      {written.length > 0 && (
        <section aria-labelledby="drafts-title" className="flex flex-col gap-5">
          <SectionHead id="drafts-title" title="Your invitations">
            <span>{written.length}</span>
          </SectionHead>
          <ol className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {written.map((draft, index) => (
              <DraftCard
                key={draft.guest_ref}
                analysisId={analysis.id}
                draft={draft}
                guest={analysis.guests.find((guest) => guest.ref === draft.guest_ref)}
                order={index}
                hostName={hostName.trim() || undefined}
                note={note.trim() || undefined}
                onRevised={replace}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

type CardProps = {
  analysisId: string;
  draft: Draft;
  guest: Guest | undefined;
  order: number;
  hostName?: string;
  note?: string;
  onRevised: (draft: Draft) => void;
};

function DraftCard({ analysisId, draft, guest, order, hostName, note, onRevised }: CardProps) {
  const [instruction, setInstruction] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<HostError | null>(null);

  async function revise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    setPending(true);
    setProblem(null);
    try {
      const { drafts } = await echo.drafts({
        analysis_id: analysisId,
        guest_refs: [draft.guest_ref],
        host_name: hostName,
        note,
        previous: { subject: draft.subject, body: draft.body },
        instruction: instruction.trim(),
      });
      if (drafts[0]) onRevised(drafts[0]);
      setInstruction("");
    } catch (error) {
      setProblem(describe(error));
    }
    setPending(false);
  }

  const name = guest?.name ?? draft.guest_ref;
  return (
    <li
      className="rise flex flex-col gap-4 rounded-2xl bg-well p-5 shadow-[inset_0_0_0_1px_var(--steel)] sm:p-6"
      style={{ "--order": order * 3 } as CSSProperties}
    >
      <p className="flex items-center gap-3">
        {guest && (
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-deck">
            <Picture guest={guest} sizes="36px" small />
          </span>
        )}
        <span className="tag text-ink-dim">To</span>
        <span className="font-display text-lg leading-none font-semibold">{name}</span>
      </p>
      <div aria-live="polite" className="flex flex-col gap-3 border-t border-steel pt-4">
        <p className="font-semibold">{draft.subject}</p>
        <p className="max-w-prose text-sm whitespace-pre-wrap text-ink-soft">{draft.body}</p>
      </div>
      <div className="mt-auto flex flex-col gap-3 border-t border-steel pt-4">
        <CopyButton text={`Subject: ${draft.subject}\n\n${draft.body}`} label="Copy subject and text" of={name} />
        <form onSubmit={revise} className="flex gap-2">
          <label className="flex flex-1">
            <span className="sr-only">Change the invitation to {name}</span>
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
        {problem && (
          <p role="alert" className="text-sm">
            <span className="font-semibold text-alert">{problem.title}.</span>{" "}
            <span className="text-ink-soft">{problem.message}</span>
          </p>
        )}
      </div>
    </li>
  );
}
