import type { ReactNode } from "react";

import type { HostError } from "@/lib/errors";

import { Lamp, PanelHead } from "./gallery";

// An error for the host: what happened, the engine's message, and what to do next.
export function Problem({ problem, children }: { problem: HostError; children?: ReactNode }) {
  return (
    <div role="alert" className="panel flex flex-col rounded-[4px]">
      <PanelHead title="Fault">
        <Lamp color="var(--amber)" className="cue h-2.5 w-4" />
      </PanelHead>
      <div className="flex max-w-2xl flex-col gap-3 p-4">
        <h2 className="font-cond text-3xl leading-none font-semibold text-amber">{problem.title}</h2>
        <p className="text-ink-soft">{problem.message}</p>
        {children}
      </div>
    </div>
  );
}
