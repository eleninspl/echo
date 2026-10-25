import type { Scores } from "@/lib/echo";

export type Part = "fit" | "love" | "reach";

export const TONE: Record<Part, string> = {
  fit: "#e8621a",
  love: "#db2b6e",
  reach: "#7c4ce6",
};

export const INK: Record<Part, string> = {
  fit: "#b5420b",
  love: "#c01f5c",
  reach: "#6638d4",
};

export const SCORES: {
  part: Part;
  field: keyof Omit<Scores, "echo">;
  name: string;
  means: string;
}[] = [
  {
    part: "fit",
    field: "fit",
    name: "Fit",
    means: "Your listeners over-index on them, beyond their fame.",
  },
  {
    part: "love",
    field: "love_back",
    name: "Love back",
    means: "Their fans over-index on your show.",
  },
  {
    part: "reach",
    field: "reach",
    name: "Reach",
    means: "Their fans don't listen to you yet.",
  },
];

export const SWEET_SPOT =
  "High on all three at once. Rare, usually 1 to 4 guests in 20.";
