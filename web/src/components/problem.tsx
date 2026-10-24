import type { ReactNode } from "react";

import type { HostError } from "@/lib/errors";

import { ZoneHead } from "./hud";

// An error for the host: what happened, the engine's message, and what to do next. A "not built yet"
// part is a notice, not an alert, so it isn't drawn in red.
export function Problem({ problem, children }: { problem: HostError; children?: ReactNode }) {
  const color = problem.code === "not_implemented" ? "var(--ink-soft)" : "var(--alert)";
  return (
    <div role="alert" className="zone flex flex-col">
      <ZoneHead title={problem.code === "not_implemented" ? "Notice" : "Alert"} />
      <div className="flex max-w-2xl flex-col gap-3 p-5">
        <h2 className="font-display text-3xl leading-none font-semibold" style={{ color }}>
          {problem.title}
        </h2>
        <p className="text-ink-soft">{problem.message}</p>
        {children}
      </div>
    </div>
  );
}
