"use client";

import { useState, type FormEvent } from "react";

import { echo, type Analysis, type Draft, type Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";
import { describe, type HostError } from "@/lib/errors";
import { saveHostName, useHostName } from "@/lib/host-name";

import { CopyButton } from "./copy-button";
import { Chip, hue, Info, LABEL_HUE, rank, ZoneHead } from "./hud";
import { Problem } from "./problem";

export const MAX_PICKS = 5;

const input = "field w-full px-3 py-2";

// The Invite tab: pick up to five guests, then a draft for each to copy into the host's own email. Echo
// sends nothing.
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

  const full = picked.length >= MAX_PICKS;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <section aria-labelledby="pick-title" className="zone lg:col-span-4">
        <ZoneHead id="pick-title" title="Pick guests">
          <span className={picked.length ? "text-ink" : ""}>
            {picked.length} / {MAX_PICKS}
          </span>
        </ZoneHead>
        <ol className="flex flex-col py-1">
          {analysis.guests.map((guest, index) => {
            const on = picked.includes(guest.ref);
            return (
              <li key={guest.ref}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={full && !on}
                  onClick={() => onToggle(guest.ref)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-deck-hi/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    aria-hidden
                    className={`flex size-4 shrink-0 items-center justify-center border ${on ? "border-ink bg-ink" : "border-steel-hi"}`}
                  >
                    {on && (
                      <svg viewBox="0 0 10 10" className="size-2.5 text-on-hue">
                        <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    )}
                  </span>
                  <span className="readout w-5 text-xs text-ink-dim">{rank(index)}</span>
                  <span className="min-w-0 flex-1 truncate font-display font-semibold">{guest.name}</span>
                  <Chip color={LABEL_HUE[guest.label]}>{LABELS[guest.label].name}</Chip>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="invite" aria-labelledby="invite-title" className="zone order-first lg:order-none lg:col-span-8">
        <ZoneHead id="invite-title" title="Invitations">
          <span className={guests.length ? "text-ink" : ""}>
            {guests.length} / {MAX_PICKS} picked
          </span>
          <Info>
            Pick up to {MAX_PICKS} guests and Echo drafts an invitation to each. Echo sends nothing: copy each one into
            your own email.
          </Info>
        </ZoneHead>

        {guests.length === 0 ? (
          <p className="p-5 text-sm text-ink-dim">
            Pick up to {MAX_PICKS} guests, from the list or with Pick to invite on a guest. Echo drafts an invitation to
            each here.
          </p>
        ) : (
          <form onSubmit={write} className="grid gap-4 p-4 md:grid-cols-12 md:gap-x-6">
            <div className="flex flex-col gap-2 md:col-span-4">
              <p className="tag text-ink-dim">For</p>
              <ul className="flex flex-wrap gap-1.5">
                {guests.map((guest) => (
                  <li key={guest.ref}>
                    <button
                      type="button"
                      onClick={() => onToggle(guest.ref)}
                      className="flex items-center gap-1.5 rounded-[2px] bg-ink px-2 py-1 font-display text-sm font-semibold text-on-hue hover:opacity-85"
                    >
                      {guest.name}
                      <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
                        <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                      <span className="sr-only">: remove</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 md:col-span-5">
              {saved && !renaming ? (
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-soft">
                  Signed as <span className="font-semibold text-ink">{saved}</span>
                  <button
                    type="button"
                    onClick={() => setRenaming(true)}
                    className="text-fit underline underline-offset-4 hover:text-ink"
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
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Dates you record, the fee, a recent episode…"
                  className={input}
                />
              </label>
            </div>
            <div className="md:col-span-3 md:self-end">
              <button type="submit" disabled={pending} className="btn btn-solid w-full" style={hue("var(--ink)")}>
                {pending
                  ? "Writing…"
                  : `${drafts.length ? "Rewrite" : "Write"} ${guests.length === 1 ? "the invitation" : `${guests.length} invitations`}`}
              </button>
            </div>
          </form>
        )}

        {problem && (
          <div className="px-4 pb-4">
            <Problem problem={problem} />
          </div>
        )}

        {drafts.length > 0 && (
          <ol className="grid grid-cols-1 gap-3 border-t border-steel p-4 lg:grid-cols-2">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.guest_ref}
                analysisId={analysis.id}
                draft={draft}
                guest={analysis.guests.find((guest) => guest.ref === draft.guest_ref)}
                hostName={hostName.trim() || undefined}
                note={note.trim() || undefined}
                onRevised={replace}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

type CardProps = {
  analysisId: string;
  draft: Draft;
  guest: Guest | undefined;
  hostName?: string;
  note?: string;
  onRevised: (draft: Draft) => void;
};

function DraftCard({ analysisId, draft, guest, hostName, note, onRevised }: CardProps) {
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
    <li className="flex flex-col gap-3 border border-steel bg-deck-hi/50 p-3">
      <h3 className="font-display text-xl leading-none font-semibold">{name}</h3>
      <div aria-live="polite" className="screen p-4">
        <p className="text-sm text-ink-soft">
          Subject: <span className="font-semibold text-ink">{draft.subject}</span>
        </p>
        <p className="mt-3 max-w-prose text-sm whitespace-pre-wrap">{draft.body}</p>
      </div>
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
    </li>
  );
}
