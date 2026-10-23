import type { ReactNode } from "react";

import type { HostError } from "@/lib/errors";

// An error for the host: what happened, the engine's message, and what to do next.
export function Problem({ problem, children }: { problem: HostError; children?: ReactNode }) {
  return (
    <div role="alert" className="flex max-w-2xl flex-col gap-3">
      <h2 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">{problem.title}</h2>
      <p className="text-lg">{problem.message}</p>
      {children}
    </div>
  );
}
