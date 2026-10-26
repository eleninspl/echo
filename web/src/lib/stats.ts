import type { AgeBucket, Analysis, Label } from "./echo";

// The page's readouts, all computed from the analysis itself. Nothing here is estimated or invented.

export const LABEL_ORDER: Label[] = ["sweet_spot", "safe", "far", "balanced", "long_shot"];
export const AGE_ORDER: AgeBucket[] = [
  "24_and_younger",
  "25_to_29",
  "30_to_34",
  "35_to_44",
  "45_to_54",
  "55_and_older",
];

export type Stats = ReturnType<typeof stats>;

export function stats(analysis: Analysis) {
  const { guests } = analysis;
  const labels = Object.fromEntries(LABEL_ORDER.map((label) => [label, 0])) as Record<Label, number>;
  for (const guest of guests) labels[guest.label] += 1;

  const ages = Object.fromEntries(AGE_ORDER.map((age) => [age, 0])) as Record<AgeBucket, number>;
  let withAges = 0;
  for (const guest of guests) {
    if (!guest.evidence?.ages.length) continue;
    withAges += 1;
    for (const age of guest.evidence.ages) ages[age] += 1;
  }

  return {
    guests: guests.length,
    labels,
    sweet: labels.sweet_spot,
    ideas: guests.filter((guest) => guest.idea !== null).length,
    ages,
    withAges,
  };
}

// Whether the engine writes episode ideas. Without a writing model every idea comes back null, and that
// doesn't change between runs, so the last finished run's answer is kept for the next run's step list.
const IDEAS = "echo.ideas";

export function noteIdeas(analysis: Analysis) {
  if (analysis.status !== "done" || !analysis.guests.length) return;
  try {
    window.sessionStorage.setItem(IDEAS, analysis.guests.some((guest) => guest.idea) ? "on" : "off");
  } catch {
    return;
  }
}

export function ideasOff(): boolean {
  try {
    return window.sessionStorage.getItem(IDEAS) === "off";
  } catch {
    return false;
  }
}
