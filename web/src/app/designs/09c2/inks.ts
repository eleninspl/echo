import type { Guest, Label } from "@/lib/echo";

export type Part = "fit" | "love" | "reach";

export const PARTS: Part[] = ["fit", "love", "reach"];

export const INK: Record<Part, string> = {
  fit: "#b23f0c",
  love: "#b0174c",
  reach: "#5b2fbf",
};

export const PART_NAME: Record<Part, string> = {
  fit: "Fit",
  love: "Love back",
  reach: "Reach",
};

export const PAPER = "#f8e6da";
export const PAPER_DEEP = "#f0d5c5";
export const RULE = "#dcbaa9";
export const AUBERGINE = "#2a1030";
export const DIM = "#745a70";

export const LABEL_ORDER: Label[] = [
  "sweet_spot",
  "safe",
  "far",
  "long_shot",
  "balanced",
];

export const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

export const LABEL_NOTE: Record<Label, string> = {
  sweet_spot: "High on all three.",
  safe: "Your listeners will enjoy them. Few new ones.",
  far: "New listeners who may not stay.",
  long_shot: "Their fans might come. Your listeners are lukewarm.",
  balanced: "Decent on each, top on none.",
};

export function scoreOf(guest: Guest, part: Part) {
  if (part === "fit") return guest.scores.fit;
  if (part === "love") return guest.scores.love_back;
  return guest.scores.reach;
}

export const out100 = (value: number) => Math.round(value * 100);

export function countSweet(guests: Guest[]) {
  return guests.filter((guest) => guest.label === "sweet_spot").length;
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
