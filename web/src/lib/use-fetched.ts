"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { describe, type HostError } from "./errors";

const kept = new Map<string, unknown>();
// Loads under way, so a component asking for a key that's being fetched ahead joins that load.
const pending = new Map<string, Promise<unknown>>();

// Whether a key's value is already here, for a view that can skip its wait when it is.
export const isKept = (key: string) => kept.has(key);

// Fetches a key into the cache before anything asks for it; a key already here or on its way is left alone.
export function prefetch<T>(key: string, load: () => Promise<T>): Promise<void> {
  if (kept.has(key)) return Promise.resolve();
  let loading = pending.get(key);
  if (!loading) {
    loading = load()
      .then((value) => {
        kept.set(key, value);
        return value;
      })
      .finally(() => pending.delete(key));
    pending.set(key, loading);
  }
  return loading.then(
    () => undefined,
    () => undefined,
  );
}

export type Fetched<T> = { value: T | null; loading: boolean; problem: HostError | null; retry: () => void };

export function useFetched<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): Fetched<T> {
  const [failed, setFailed] = useState<{ key: string; problem: HostError } | null>(null);
  const [, setLoaded] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const fetchNow = useEffectEvent((signal: AbortSignal) => load(signal));

  useEffect(() => {
    if (key === null || kept.has(key)) return;
    const controller = new AbortController();
    const ahead = pending.get(key);
    (ahead ?? fetchNow(controller.signal))
      .then((value) => {
        if (controller.signal.aborted) return;
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
