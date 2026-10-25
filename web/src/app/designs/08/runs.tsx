"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured } from "@/lib/echo";

type Loaded = Analysis | "failed";

type Runs = { featured: Featured[] | null; analyses: Record<string, Loaded> };

export type Lead =
  | { state: "loading" }
  | { state: "none" }
  | { state: "ready"; item: Featured; analysis: Analysis };

const RunsContext = createContext<Runs>({ featured: null, analyses: {} });

export function RunsProvider({ children }: { children: ReactNode }) {
  const featured = useFeatured();
  const [analyses, setAnalyses] = useState<Record<string, Loaded>>({});

  useEffect(() => {
    if (!featured?.length) return;
    const controller = new AbortController();
    for (const { analysis_id } of featured) {
      echo
        .analysis(analysis_id, controller.signal)
        .then((analysis) =>
          setAnalyses((current) => ({
            ...current,
            [analysis_id]: analysis.status === "done" && analysis.guests.length ? analysis : "failed",
          })),
        )
        .catch(() => {
          if (!controller.signal.aborted) setAnalyses((current) => ({ ...current, [analysis_id]: "failed" }));
        });
    }
    return () => controller.abort();
  }, [featured]);

  return <RunsContext value={{ featured, analyses }}>{children}</RunsContext>;
}

export function useRuns(): Runs {
  return useContext(RunsContext);
}

export function useAnalysis(analysisId: string): Analysis | "failed" | null {
  return useRuns().analyses[analysisId] ?? null;
}

export function useLead(): Lead {
  const { featured, analyses } = useRuns();
  if (featured === null) return { state: "loading" };
  for (const item of featured) {
    const loaded = analyses[item.analysis_id];
    if (loaded === undefined) return { state: "loading" };
    if (loaded !== "failed") return { state: "ready", item, analysis: loaded };
  }
  return { state: "none" };
}
