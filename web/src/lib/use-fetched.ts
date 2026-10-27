"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { describe, type HostError } from "./errors";

const kept = new Map<string, unknown>();

export type Fetched<T> = { value: T | null; loading: boolean; problem: HostError | null; retry: () => void };

export function useFetched<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): Fetched<T> {
  const [failed, setFailed] = useState<{ key: string; problem: HostError } | null>(null);
  const [, setLoaded] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const fetchNow = useEffectEvent((signal: AbortSignal) => load(signal));

  useEffect(() => {
    if (key === null || kept.has(key)) return;
    const controller = new AbortController();
    fetchNow(controller.signal)
      .then((value) => {
        kept.set(key, value);
        setLoaded((count) => count + 1);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setFailed({ key, problem: describe(error) });
      });
    return () => controller.abort();
  }, [key, attempt]);

  const retry = () => {
    setFailed(null);
    setAttempt((count) => count + 1);
  };
  if (key === null) return { value: null, loading: false, problem: null, retry };
  if (kept.has(key)) return { value: kept.get(key) as T, loading: false, problem: null, retry };
  const problem = failed?.key === key ? failed.problem : null;
  return { value: null, loading: problem === null, problem, retry };
}

export function useSettled<T>(value: T, wait: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), wait);
    return () => window.clearTimeout(timer);
  }, [value, wait]);
  return settled;
}
