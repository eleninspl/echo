"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { echo, EchoError, OFFLINE, type Analysis, type Filters } from "./echo";

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

export type Rerun = {
  // Starts the same show again with these filters; `from` names the control that asked, to show progress there.
  start: (filters: Filters, from: string) => void;
  from: string | null;
  // The new run while it goes, for its steps.
  running: Analysis | null;
  // From the click until the new run is done or fails.
  busy: boolean;
  // Why the new run didn't start or failed. The page still shows the run from before.
  error: EchoError | null;
};

// Runs the show of the analysis on the page (`openId`) again and keeps that page until the new run is done, then
// calls `onDone` with it, as a chat rerun does (W8). Its progress and errors belong to the page it started on.
export function useRerun(showId: string, openId: string | null, onDone: (analysis: Analysis) => void): Rerun {
  const [runId, setRunId] = useState<string | null>(null);
  const [source, setSource] = useState<{ from: string; on: string | null } | null>(null);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState<EchoError | null>(null);
  const finished = useCallback(
    (next: Analysis) => {
      setRunId(null);
      onDone(next);
    },
    [onDone],
  );
  const run = useAnalysis(runId, finished);
  const current = runId !== null && run.analysis?.id === runId ? run.analysis : null;

  const start = useCallback(
    async (filters: Filters, from: string) => {
      setSource({ from, on: openId });
      setFailed(null);
      setRunId(null);
      setStarting(true);
      try {
        const { id } = await echo.startAnalysis(showId, filters);
        setRunId(id);
      } catch (caught) {
        setFailed(caught instanceof EchoError ? caught : new EchoError(0, "unknown", "Try again in a minute."));
      }
      setStarting(false);
    },
    [showId, openId],
  );

  const error =
    failed ??
    (runId !== null ? run.error : null) ??
    (current?.status === "failed" && current.error
      ? new EchoError(0, current.error.error, current.error.message)
      : null);
  const busy = starting || (runId !== null && error === null);
  const here = source !== null && source.on === openId;
  return {
    start,
    from: here ? source.from : null,
    running: current?.status === "running" ? current : null,
    busy,
    error: here ? error : null,
  };
}
