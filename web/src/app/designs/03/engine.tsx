"use client";

import { useEffect, useState } from "react";

import { echo, type Health } from "@/lib/echo";

import { s } from "./styles";
import { Led } from "./parts";

const count = new Intl.NumberFormat("en-US");

export function EngineLamp() {
  const [health, setHealth] = useState<Health | "offline" | null>(null);

  useEffect(() => {
    echo
      .health()
      .then(setHealth)
      .catch(() => setHealth("offline"));
  }, []);

  const live = health !== null && health !== "offline";
  const state = health === null ? "Engine" : health === "offline" ? "Engine offline" : health.mock ? "Example data" : "Live engine";

  return (
    <dl className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <dt className="sr-only">Engine</dt>
        <Led on={live} className={health === "offline" ? `${s.blink} size-2` : "size-2"} />
        <dd className={`${s.label} text-[0.6875rem] whitespace-nowrap`}>{state}</dd>
      </div>
      {live && (
        <div className="hidden items-center gap-2 sm:flex">
          <dt className={`${s.label} text-[0.6875rem] whitespace-nowrap text-(--print-soft)`}>Qloo calls today</dt>
          <dd
            className={`${s.screen} ${s.mono} min-w-11 rounded-[5px] px-2 py-1.5 text-right text-xs leading-none font-bold text-(--lcd)`}
          >
            {count.format(health.qloo_calls_today)}
          </dd>
        </div>
      )}
    </dl>
  );
}
