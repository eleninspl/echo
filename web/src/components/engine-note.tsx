"use client";

import { useEffect, useState } from "react";

import { echo, type Health } from "@/lib/echo";

import { Lamp } from "./gallery";

const count = new Intl.NumberFormat("en-US");

// The gallery bar's status: whether the engine is live, on the invented example data, or not
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
      <p className="silk flex items-center gap-2 text-amber">
        <Lamp color="var(--amber)" on={false} />
        Engine offline
      </p>
    );
  }
  return (
    <dl className="flex items-center gap-x-3 gap-y-1 sm:gap-x-5">
      <div className="flex items-center gap-2">
        <dt className="sr-only">Engine</dt>
        <Lamp color={health.mock ? "var(--amber)" : "var(--pvw)"} />
        <dd className={`silk whitespace-nowrap ${health.mock ? "text-amber" : "text-pvw"}`}>
          {health.mock ? "Example" : "Live"}
          <span className="hidden sm:inline">{health.mock ? " data" : " engine"}</span>
        </dd>
      </div>
      <div className="flex items-baseline gap-2">
        <dt className="silk whitespace-nowrap text-ink-dim">
          Qloo<span className="hidden sm:inline"> today</span>
        </dt>
        <dd className="font-cond text-base leading-none font-bold">{count.format(health.qloo_calls_today)}</dd>
      </div>
      {health.qloo_calls_left !== null && (
        <div className="hidden items-baseline gap-2 md:flex">
          <dt className="silk text-ink-dim">Quota left</dt>
          <dd className="font-cond text-base leading-none font-bold">{count.format(health.qloo_calls_left)}</dd>
        </div>
      )}
    </dl>
  );
}
