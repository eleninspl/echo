"use client";

import { useEffect, useState } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";

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

type Loaded = { id: string; analysis: Analysis | null; failed: boolean };

export function useAnalysis(id: string | null) {
  const [result, setResult] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    load(id)
      .then((analysis) => live && setResult({ id, analysis, failed: false }))
      .catch(() => live && setResult({ id, analysis: null, failed: true }));
    return () => {
      live = false;
    };
  }, [id]);
  if (!id || result?.id !== id) return { analysis: null, failed: false };
  return { analysis: result.analysis, failed: result.failed };
}

export type Run =
  | { state: "loading" }
  | { state: "empty" }
  | { state: "ready"; item: Featured; analysis: Analysis; guests: Guest[] };

export function useLeadRun(): Run {
  const featured = useFeatured();
  const item = featured?.[0] ?? null;
  const { analysis, failed } = useAnalysis(item?.analysis_id ?? null);
  if (featured === null) return { state: "loading" };
  if (!item || failed) return { state: "empty" };
  if (!analysis) return { state: "loading" };
  if (analysis.status !== "done" || analysis.guests.length === 0)
    return { state: "empty" };
  return { state: "ready", item, analysis, guests: analysis.guests };
}

export function useWidth() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width] as const;
}
