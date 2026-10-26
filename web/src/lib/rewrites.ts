import type { Analysis, Idea } from "./echo";

// Ideas Echo rewrote in the chat, per analysis, in this browser only. The engine doesn't save them: an
// analysis is shared by everyone who opens it, a featured show by every visitor.
const key = (analysisId: string) => `echo.rewrites.${analysisId}`;

export function readRewrites(analysisId: string): Record<string, Idea> {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(key(analysisId)) ?? "{}");
    if (typeof saved !== "object" || saved === null || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, idea]) => isIdea(idea))) as Record<string, Idea>;
  } catch {
    return {};
  }
}

export function saveRewrite(analysisId: string, ref: string, idea: Idea) {
  try {
    const { reason, title, pitch } = idea;
    window.localStorage.setItem(
      key(analysisId),
      JSON.stringify({
        ...readRewrites(analysisId),
        [ref]: { reason, title, pitch },
      }),
    );
  } catch {
    return;
  }
}

// The analysis with this browser's rewritten ideas in place, each marked; the same object when there are none.
export function withRewrites(analysis: Analysis, rewrites: Record<string, Idea>): Analysis {
  if (!analysis.guests.some((guest) => rewrites[guest.ref] && !guest.idea?.rewritten)) return analysis;
  return {
    ...analysis,
    guests: analysis.guests.map((guest) =>
      rewrites[guest.ref] ? { ...guest, idea: { ...rewrites[guest.ref], rewritten: true } } : guest,
    ),
  };
}

function isIdea(value: unknown): value is Idea {
  if (typeof value !== "object" || value === null) return false;
  const idea = value as Record<string, unknown>;
  return typeof idea.reason === "string" && typeof idea.title === "string" && typeof idea.pitch === "string";
}
