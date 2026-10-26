"use client";

import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";
import { labelMeans, LABELS } from "@/lib/format";

import { PickButton, Scores, TasteChips } from "./dossier";
import { Picture } from "./guest-list";
import { Chip, LABEL_HUE, rank, SectionHead } from "./hud";

// How many sweet spots to lead with; the rest are in the ranked list.
const MOST = 4;
// How many guests come closest when there's no sweet spot.
const CLOSEST = 3;

type Props = {
  guests: Guest[];
  // Whether this run came with episode ideas.
  ideas: boolean;
  picked: string[];
  onPick: (guestRef: string) => void;
  onOpen: (guestRef: string) => void;
};

// The sweet spots, best Echo score first; with none, the guests that come closest, so the labels on this
// section always agree with its title.
export function TopPicks({ guests, ideas, picked, onPick, onOpen }: Props) {
  const sweet = guests.filter((guest) => guest.label === "sweet_spot");
  const top = sweet.length ? sweet.slice(0, MOST) : guests.slice(0, CLOSEST);
  const more = sweet.length - top.length;
  return (
    <section aria-labelledby="top-picks" className="flex flex-col gap-6">
      <SectionHead id="top-picks" title={sweet.length ? "Start with these" : "No sweet spot yet, these come closest"}>
        {more > 0 && <span>{more} more in the list</span>}
      </SectionHead>
      {!ideas && (
        <p className="-mt-3 text-sm text-ink-dim">
          Episode ideas are off in this demo. The scores and evidence are all here.
        </p>
      )}
      <ol
        className={`grid grid-cols-1 gap-x-10 gap-y-12 ${top.length === 4 ? "@3xl:grid-cols-2 @6xl:grid-cols-4" : top.length === 2 ? "@3xl:grid-cols-2" : "@4xl:grid-cols-3"}`}
      >
        {top.map((guest, order) => {
          const color = LABEL_HUE[guest.label];
          return (
            <li
              key={guest.ref}
              className="rise flex flex-col gap-5 border-t border-steel pt-6"
              style={{ "--order": order * 3 } as CSSProperties}
            >
              <button
                type="button"
                onClick={() => onOpen(guest.ref)}
                className="group flex items-center gap-4 text-left"
              >
                <span
                  className="relative size-20 shrink-0 overflow-hidden rounded-full bg-well"
                  style={{
                    boxShadow:
                      guest.label === "sweet_spot"
                        ? `0 0 0 2px var(--void), 0 0 0 3.5px ${color}`
                        : "inset 0 0 0 1px var(--steel)",
                  }}
                >
                  <Picture guest={guest} sizes="80px" small />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2.5">
                    <span className="readout text-sm text-ink-dim">{rank(guests.indexOf(guest))}</span>
                    <Chip color={color}>{LABELS[guest.label].name}</Chip>
                  </span>
                  <span className="mt-1 block font-display text-2xl leading-tight font-semibold text-balance decoration-1 underline-offset-4 group-hover:underline">
                    {guest.name}
                  </span>
                  {guest.description && (
                    <span className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{guest.description}</span>
                  )}
                </span>
              </button>
              <Scores scores={guest.scores} bars={48} height={30} readout="text-xl" />
              {guest.evidence?.shared_tastes.length ? (
                <div className="flex flex-col gap-2">
                  <p className="tag text-ink-dim">Both audiences love</p>
                  <TasteChips names={guest.evidence.shared_tastes.slice(0, 3)} color="var(--fit)" />
                </div>
              ) : (
                <p className="text-sm text-ink-soft">{labelMeans(guest.label, guest.scores.reach === null)}</p>
              )}
              {guest.idea && (
                <div className="flex flex-col gap-1">
                  <p className="tag text-ink-dim">
                    Episode idea
                    {guest.idea.rewritten && <span className="text-accent"> · Rewritten by Echo</span>}
                  </p>
                  <p className="font-display text-lg leading-snug font-semibold text-balance">{guest.idea.title}</p>
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <PickButton
                  guestName={guest.name}
                  picked={picked.includes(guest.ref)}
                  onPick={() => onPick(guest.ref)}
                />
                <button type="button" onClick={() => onOpen(guest.ref)} className="btn">
                  See why
                  <span className="sr-only"> {guest.name}</span>
                  <svg aria-hidden viewBox="0 0 12 12" className="size-3">
                    <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
