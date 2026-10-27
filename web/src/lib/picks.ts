import type { Label } from "./echo";

// Picks are kept per show by the guest's entity ID, so they carry across reruns of the same show: a guest's
// ref is only their place in one run. The name and picture come along to say who isn't in a later run, and the
// run and ref they were picked in, so they can still be invited from it.
export type Pick = { id: string; name: string; analysis?: string; ref?: string; image_url?: string; label?: Label };

const key = (showId: string) => `echo.picks.${showId}`;

export function readPicks(showId: string): Pick[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key(showId)) ?? "[]");
    return Array.isArray(saved) ? saved.filter(isPick) : [];
  } catch {
    return [];
  }
}

export function savePicks(showId: string, picks: Pick[]) {
  try {
    if (picks.length) window.localStorage.setItem(key(showId), JSON.stringify(picks));
    else window.localStorage.removeItem(key(showId));
  } catch {
    return;
  }
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
