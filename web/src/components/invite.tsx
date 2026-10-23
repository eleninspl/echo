"use client";

import { useState, type FormEvent } from "react";

import { echo, type Analysis, type Draft, type Guest } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";

import { CopyButton } from "./copy-button";
import { Problem } from "./problem";

export const MAX_PICKS = 5;

const input =
  "w-full border-2 border-ink bg-well px-3 py-2 text-ink placeholder:text-ink-soft focus-visible:outline-offset-2";
const button = "border-2 border-ink px-4 py-2 font-semibold hover:bg-ink hover:text-stock disabled:opacity-60";

// Drafts for the picked guests, one each, to copy into the host's own email. Echo sends nothing.
export function Invite({ analysis, picked }: { analysis: Analysis; picked: string[] }) {
  const [hostName, setHostName] = useState("");
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

  return (
    <section id="invite" aria-labelledby="invite-title" className="scroll-mt-6 border-t-2 border-ink">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <h2 id="invite-title" className="font-display text-5xl leading-none font-extrabold uppercase">
          Invitations
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Pick up to {MAX_PICKS} guests in the table and Echo drafts an invitation to each. Echo sends nothing: copy each
          one into your own email.
        </p>

        {guests.length > 0 && (
          <form onSubmit={write} className="mt-8 grid gap-6 md:grid-cols-12 md:gap-x-8">
            <div className="md:col-span-4">
              <p className="text-sm font-semibold">For</p>
              <p className="mt-1 font-display text-2xl leading-tight font-extrabold uppercase">
                {guests.map((guest) => guest.name).join(", ")}
              </p>
            </div>
            <div className="flex flex-col gap-4 md:col-span-5">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Your name, to sign with
                <input
                  value={hostName}
                  onChange={(event) => setHostName(event.target.value)}
                  maxLength={80}
                  autoComplete="name"
                  className={input}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Anything to mention
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Dates you record, the fee, a recent episode…"
                  className={input}
                />
              </label>
            </div>
            <div className="md:col-span-3 md:self-end">
              <button type="submit" disabled={pending} className={`${button} w-full bg-ink text-stock hover:opacity-90`}>
                {pending
                  ? "Writing…"
                  : `${drafts.length ? "Rewrite" : "Write"} ${guests.length === 1 ? "the invitation" : `${guests.length} invitations`}`}
              </button>
            </div>
          </form>
        )}

        {problem && (
          <div className="mt-8">
            <Problem problem={problem} />
          </div>
        )}

        {drafts.length > 0 && (
          <ol className="mt-10 flex flex-col gap-10">
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
      </div>
    </section>
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
    <li className="grid gap-6 border-t border-rule pt-6 md:grid-cols-12 md:gap-x-8">
      <h3 className="font-display text-3xl leading-none font-extrabold uppercase md:col-span-4">{name}</h3>
      <div className="flex flex-col gap-4 md:col-span-8">
        <div aria-live="polite" className="border-2 border-ink bg-well p-4 sm:p-6">
          <p className="text-sm text-ink-soft">
            Subject: <span className="font-semibold text-ink">{draft.subject}</span>
          </p>
          <p className="mt-4 max-w-prose whitespace-pre-wrap">{draft.body}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={`Subject: ${draft.subject}\n\n${draft.body}`} label="Copy subject and text" of={name} />
        </div>
        <form onSubmit={revise} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold">
            Change it
            <span className="sr-only">, the invitation to {name}</span>
            <input
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              maxLength={300}
              placeholder="Shorter, warmer, mention the tour…"
              className={input}
            />
          </label>
          <button type="submit" disabled={pending || !instruction.trim()} className={button}>
            {pending ? "Rewriting…" : "Rewrite"}
          </button>
        </form>
        {problem && (
          <p role="alert" className="text-sm">
            <span className="font-semibold">{problem.title}.</span> {problem.message}
          </p>
        )}
      </div>
    </li>
  );
}
