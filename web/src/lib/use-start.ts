"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { echo, EchoError, type Filters } from "./echo";

// Starts an analysis and opens its page. `pending` is the show being started.
export function useStart() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<EchoError | null>(null);

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
