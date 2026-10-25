import type { CSSProperties } from "react";

export const PAPER = "#f2ece0";
export const CARD = "#fdfbf6";
export const MANILA = "#e8d2a2";
export const MANILA_DEEP = "#d6b97f";
export const KRAFT = "#b48a5a";
export const KRAFT_DEEP = "#8f673b";
export const INK = "#231f1a";
export const INK_SOFT = "#5a5146";
export const INK_FAINT = "#776c5d";
export const RULE = "#c4d1e2";
export const RED = "#c23b2e";
export const RED_DEEP = "#9c2e23";

export const PALETTE = {
  "--d-paper": PAPER,
  "--d-card": CARD,
  "--d-manila": MANILA,
  "--d-manila-deep": MANILA_DEEP,
  "--d-kraft": KRAFT,
  "--d-kraft-deep": KRAFT_DEEP,
  "--d-ink": INK,
  "--d-ink-soft": INK_SOFT,
  "--d-ink-faint": INK_FAINT,
  "--d-rule": RULE,
  "--d-red": RED,
  "--d-red-deep": RED_DEEP,
} as CSSProperties;

export const CARD_STOCK = [
  { paper: "#e9d4a6", ink: "#5b4321" },
  { paper: "#d2d9c2", ink: "#3c4a2b" },
  { paper: "#cbd7e3", ink: "#2e4157" },
  { paper: "#edcfc3", ink: "#6b3426" },
];

export function stockFor(title: string) {
  let sum = 0;
  for (const letter of title) sum = (sum * 31 + letter.charCodeAt(0)) % 997;
  return CARD_STOCK[sum % CARD_STOCK.length];
}

export const FRAME = "mx-auto w-full max-w-[1200px] px-4 sm:px-8";
