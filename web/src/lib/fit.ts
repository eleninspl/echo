import type { CSSProperties } from "react";

// Big Shoulders set uppercase at weight 800 to 900 takes about 0.47 to 0.5em a letter (measured on the
// alphabet; a run of M is 0.8). A little over that leaves room for wide names.
const EM_PER_LETTER = 0.54;

// A font size for display text that keeps its longest word on one line: the given size, or smaller
// when the word wouldn't fit the width of the nearest container (`@container`). Names break between
// words and after hyphens, never inside a word. `extra` is any width in em beside the text, such as
// the bill's ring.
export function fitLongestWord(text: string, size: string, extra = 0): CSSProperties {
  const parts = text.split(/\s+/).flatMap((word) => word.split("-").map((part, i, all) => part.length + (i < all.length - 1 ? 1 : 0)));
  const longest = Math.max(1, ...parts);
  return { fontSize: `min(${size}, calc(100cqi / ${(longest * EM_PER_LETTER + extra).toFixed(2)}))` };
}
