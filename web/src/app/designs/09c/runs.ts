"use client";

import { useEffect, useState } from "react";

import { echo, type Analysis } from "@/lib/echo";

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

export function useAnalysis(id: string | null) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    load(id)
      .then((result) => live && setAnalysis(result))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);
  return id ? analysis : null;
}
