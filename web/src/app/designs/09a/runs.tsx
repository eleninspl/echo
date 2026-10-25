"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured } from "@/lib/echo";

type Loaded = Analysis | "failed";

type Runs = { featured: Featured[] | null; analyses: Record<string, Loaded> };

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
        .then((analysis) => {
          if (controller.signal.aborted) return;
          setAnalyses((loaded) => ({ ...loaded, [analysis_id]: analysis ?? "failed" }));
        })
        .catch(() => {
          if (!controller.signal.aborted) setAnalyses((loaded) => ({ ...loaded, [analysis_id]: "failed" }));
        });
    }
    return () => controller.abort();
  }, [featured]);

  return <RunsContext value={{ featured, analyses }}>{children}</RunsContext>;
}

export function useRuns() {
  return useContext(RunsContext);
}

export function useRun(id: string | undefined) {
  const { analyses } = useRuns();
  const loaded = id ? analyses[id] : undefined;
  if (loaded === undefined) return { state: "loading" } as const;
  if (loaded === "failed" || loaded.status !== "done") return { state: "missing" } as const;
  return { state: "done", analysis: loaded } as const;
}
