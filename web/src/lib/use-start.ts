"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

import { echo, EchoError, type Filters } from "./echo";

// Starts an analysis and opens its page. `pending` is the show being started.
export function useStart() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<EchoError | null>(null);

  // Next keeps the page alive with React's Activity once it opens the analysis, so Back would bring the
  // show back still "Opening…". Hiding the page clears it.
  useLayoutEffect(() => () => setPending(null), []);

  async function start(showId: string, filters?: Partial<Filters>) {
    setPending(showId);
    setError(null);
    try {
      const { id } = await echo.startAnalysis(showId, filters);
      router.push(`/analyses/${encodeURIComponent(id)}`);
    } catch (caught) {
      setPending(null);
      setError(caught instanceof EchoError ? caught : new EchoError(0, "unknown", "Try again in a minute."));
    }
  }

  return { start, pending, error };
}
