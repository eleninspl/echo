"use client";

import type { Label } from "./echo";
import { readStored, storedKeys, useStored, useStoredKeys, useStoredSnapshot, writeStored } from "./stored";

// Picks are kept per show by the guest's entity ID, so they carry across reruns of the same show: a guest's
// ref is only their place in one run. The name and picture come along to say who isn't in a later run, and the
// run and ref they were picked in, so they can still be invited from it.
export type Pick = { id: string; name: string; analysis?: string; ref?: string; image_url?: string; label?: Label };

const PREFIX = "echo.picks.";
const key = (showId: string) => `${PREFIX}${showId}`;

function parsePicks(value: unknown): Pick[] {
  return Array.isArray(value) ? value.filter(isPick) : [];
}

const noPicks = (picks: Pick[]) => picks.length === 0;

export function readPicks(showId: string): Pick[] {
  return readStored(key(showId), parsePicks);
}

export function savePicks(showId: string, picks: Pick[]) {
  writeStored(key(showId), picks.length ? picks : null);
}

export function usePicks(showId: string) {
  return useStored(key(showId), parsePicks, noPicks);
}

export function usePickedShows(): string[] {
  return useStoredKeys(PREFIX);
}

export function usePickCount(): number {
  return useStoredSnapshot(() => storedKeys(PREFIX).reduce((sum, show) => sum + readPicks(show).length, 0), 0);
}

const LABELS: readonly Label[] = ["sweet_spot", "safe", "far", "long_shot", "balanced"];

function isPick(value: unknown): value is Pick {
  if (typeof value !== "object" || value === null) return false;
  const pick = value as Record<string, unknown>;
  const optional = (key: string) => pick[key] === undefined || typeof pick[key] === "string";
  return (
    typeof pick.id === "string" &&
    typeof pick.name === "string" &&
    optional("analysis") &&
    optional("ref") &&
    optional("image_url") &&
    (pick.label === undefined || LABELS.includes(pick.label as Label))
  );
}
