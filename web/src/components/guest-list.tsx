import Image from "next/image";
import { useState, type CSSProperties } from "react";

import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { Chip, hue, Info, LABEL_HUE, Meter, out100, rank, SCORE_HUE, ZoneHead } from "./hud";

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
export function lockLine(guests: Guest[]): string {
  const sweet = guests.filter((guest) => guest.label === "sweet_spot");
  if (!sweet.length) return "No guest clears all three yet. These come closest.";
  const unscored = sweet.filter((guest) => guest.scores.reach === null).length;
  const n = count(sweet.length);
  if (!unscored) return `${n} ${sweet.length === 1 ? "guest clears" : "guests clear"} fit, love back and reach.`;
  if (unscored === sweet.length)
    return `${n} sweet ${sweet.length === 1 ? "spot" : "spots"} on fit and love back; too little data for reach.`;
  return `${n} sweet spots. For ${count(unscored).toLowerCase()}, too little data to score reach.`;
}

// Every guest, best Echo score first: rank, portrait, name, label, the three scores as bars and the Echo
// score. A row selects its guest; the scope above and the dossier beside follow it.
export function GuestList({ guests, selected, highlighted, picked, onSelect, onHighlight }: Props) {
  return (
    <section aria-labelledby="guests" className="zone">
      <ZoneHead id="guests" title="Guests, ranked">
        <span className="hidden items-center gap-3 sm:flex">
          <span className="text-fit">Fit</span>
          <span className="text-love">Love back</span>
          <span className="text-reach">Reach</span>
        </span>
        <Info>
          Ranked by the Echo score, which weighs fit, love back and reach together. Each score is out of 100, ranked
          within these guests. The top 10 come with an episode idea and evidence.
        </Info>
      </ZoneHead>
      <ol className="flex flex-col py-1">
        {guests.map((guest, index) => (
          <Row
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

function Row({
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
  const color = LABEL_HUE[guest.label];
  const sweet = guest.label === "sweet_spot";
  const { fit, love_back, reach } = guest.scores;
  return (
    <li className="acquire" style={{ "--order": index } as CSSProperties}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        onPointerEnter={() => onHighlight(guest.ref)}
        onPointerLeave={() => onHighlight(null)}
        onFocus={() => onHighlight(guest.ref)}
        onBlur={() => onHighlight(null)}
        className={`group relative grid w-full grid-cols-[1.75rem_2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2 text-left transition-colors md:grid-cols-[1.75rem_2.75rem_minmax(0,1fr)_6.5rem_minmax(0,13rem)_2.75rem] ${
          selected ? "bg-deck-hi" : lit ? "bg-deck-hi/60" : "hover:bg-deck-hi/60"
        }`}
        style={hue(color)}
      >
        {/* The selection: a lit edge and brackets in the guest's label hue. */}
        {selected && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-0.5"
            style={{ background: color }}
          />
        )}
        <span className={`readout text-sm ${selected ? "text-ink" : "text-ink-dim"}`}>{rank(index)}</span>
        <span
          className="screen relative size-11 overflow-hidden"
          style={{ boxShadow: `inset 0 0 0 1px ${sweet ? color : "var(--steel)"}` }}
        >
          <Picture guest={guest} sizes="44px" small />
          {picked && (
            <span aria-hidden className="absolute right-0 bottom-0 flex size-4 items-center justify-center bg-ink">
              <svg viewBox="0 0 10 10" className="size-2.5 text-on-hue">
                <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-base leading-tight font-semibold group-hover:text-white">
            {guest.name}
          </span>
          {guest.description && <span className="block truncate text-xs text-ink-dim">{guest.description}</span>}
        </span>
        <span className="justify-self-end md:justify-self-start">
          <Chip color={color}>{LABELS[guest.label].name}</Chip>
        </span>
        <span aria-hidden className="col-[3/-1] grid grid-cols-3 gap-2 md:col-auto">
          <Score value={fit} color={SCORE_HUE.fit} order={index} />
          <Score value={love_back} color={SCORE_HUE.love_back} order={index} />
          <Score value={reach} color={SCORE_HUE.reach} order={index} />
        </span>
        <span className="readout hidden text-right text-xl md:block">{out100(guest.scores.echo)}</span>
        <span className="sr-only">
          , {LABELS[guest.label].name}: fit {out100(fit)}, love back {out100(love_back)}, reach{" "}
          {reach === null ? "not scored" : out100(reach)}, Echo score {out100(guest.scores.echo)}
          {picked ? ", picked to invite" : ""}
        </span>
      </button>
    </li>
  );
}

// One score: its figure over a short segmented bar. No reach score is a dashed line.
function Score({ value, color, order }: { value: number | null; color: string; order: number }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="readout text-xs" style={{ color }}>
        {out100(value)}
      </span>
      {value === null ? (
        <span className="h-1.5 border-t border-dashed border-steel-hi" />
      ) : (
        <Meter value={value} color={color} segments={12} order={order} className="h-1.5" />
      )}
    </span>
  );
}

// The guest's picture from Qloo, or their initials on a dark screen tinted with the label's hue when there's
// none or it doesn't load.
export function Picture({ guest, sizes, small = false }: { guest: Guest; sizes: string; small?: boolean }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (guest.image_url && broken !== guest.image_url) {
    const url = guest.image_url;
    return (
      <Image
        src={url}
        onError={() => setBroken(url)}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className="object-cover object-top opacity-90 grayscale-[35%] transition group-hover:opacity-100 group-hover:grayscale-0"
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
        className="absolute inset-x-0 bottom-0 h-2/3 opacity-20"
        style={{ background: "linear-gradient(to top, var(--hue), transparent)" }}
      />
      <span className={`font-display font-semibold tracking-wider text-ink-soft ${small ? "text-sm" : "text-5xl"}`}>
        {initials}
      </span>
    </span>
  );
}
