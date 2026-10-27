"use client";

import type { Draft, DraftText, InviteDetails } from "./echo";
import { describe, type HostError } from "./errors";
import { isRecord, stringsOf, useStored } from "./stored";

// What the invite page keeps in this browser, never on the engine: the drafts per show and guest (they carry
// the host's name, notes and details), the notes, the practical details, and the guests' emails. Echo never looks an email up or sends one anywhere.

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

export function useDrafts(showId: string) {
  return useStored(`echo.drafts.${showId}`, parseDrafts, noDrafts);
}

export function useNotes(showId: string) {
  return useStored(`echo.notes.${showId}`, parseNotes, noNotes);
}

// By the guest's entity ID, not their ref, so an email typed once stays with the guest across runs.
export function useEmails() {
  return useStored("echo.guest-emails", stringsOf, noEmails);
}

// The practical details: one set for everyone, and per guest (by entity ID) their own dates and fee. Kept per show,
// not per run, so a rerun of the same show keeps them.
export type Details = { forAll: InviteDetails; perGuest: Record<string, InviteDetails> };

// The engine's limits, in characters.
export const DETAIL_LIMITS = { dates: 80, fee: 40, place: 80, length: 30, release: 40, reply_by: 40 } as const;
type TextDetail = keyof typeof DETAIL_LIMITS;
const TEXT_DETAILS = Object.keys(DETAIL_LIMITS) as TextDetail[];

function parseDetail(value: unknown): InviteDetails {
  if (!isRecord(value)) return {};
  const details: InviteDetails = {};
  for (const key of TEXT_DETAILS) {
    if (typeof value[key] === "string") details[key] = value[key];
  }
  if (value.unpaid === true) details.unpaid = true;
  if (value.format === "in_person" || value.format === "remote") details.format = value.format;
  return details;
}

function parseDetails(value: unknown): Details {
  const details = isRecord(value) ? value : {};
  const perGuest = isRecord(details.perGuest) ? details.perGuest : {};
  return {
    forAll: parseDetail(details.forAll),
    perGuest: Object.fromEntries(Object.entries(perGuest).map(([id, own]) => [id, parseDetail(own)])),
  };
}

// The details as the engine takes them: trimmed, blanks left out, no fee when unpaid and no place when remote.
// Undefined when nothing is given.
export function cleanDetails(details: InviteDetails | undefined): InviteDetails | undefined {
  if (!details) return undefined;
  const clean: InviteDetails = {};
  for (const key of TEXT_DETAILS) {
    const text = details[key]?.trim().slice(0, DETAIL_LIMITS[key]);
    if (text) clean[key] = text;
  }
  if (details.unpaid) {
    clean.unpaid = true;
    delete clean.fee;
  }
  if (details.format) clean.format = details.format;
  if (details.format === "remote") delete clean.place;
  return Object.keys(clean).length ? clean : undefined;
}

// A guest's own dates or fee replace everyone's, as the engine does it.
export function mergedDetails(forAll: InviteDetails | undefined, own: InviteDetails | undefined): InviteDetails {
  const merged = { ...forAll };
  if (own?.dates) merged.dates = own.dates;
  if (own?.fee || own?.unpaid) {
    merged.fee = own.fee;
    merged.unpaid = own.unpaid;
  }
  return merged;
}

const noDetails = (details: Details) =>
  !cleanDetails(details.forAll) && !Object.values(details.perGuest).some((own) => cleanDetails(own));

export function useDetails(showId: string) {
  return useStored(`echo.invite-details.${showId}`, parseDetails, noDetails);
}

export function useEpisodeLength(showId: string): string | undefined {
  const [details] = useDetails(showId);
  return cleanDetails(details.forAll)?.length;
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
