"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { echo, EchoError, OFFLINE, type Analysis } from "./echo";

const POLL_MS = 1000;
// Polls that may fail in a row, for a dropped connection, before the page shows the error.
const MISSES = 5;

export type AnalysisState = {
  analysis: Analysis | null;
  error: EchoError | null;
  retry: () => void;
  // Changes the loaded analysis in place, for a rewritten idea; the engine has saved the same change.
  update: (change: (analysis: Analysis) => Analysis) => void;
};

// Loads an analysis and polls it once a second while it runs (docs/plan.md, API). With a null ID it
// does nothing. `onDone` is called once the analysis is done.
export function useAnalysis(id: string | null, onDone?: (analysis: Analysis) => void): AnalysisState {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<EchoError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (id === null) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let misses = 0;

    async function poll(id: string) {
      try {
        const next = await echo.analysis(id, controller.signal);
        misses = 0;
        setAnalysis(next);
        setError(null);
        if (next.status === "running") timer = setTimeout(() => poll(id), POLL_MS);
        if (next.status === "done") done.current?.(next);
      } catch (caught) {
        if (controller.signal.aborted) return;
        if (caught instanceof EchoError && caught.code === OFFLINE && ++misses < MISSES) {
          timer = setTimeout(() => poll(id), POLL_MS);
          return;
        }
        setError(caught instanceof EchoError ? caught : new EchoError(0, "unknown", "Try again in a minute."));
      }
    }

    poll(id);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const update = useCallback((change: (analysis: Analysis) => Analysis) => {
    setAnalysis((current) => (current ? change(current) : current));
  }, []);

  return { analysis, error, retry, update };
}
