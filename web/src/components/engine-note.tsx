"use client";

import { useEffect, useState } from "react";

import { echo, type Health } from "@/lib/echo";

import { Lamp } from "./hud";

// The status bar's readout: whether the engine is live, on the invented example data, or not
// answering. Qloo calls and the quota stay in the engine's /health, for us.
export function EngineNote() {
  const [health, setHealth] = useState<Health | "offline" | null>(null);

  useEffect(() => {
    echo
      .health()
      .then(setHealth)
      .catch(() => setHealth("offline"));
  }, []);

  if (health === null) return <div aria-hidden className="h-6" />;
  if (health === "offline") {
    return (
      <p className="tag flex items-center gap-2 text-alert">
        <Lamp color="var(--alert)" className="blink size-2" />
        Engine offline
      </p>
    );
  }
  return (
    <p
      className="tag flex items-center gap-2 whitespace-nowrap"
      style={{ color: health.mock ? "var(--ink-soft)" : "var(--ink)" }}
    >
      <Lamp color={health.mock ? "var(--ink-soft)" : "var(--ink)"} />
      {health.mock ? "Example" : "Live"}
      <span className="hidden sm:inline">{health.mock ? " data" : " engine"}</span>
    </p>
  );
}
