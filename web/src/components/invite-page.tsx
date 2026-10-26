"use client";

import Link from "next/link";

import { analysisPath } from "@/lib/paths";

import { useOpenAnalysis } from "./analysis-view";
import { FRAME } from "./hud";
import { Invite } from "./invite";

export function InvitePage() {
  const { analysis, picked, onPick } = useOpenAnalysis();
  return (
    <div className={`${FRAME} flex flex-1 flex-col gap-10 pt-8 pb-28`}>
      <title>{`Invitations · ${analysis.show.title} · Echo`}</title>
      <Link
        href={analysisPath(analysis.id)}
        className="group flex min-w-0 items-center gap-3 self-start rounded-full py-1 pr-2"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-deck shadow-[inset_0_0_0_1px_var(--steel)] transition-colors group-hover:bg-deck-hi">
          <svg aria-hidden viewBox="0 0 12 12" className="size-3">
            <path d="M10 6H2M5.5 2.5L2 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-[0.9375rem] font-semibold">Back to guests</span>
          <span className="truncate text-xs text-ink-dim">{analysis.show.title}</span>
        </span>
      </Link>
      <Invite analysis={analysis} picked={picked} onToggle={onPick} />
    </div>
  );
}
