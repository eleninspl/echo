import Image from "next/image";
import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { channel, hue, LABEL_HUE, Meter, out100, PanelHead, SCORE_HUE } from "./gallery";

type Props = {
  guests: Guest[];
  selected: string | null;
  highlighted: string | null;
  picked: string[];
  onSelect: (guestRef: string) => void;
  onHighlight: (guestRef: string | null) => void;
};

const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const count = (n: number) => COUNT[n] ?? String(n);

// A sweet spot without a reach score is judged on fit and love back alone (docs/qloo.md, Scoring),
// so the line only claims all three for the ones that have them.
export function onAirLine(guests: Guest[]): string {
  const sweet = guests.filter((guest) => guest.label === "sweet_spot");
  if (!sweet.length) return "No guest clears all three yet. These come closest.";
  const unscored = sweet.filter((guest) => guest.scores.reach === null).length;
  const n = count(sweet.length);
  if (!unscored) return `${n} ${sweet.length === 1 ? "guest clears" : "guests clear"} fit, love back and reach.`;
  if (unscored === sweet.length)
    return `${n} sweet ${sweet.length === 1 ? "spot" : "spots"} on fit and love back; too little data for reach.`;
  return `${n} sweet spots. For ${count(unscored).toLowerCase()}, too little data to score reach.`;
}

// The multiviewer: every guest on a monitor, ranked, with the label's tally and three thin meters
// under the name. A monitor selects its guest.
export function Wall({ guests, selected, highlighted, picked, onSelect, onHighlight }: Props) {
  return (
    <section aria-labelledby="wall" className="panel rounded-[4px]">
      <PanelHead id="wall" title="Multiviewer">
        <span>{guests.length} sources</span>
      </PanelHead>
      <ol className="grid snap-x scroll-px-2 auto-cols-[46%] grid-flow-col gap-2 overflow-x-auto p-2 [scrollbar-width:thin] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 xl:grid-cols-5">
        {guests.map((guest, index) => (
          <Tile
            key={guest.ref}
            guest={guest}
            index={index}
            selected={guest.ref === selected}
            lit={guest.ref === highlighted}
            picked={picked.includes(guest.ref)}
            onSelect={() => onSelect(guest.ref)}
            onHighlight={onHighlight}
          />
        ))}
      </ol>
    </section>
  );
}

function Tile({
  guest,
  index,
  selected,
  lit,
  picked,
  onSelect,
  onHighlight,
}: {
  guest: Guest;
  index: number;
  selected: boolean;
  lit: boolean;
  picked: boolean;
  onSelect: () => void;
  onHighlight: (guestRef: string | null) => void;
}) {
  const sweet = guest.label === "sweet_spot";
  const { fit, love_back, reach } = guest.scores;
  const ring = selected
    ? "shadow-[0_0_0_2px_var(--ink)]"
    : sweet
      ? "shadow-[0_0_0_2px_var(--tally),0_0_22px_-4px_var(--tally)]"
      : lit
        ? "shadow-[0_0_0_1px_var(--ink-soft)]"
        : "shadow-[0_0_0_1px_var(--line)]";
  return (
    <li className="power snap-start" style={{ "--order": index } as CSSProperties}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        onPointerEnter={() => onHighlight(guest.ref)}
        onPointerLeave={() => onHighlight(null)}
        onFocus={() => onHighlight(guest.ref)}
        onBlur={() => onHighlight(null)}
        className={`group flex w-full flex-col overflow-hidden rounded-[3px] bg-monitor text-left transition-shadow ${ring}`}
      >
        <span className="monitor relative block aspect-video w-full overflow-hidden">
          <Picture guest={guest} />
          <span className="absolute top-1.5 left-1.5 silk rounded-[2px] bg-monitor/80 px-1.5 py-1 text-[0.5625rem] text-ink-soft">
            {channel(index)}
          </span>
          {sweet && (
            <span className="absolute top-1.5 right-1.5 silk rounded-[2px] bg-tally px-1.5 py-1 text-[0.5625rem] text-on-light">
              On air
            </span>
          )}
          {picked && (
            <span
              className={`absolute right-1.5 silk rounded-[2px] bg-pvw px-1.5 py-1 text-[0.5625rem] text-on-light ${sweet ? "top-7" : "top-1.5"}`}
            >
              Invite
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 border-t border-line bg-panel px-2 pt-1.5">
          <span aria-hidden className="h-3 w-1 shrink-0 rounded-[1px]" style={{ background: LABEL_HUE[guest.label] }} />
          <span className="min-w-0 flex-1 truncate font-cond text-[0.9375rem] font-semibold tracking-wide uppercase group-hover:text-white">
            {guest.name}
          </span>
          <span className="font-cond text-[0.9375rem] font-semibold text-ink-soft">{out100(guest.scores.echo)}</span>
        </span>
        <span aria-hidden className="flex flex-col gap-[3px] bg-panel px-2 pt-1.5 pb-2">
          <Meter value={fit} color={SCORE_HUE.fit} segments={30} order={index} className="h-1" />
          <Meter value={love_back} color={SCORE_HUE.love_back} segments={30} order={index} className="h-1" />
          {reach === null ? (
            <span className="h-1 border-t border-dashed border-line" />
          ) : (
            <Meter value={reach} color={SCORE_HUE.reach} segments={30} order={index} className="h-1" />
          )}
        </span>
        <span className="sr-only">
          , {LABELS[guest.label].name}, Echo score {out100(guest.scores.echo)}
          {picked ? ", picked to invite" : ""}
        </span>
      </button>
    </li>
  );
}

// The guest's picture from Qloo, or their initials on a dark screen with the label's colour bar.
export function Picture({ guest, sizes = "(min-width: 1280px) 15vw, 45vw" }: { guest: Guest; sizes?: string }) {
  if (guest.image_url) {
    return (
      <Image
        src={guest.image_url}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className="object-cover object-top opacity-90 transition-opacity group-hover:opacity-100"
      />
    );
  }
  const initials = guest.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center" style={hue(LABEL_HUE[guest.label])}>
      <span
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-[0.14]"
        style={{ background: "linear-gradient(to top, var(--hue), transparent)" }}
      />
      <span className="font-cond text-[clamp(1.5rem,4vw,2.75rem)] font-medium tracking-wider text-ink-soft">
        {initials}
      </span>
    </span>
  );
}
