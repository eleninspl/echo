"use client";

import { useEffect, useState } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";

const requests = new Map<string, Promise<Analysis>>();

function load(id: string) {
  let request = requests.get(id);
  if (!request) {
    request = echo.analysis(id);
    request.catch(() => requests.delete(id));
    requests.set(id, request);
  }
  return request;
}

export type Loaded = { id: string; analysis: Analysis | null; failed: boolean };

export function useAnalysis(id: string | null): Loaded | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    load(id)
      .then((analysis) => live && setLoaded({ id, analysis, failed: false }))
      .catch(() => live && setLoaded({ id, analysis: null, failed: true }));
    return () => {
      live = false;
    };
  }, [id]);
  return loaded && loaded.id === id ? loaded : null;
}

export function finishedGuests(loaded: Loaded | null): Guest[] {
  return loaded?.analysis?.status === "done" ? loaded.analysis.guests : [];
}

export { useFeatured };
export type { Featured };
