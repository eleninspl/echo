import { useEffect, useState } from "react";

import { echo, type Analysis, type Guest } from "@/lib/echo";

const analyses = new Map<string, Promise<Analysis>>();

function loadAnalysis(id: string) {
  const known = analyses.get(id);
  if (known) return known;
  const loading = echo.analysis(id);
  analyses.set(id, loading);
  loading.catch(() => analyses.delete(id));
  return loading;
}

export type Loaded = { state: "loading" } | { state: "ready"; analysis: Analysis } | { state: "failed" };

const LOADING: Loaded = { state: "loading" };

export function useAnalysis(id: string | undefined): Loaded {
  const [loaded, setLoaded] = useState<{ id: string; result: Loaded } | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    loadAnalysis(id).then(
      (analysis) => live && setLoaded({ id, result: { state: "ready", analysis } }),
      () => live && setLoaded({ id, result: { state: "failed" } }),
    );
    return () => {
      live = false;
    };
  }, [id]);

  return id && loaded?.id === id ? loaded.result : LOADING;
}

export function guestsOf(loaded: Loaded): Guest[] {
  return loaded.state === "ready" && loaded.analysis.status === "done" ? loaded.analysis.guests : [];
}

export function sweetSpots(guests: Guest[]) {
  return guests.filter((guest) => guest.label === "sweet_spot").length;
}
