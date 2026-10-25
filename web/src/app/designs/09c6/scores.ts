import type { Guest, Label } from "@/lib/echo";

export type Part = "fit" | "love" | "reach";

export const PARTS: { part: Part; name: string }[] = [
  { part: "fit", name: "Fit" },
  { part: "love", name: "Love back" },
  { part: "reach", name: "Reach" },
];

export const TONE: Record<Part, string> = {
  fit: "#e0601c",
  love: "#d42a66",
  reach: "#7c4ce6",
};

export const INK: Record<Part, string> = {
  fit: "#b5420b",
  love: "#b81d55",
  reach: "#6234cc",
};

export const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

export function levels(guest: Guest): [Part, number | null][] {
  return [
    ["fit", guest.scores.fit],
    ["love", guest.scores.love_back],
    ["reach", guest.scores.reach],
  ];
}

export const out100 = (value: number) => String(Math.round(value * 100));

export function sweetRun(guests: Guest[]) {
  const first = guests.findIndex((guest) => guest.label === "sweet_spot");
  if (first < 0) return null;
  let last = first;
  while (guests[last + 1]?.label === "sweet_spot") last++;
  const total = guests.filter((guest) => guest.label === "sweet_spot").length;
  return { first, last, total, whole: last - first + 1 === total };
}

export function callFirst(guests: Guest[]) {
  const complete = (guest: Guest) => guest.scores.reach !== null;
  const sweet = guests.findIndex(
    (guest) => guest.label === "sweet_spot" && complete(guest),
  );
  if (sweet >= 0) return sweet;
  const anySweet = guests.findIndex((guest) => guest.label === "sweet_spot");
  return anySweet >= 0 ? anySweet : 0;
}

export function fewNewEars(guests: Guest[]) {
  return guests.findIndex(
    (guest) =>
      guest.label === "safe" &&
      guest.scores.reach !== null &&
      guest.scores.reach < 0.3,
  );
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
