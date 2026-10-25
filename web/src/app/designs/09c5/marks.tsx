import type { ReactNode } from "react";

import { TONE, type Part } from "./palette";

export function Swatch({ part, shape = "bar" }: { part: Part; shape?: "bar" | "line" }) {
  return (
    <span
      aria-hidden
      className={`mr-1 inline-block align-[-0.05em] ${shape === "bar" ? "h-[0.8em] w-[3px]" : "h-[3px] w-[0.9em] align-[0.22em]"}`}
      style={{ background: TONE[part] }}
    />
  );
}

export function Marker({ number, className = "" }: { number: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`w5-numbers inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-(--w5-ink) text-[11px] font-bold text-(--w5-ground) ${className}`}
    >
      {number}
    </span>
  );
}

export function Keyed({ part, children }: { part: Part; children: ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      <Swatch part={part} />
      {children}
    </span>
  );
}
