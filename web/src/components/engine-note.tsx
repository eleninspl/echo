"use client";

import { useEffect, useState } from "react";

import { echo, type Health } from "@/lib/echo";

// Says when the engine serves the invented example data, or isn't answering.
export function EngineNote() {
  const [health, setHealth] = useState<Health | "offline" | null>(null);

  useEffect(() => {
    echo
      .health()
      .then(setHealth)
      .catch(() => setHealth("offline"));
  }, []);

  if (health === null || (health !== "offline" && !health.mock)) return null;
  return (
    <p className="border border-current px-2 py-1 text-xs font-semibold tracking-wide uppercase">
      {health === "offline" ? "Engine offline" : "Example data"}
    </p>
  );
}
