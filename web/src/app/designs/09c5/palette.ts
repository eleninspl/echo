import type { Guest, Label } from "@/lib/echo";

export type Part = "fit" | "love" | "reach";

export const PARTS: Part[] = ["fit", "love", "reach"];

export const PART_NAME: Record<Part, string> = {
  fit: "Fit",
  love: "Love back",
  reach: "Reach",
};

export const TONE: Record<Part, string> = {
  fit: "#dd6c10",
  love: "#cf2470",
  reach: "#7445dc",
};

export const INK = "#2a1030";
export const GROUND = "#fff0e8";
export const SOFT = "#5b4160";
export const MUTED = "#755c70";
export const LINE = "#e8cfc4";

export const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

export function scoreOf(guest: Guest, part: Part) {
  if (part === "fit") return guest.scores.fit;
  if (part === "love") return guest.scores.love_back;
  return guest.scores.reach;
}

export function barFor(guest: Guest, part: Part) {
  if (part === "fit") return 0.5;
  if (guest.scores.reach === null) return part === "love" ? 0.5 : null;
  return 0.33;
}

export function clears(guest: Guest, part: Part) {
  const value = scoreOf(guest, part);
  const bar = barFor(guest, part);
  return value !== null && bar !== null && value >= bar;
}

export const out100 = (value: number) => Math.round(value * 100);

const WORDS = [
  "none",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

export function word(count: number) {
  return count < WORDS.length ? WORDS[count] : String(count);
}

export function capital(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ordinal(rank: number) {
  const tens = rank % 100;
  if (tens >= 11 && tens <= 13) return `${rank}th`;
  const suffix = ["th", "st", "nd", "rd"][rank % 10] ?? "th";
  return `${rank}${suffix}`;
}

export function countLabel(guests: Guest[], label: Label) {
  return guests.filter((guest) => guest.label === label).length;
}

export function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export function runHref(analysisId: string) {
  return `/analyses/${encodeURIComponent(analysisId)}`;
}
