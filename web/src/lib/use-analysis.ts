"use client";

import { useCallback, useEffect, useState } from "react";

import { echo, EchoError, OFFLINE, type Analysis } from "./echo";

const POLL_MS = 1000;
// Polls that may fail in a row, for a dropped connection, before the page shows the error.
const MISSES = 5;

export type AnalysisState = { analysis: Analysis | null; error: EchoError | null; retry: () => void };

// Loads an analysis and polls it once a second while it runs (docs/plan.md, API).
export function useAnalysis(id: string): AnalysisState {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<EchoError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let misses = 0;

    async function poll() {
      try {
        const next = await echo.analysis(id, controller.signal);
        misses = 0;
        setAnalysis(next);
        setError(null);
        if (next.status === "running") timer = setTimeout(poll, POLL_MS);
      } catch (caught) {
        if (controller.signal.aborted) return;
        if (caught instanceof EchoError && caught.code === OFFLINE && ++misses < MISSES) {
          timer = setTimeout(poll, POLL_MS);
          return;
        }
        setError(caught instanceof EchoError ? caught : new EchoError(0, "unknown", "Try again in a minute."));
      }
    }

    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { analysis, error, retry };
}
