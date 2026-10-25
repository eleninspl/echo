"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";

type Loaded = Analysis | "failed";

type Deck = {
  featured: Featured[] | null;
  loaded: number;
  load: (index: number) => void;
  current: Featured | null;
  analyses: Record<string, Loaded>;
  guests: Guest[] | null;
  selected: number;
  select: (index: number) => void;
};

const DeckContext = createContext<Deck | null>(null);

const SHELF_LIMIT = 6;

export function DeckProvider({ children }: { children: ReactNode }) {
  const featured = useFeatured();
  const [loaded, setLoaded] = useState(0);
  const [selected, setSelected] = useState(0);
  const [analyses, setAnalyses] = useState<Record<string, Loaded>>({});

  useEffect(() => {
    if (!featured?.length) return;
    const controller = new AbortController();
    for (const { analysis_id } of featured.slice(0, SHELF_LIMIT)) {
      echo
        .analysis(analysis_id, controller.signal)
        .then((analysis) => {
          if (controller.signal.aborted || !analysis) return;
          setAnalyses((known) => ({ ...known, [analysis_id]: analysis }));
        })
        .catch(() => {
          if (!controller.signal.aborted) setAnalyses((known) => ({ ...known, [analysis_id]: "failed" }));
        });
    }
    return () => controller.abort();
  }, [featured]);

  const shelf = featured?.slice(0, SHELF_LIMIT) ?? null;
  const current = shelf?.[loaded] ?? null;
  const analysis = current ? analyses[current.analysis_id] : undefined;
  const guests =
    analysis && analysis !== "failed" && analysis.status === "done" && analysis.guests.length ? analysis.guests : null;

  const value: Deck = {
    featured: shelf,
    loaded,
    load: (index) => {
      setLoaded(index);
      setSelected(0);
    },
    current,
    analyses,
    guests,
    selected: guests ? Math.min(selected, guests.length - 1) : 0,
    select: (index) => setSelected(Math.max(0, index)),
  };

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck() {
  const deck = useContext(DeckContext);
  if (!deck) throw new Error("useDeck needs a DeckProvider");
  return deck;
}

export function analysisState(deck: Deck, analysisId: string) {
  const analysis = deck.analyses[analysisId];
  if (!analysis) return "loading" as const;
  if (analysis === "failed" || analysis.status === "failed") return "failed" as const;
  if (analysis.status === "running") return "running" as const;
  return "done" as const;
}
