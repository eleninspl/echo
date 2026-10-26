"use client";

import { useEffect, useState } from "react";

import { echo, type Health } from "@/lib/echo";

import { Lamp } from "./hud";

const RECHECK_MS = 60_000;
const SETTLE_MS = 5_000;

// The status bar's readout: whether the engine is live, on the invented example data, or not
// answering. Qloo calls and the quota stay in the engine's /health, for us.
export function EngineNote() {
  const [health, setHealth] = useState<Health | "offline" | null>(null);

  // Checked on load, every minute and whenever the tab comes back into view, so it follows the engine.
  useEffect(() => {
    let last = 0;
    const check = () => {
      // Focus and visibility often fire together; one check covers both.
      if (document.visibilityState === "hidden" || Date.now() - last < SETTLE_MS) return;
      last = Date.now();
      echo
        .health()
        .then(setHealth)
        .catch(() => setHealth("offline"));
    };
    check();
    const timer = window.setInterval(check, RECHECK_MS);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (health === null) return <div aria-hidden className="h-6" />;
  if (health === "offline") {
    return (
      <p className="tag flex items-center gap-2 text-alert">
        <Lamp color="var(--alert)" className="pulse size-2" />
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
