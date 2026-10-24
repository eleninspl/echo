"use client";

import { useEffect, useState } from "react";

import { echo, type Health } from "@/lib/echo";

import { Lamp } from "./hud";

const count = new Intl.NumberFormat("en-US");

// The status bar's readout: whether the engine is live, on the invented example data, or not
// answering, and today's Qloo calls with what's left of the month's quota.
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
    <dl className="flex items-center gap-x-4 sm:gap-x-6">
      <div className="flex items-center gap-2">
        <dt className="sr-only">Engine</dt>
        <Lamp color={health.mock ? "var(--ink-soft)" : "var(--ink)"} />
        <dd className="tag whitespace-nowrap" style={{ color: health.mock ? "var(--ink-soft)" : "var(--ink)" }}>
          {health.mock ? "Example" : "Live"}
          <span className="hidden sm:inline">{health.mock ? " data" : " engine"}</span>
        </dd>
      </div>
      <div className="flex items-baseline gap-2">
        <dt className="tag whitespace-nowrap text-ink-dim">
          Qloo<span className="hidden sm:inline"> today</span>
        </dt>
        <dd className="readout text-base text-fit">{count.format(health.qloo_calls_today)}</dd>
      </div>
      {health.qloo_calls_left !== null && (
        <div className="hidden items-center gap-2 md:flex">
          <dt className="tag text-ink-dim">Quota left</dt>
          <dd className="readout text-base">{count.format(health.qloo_calls_left)}</dd>
        </div>
      )}
    </dl>
  );
}
