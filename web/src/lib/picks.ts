// Picks are kept per show by the guest's entity ID, so they carry across reruns of the same show: a guest's
// ref is only their place in one run. The name comes along to say who isn't in a later run.
export type Pick = { id: string; name: string };

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

function isPick(value: unknown): value is Pick {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Pick).id === "string" &&
    typeof (value as Pick).name === "string"
  );
}
