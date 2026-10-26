"use client";

import type { Draft, DraftText } from "./echo";
import { describe, type HostError } from "./errors";
import { isRecord, stringsOf, useStored } from "./stored";

// What the invite page keeps in this browser, never on the engine: the drafts per analysis and guest (they carry
// the host's name and notes), the notes, and the guests' emails. Echo never looks an email up or sends one anywhere.

// `changed`: the host edited it or asked Echo to rewrite it, so writing everyone again asks before replacing it.
export type SavedDraft = DraftText & { changed: boolean };
export type Drafts = Record<string, SavedDraft>;
export type Notes = { forAll: string; perGuest: Record<string, string> };

export const NOTE_LIMIT = 300;
export const SHARED_NOTE_LIMIT = 500;

function parseDrafts(value: unknown): Drafts {
  if (!isRecord(value)) return {};
  const drafts: Drafts = {};
  for (const [ref, draft] of Object.entries(value)) {
    if (isRecord(draft) && typeof draft.subject === "string" && typeof draft.body === "string") {
      drafts[ref] = {
        subject: draft.subject,
        body: draft.body,
        changed: draft.changed === true,
      };
    }
  }
  return drafts;
}

function parseNotes(value: unknown): Notes {
  const notes = isRecord(value) ? value : {};
  return {
    forAll: typeof notes.forAll === "string" ? notes.forAll : "",
    perGuest: stringsOf(notes.perGuest),
  };
}

const noDrafts = (drafts: Drafts) => Object.keys(drafts).length === 0;
const noNotes = (notes: Notes) => !notes.forAll && !Object.values(notes.perGuest).some(Boolean);
const noEmails = (emails: Record<string, string>) => !Object.values(emails).some(Boolean);

export function useDrafts(analysisId: string) {
  return useStored(`echo.drafts.${analysisId}`, parseDrafts, noDrafts);
}

export function useNotes(analysisId: string) {
  return useStored(`echo.notes.${analysisId}`, parseNotes, noNotes);
}

// By the guest's entity ID, not their ref, so an email typed once stays with the guest across runs.
export function useEmails() {
  return useStored("echo.guest-emails", stringsOf, noEmails);
}

export function saved(draft: Draft, changed = false): SavedDraft {
  return { subject: draft.subject, body: draft.body, changed };
}

const EMAIL = /^[^\s@,;?&/]+@[^\s@,;?&/]+\.[^\s@,;?&/]+$/;

export const isEmail = (text: string) => EMAIL.test(text.trim());

// A new email in the host's own mail app, to the guest when their address is given. Line breaks as CRLF, per RFC
// 6068.
export function mailto(draft: DraftText, email: string): string {
  const to = isEmail(email) ? email.trim() : "";
  const body = draft.body.replace(/\r?\n/g, "\r\n");
  return `mailto:${to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(body)}`;
}

// A writing call that failed. When the engine has no LLM (`not_implemented`), says so plainly, naming what can't be
// written here.
export function writingProblem(error: unknown, what: string): HostError {
  const problem = describe(error);
  if (problem.code !== "not_implemented") return problem;
  return {
    ...problem,
    title: "Not set up on this server",
    message: `Writing ${what} isn't set up on this server, so Echo can't write them here. Everything else works.`,
  };
}
