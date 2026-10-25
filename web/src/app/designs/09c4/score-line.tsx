import type { Scores } from "@/lib/echo";

import { PARTS, SCORE, SCORE_NAME, type Part } from "./palette";

export function valueOf(scores: Pick<Scores, "fit" | "love_back" | "reach">, part: Part) {
  if (part === "fit") return scores.fit;
  if (part === "love") return scores.love_back;
  return scores.reach;
}

export function Figure({ value }: { value: number | null }) {
  if (value === null)
    return (
      <>
        <span aria-hidden>–</span>
        <span className="sr-only">not scored</span>
      </>
    );
  return <>{Math.round(value * 100)}</>;
}

export function ScoreLine({
  scores,
}: {
  scores: Pick<Scores, "fit" | "love_back" | "reach">;
}) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-[0.95rem]">
      {PARTS.map((part) => (
        <span key={part} className="inline-flex items-baseline gap-1.5">
          <span style={{ color: SCORE[part] }}>{SCORE_NAME[part]}</span>
          <span className="w4-figures font-semibold text-(--w4-ink)">
            <Figure value={valueOf(scores, part)} />
          </span>
        </span>
      ))}
    </span>
  );
}
