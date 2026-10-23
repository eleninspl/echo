import type { AgeBucket, Fame, Filters, Label } from "./echo";

// Card copy per label, from docs/qloo.md, "Scoring".
export const LABELS: Record<Label, { name: string; means: string }> = {
  sweet_spot: {
    name: "Sweet spot",
    means: "Your audience over-indexes on them; their audience is new to you and likely to enjoy the show.",
  },
  safe: { name: "Safe", means: "Your audience is likely to enjoy it; few new listeners." },
  far: { name: "Far", means: "Brings new people who may not stay." },
  long_shot: { name: "Long shot", means: "Their fans might come; your audience is lukewarm." },
  balanced: { name: "Balanced", means: "Decent on each, not top on any." },
};

// What a label means for this guest. A sweet spot without reach is scored on fit and love back alone.
export function labelMeans(label: Label, noReach: boolean): string {
  if (label === "sweet_spot" && noReach) {
    return "Your audience over-indexes on them and their fans on your show; too little data to say how new those fans are.";
  }
  return LABELS[label].means;
}

export const AGES: Record<AgeBucket, string> = {
  "24_and_younger": "24 and younger",
  "25_to_29": "25 to 29",
  "30_to_34": "30 to 34",
  "35_to_44": "35 to 44",
  "45_to_54": "45 to 54",
  "55_and_older": "55 and older",
};

const FAME: Record<Fame, string | null> = { any: null, less_famous: "Less famous guests", rising: "Rising guests" };

const CATEGORIES: Record<string, string> = { tv: "TV", film: "Film", music: "Music", books: "Books" };

export function category(key: string): string {
  return CATEGORIES[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

// A percentile from 0 to 1 as a whole number out of 100.
export function score(value: number): string {
  return String(Math.round(value * 100));
}

// The filters that differ from the defaults, as short phrases.
export function filterPhrases(filters: Filters): string[] {
  const phrases: string[] = [];
  const fame = FAME[filters.fame];
  if (fame) phrases.push(fame);
  if (filters.age) phrases.push(`Listeners ${AGES[filters.age].toLowerCase()}`);
  if (filters.country) phrases.push(`In ${filters.country}`);
  if (filters.episode_about) phrases.push(`An episode about ${filters.episode_about.used ?? filters.episode_about.query}`);
  return phrases;
}
