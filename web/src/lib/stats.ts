import type { AgeBucket, Analysis, Guest, Label, QlooCall } from "./echo";

// The desk's readouts, all computed from the analysis itself. Nothing here is estimated or invented.

export const LABEL_ORDER: Label[] = ["sweet_spot", "safe", "far", "balanced", "long_shot"];
export const AGE_ORDER: AgeBucket[] = [
  "24_and_younger",
  "25_to_29",
  "30_to_34",
  "35_to_44",
  "45_to_54",
  "55_and_older",
];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// How long the Qloo calls took from the first starting to the last finishing. They run in parallel,
// so this is shorter than their sum.
function span(calls: QlooCall[]): number | null {
  const times = calls
    .map((call) => ({ start: Date.parse(call.at), duration: call.duration_ms }))
    .filter(({ start }) => !Number.isNaN(start));
  if (!times.length) return null;
  const start = Math.min(...times.map((t) => t.start));
  const end = Math.max(...times.map((t) => t.start + t.duration));
  return Math.max(end - start, 0);
}

export type Stats = ReturnType<typeof stats>;

export function stats(analysis: Analysis) {
  const { guests, qloo_calls: calls, left_out: leftOut, audience_map: map } = analysis;
  const labels = Object.fromEntries(LABEL_ORDER.map((label) => [label, 0])) as Record<Label, number>;
  for (const guest of guests) labels[guest.label] += 1;

  const reach = guests.map((guest) => guest.scores.reach).filter((value): value is number => value !== null);
  const fresh = calls.filter((call) => !call.cached);

  const ages = Object.fromEntries(AGE_ORDER.map((age) => [age, 0])) as Record<AgeBucket, number>;
  let withAges = 0;
  for (const guest of guests) {
    if (!guest.evidence?.ages.length) continue;
    withAges += 1;
    for (const age of guest.evidence.ages) ages[age] += 1;
  }

  const top: Guest | undefined = [...guests].sort((a, b) => b.scores.echo - a.scores.echo)[0];
  const items = map.flatMap((row) => row.items.map((item) => ({ ...item, category: row.category })));

  return {
    guests: guests.length,
    labels,
    sweet: labels.sweet_spot,
    top,
    medianFit: median(guests.map((guest) => guest.scores.fit)),
    medianLove: median(guests.map((guest) => guest.scores.love_back)),
    medianReach: median(reach),
    unscoredReach: guests.length - reach.length,
    calls: calls.length,
    fresh: fresh.length,
    cached: calls.length - fresh.length,
    slowest: fresh.length ? Math.max(...fresh.map((call) => call.duration_ms)) : null,
    medianCall: median(fresh.map((call) => call.duration_ms)),
    qlooTime: span(fresh),
    failedCalls: calls.filter((call) => call.status >= 400).length,
    hosts: leftOut.filter((entry) => entry.why === "host").length,
    pastGuests: leftOut.filter((entry) => entry.why === "past_guest").length,
    categories: map.filter((row) => row.items.length > 0).length,
    bands: map.filter((row) => row.items.length > 0).map((row) => ({ category: row.category, n: row.items.length })),
    tastes: items.length,
    strongest: [...items].sort((a, b) => b.affinity - a.affinity)[0],
    ages,
    withAges,
  };
}

// A duration as a value and its unit, for a readout.
export function ms(value: number | null): { value: string; unit?: string } {
  if (value === null) return { value: "–" };
  return value >= 1000
    ? { value: (value / 1000).toFixed(1), unit: "s" }
    : { value: String(Math.round(value)), unit: "ms" };
}
