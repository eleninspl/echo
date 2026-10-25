"use client";

import { useEffect, useState } from "react";

import { echo, type Analysis } from "@/lib/echo";

const loaded = new Map<string, Promise<Analysis>>();

function load(id: string) {
  let pending = loaded.get(id);
  if (!pending) {
    pending = echo.analysis(id);
    pending.catch(() => loaded.delete(id));
    loaded.set(id, pending);
  }
  return pending;
}

export type Run =
  | { state: "loading" }
  | { state: "ready"; analysis: Analysis }
  | { state: "failed" };

type Outcome = { id: string; analysis: Analysis | null };

export function useRun(id: string | null): Run {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    load(id)
      .then((analysis) => live && setOutcome({ id, analysis }))
      .catch(() => live && setOutcome({ id, analysis: null }));
    return () => {
      live = false;
    };
  }, [id]);

  if (!id || outcome?.id !== id) return { state: "loading" };
  const { analysis } = outcome;
  if (!analysis || analysis.status === "failed") return { state: "failed" };
  if (analysis.status !== "done") return { state: "loading" };
  return { state: "ready", analysis };
}
