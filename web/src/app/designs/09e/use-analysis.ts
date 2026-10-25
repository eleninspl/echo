"use client";

import { useEffect, useState } from "react";

import { echo, type Analysis } from "@/lib/echo";

const loaded = new Map<string, Promise<Analysis>>();

function load(id: string) {
  let request = loaded.get(id);
  if (!request) {
    request = echo.analysis(id);
    loaded.set(id, request);
    request.catch(() => loaded.delete(id));
  }
  return request;
}

export type Loaded = { id: string; analysis: Analysis | null };

export function useAnalysis(id: string | null) {
  const [result, setResult] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    load(id)
      .then((analysis) => live && setResult({ id, analysis }))
      .catch(() => live && setResult({ id, analysis: null }));
    return () => {
      live = false;
    };
  }, [id]);

  const settled = result !== null && result.id === id;
  return { analysis: settled ? result.analysis : null, settled };
}
