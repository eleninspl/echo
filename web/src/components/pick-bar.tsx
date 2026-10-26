"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { Analysis, Guest } from "@/lib/echo";
import { invitePath } from "@/lib/paths";

import { Picture } from "./guest-list";
import { LABEL_HUE, SHEET_ROOM } from "./hud";
import { MAX_PICKS } from "./invite";

export function PickBar({ analysis, picked, beside }: { analysis: Analysis; picked: string[]; beside: boolean }) {
  const guests = picked
    .map((ref) => analysis.guests.find((guest) => guest.ref === ref))
    .filter((guest): guest is Guest => guest !== undefined);
  const shown = guests.length > 0;
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center pr-[4.75rem] pl-3 transition-[padding] duration-500 ease-(--ease-out) sm:bottom-5 sm:px-4 ${beside ? SHEET_ROOM : ""}`}
    >
      <div
        inert={!shown}
        className={`flex max-w-full items-center gap-3 rounded-full bg-deck py-1.5 pr-1.5 pl-2 shadow-pop ring-1 ring-steel transition-[translate,opacity] duration-500 ease-(--ease-out) motion-reduce:transition-none sm:gap-4 ${
          shown ? "pointer-events-auto translate-y-0 opacity-100" : "translate-y-[160%] opacity-0"
        }`}
      >
        <ol aria-label="Picked to invite" className="flex shrink-0 -space-x-3">
          {guests.map((guest, index) => (
            <li
              key={guest.ref}
              title={guest.name}
              className="rise relative size-10 overflow-hidden rounded-full bg-well sm:size-11"
              style={
                {
                  boxShadow: `0 0 0 2px var(--deck), 0 0 0 3.5px ${LABEL_HUE[guest.label]}`,
                  zIndex: guests.length - index,
                } as CSSProperties
              }
            >
              <Picture guest={guest} sizes="44px" small />
              <span className="sr-only">{guest.name}</span>
            </li>
          ))}
        </ol>
        <p aria-live="polite" className="hidden shrink-0 text-sm leading-tight text-ink-soft min-[420px]:block">
          <span key={guests.length} className="rise readout inline-block text-base text-ink">
            {guests.length}
          </span>{" "}
          picked
          <span className="block text-xs text-ink-dim">up to {MAX_PICKS}</span>
        </p>
        <Link href={invitePath(analysis.id)} className="btn btn-brand min-h-12 shrink-0 px-5 text-base sm:px-6">
          Write invitations
          <svg aria-hidden viewBox="0 0 12 12" className="size-3.5">
            <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
