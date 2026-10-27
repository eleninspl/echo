import type { MapFocus, TasteAsk } from "./echo";

export type Pointer = MapFocus & { key: number };

export type Ask = { text: string; taste?: TasteAsk };

export const TASTES_ID = "tastes";
export const STAGE_ID = "taste-stage";

export function showTastes() {
  document
    .getElementById(STAGE_ID)
    ?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
