import Image from "next/image";
import { useState, type CSSProperties } from "react";

import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { Chip, hue, Info, LABEL_HUE, out100, rank, SCORE_HUE, Voiceprint, ZoneHead } from "./hud";

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

// Every guest, best Echo score first: rank, portrait, name, label, the three scores as a voiceprint and the
// Echo score. A row selects its guest; the scope above and the overview beside follow it.
export function GuestList({ guests, selected, highlighted, picked, onSelect, onHighlight }: Props) {
  return (
    <section aria-labelledby="guests" className="zone @container">
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
      <ol className="flex flex-col pt-1 pb-2">
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
    <li id={`guest-${guest.ref}`} className="rise scroll-mt-32 px-2" style={{ "--order": index } as CSSProperties}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        onPointerEnter={() => onHighlight(guest.ref)}
        onPointerLeave={() => onHighlight(null)}
        onFocus={() => onHighlight(guest.ref)}
        onBlur={() => onHighlight(null)}
        className={`group relative grid w-full grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 rounded-xl px-3 py-3 text-left transition-colors @2xl:grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_6.5rem_10.5rem_2.75rem] @2xl:gap-x-5 ${
          selected ? "bg-deck-hi" : lit ? "bg-deck-hi/60" : "hover:bg-deck-hi/60"
        }`}
        style={hue(color)}
      >
        <span className={`readout row-span-2 text-sm @2xl:row-span-1 ${selected ? "text-ink" : "text-ink-dim"}`}>
          {rank(index)}
        </span>
        <span
          className="relative row-span-2 size-11 self-center rounded-full bg-well @2xl:row-span-1"
          style={{ boxShadow: sweet ? `0 0 0 2px var(--deck), 0 0 0 3.5px ${color}` : "inset 0 0 0 1px var(--steel)" }}
        >
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <Picture guest={guest} sizes="44px" small />
          </span>
          {picked && (
            <span
              aria-hidden
              className="absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full bg-ink ring-2 ring-deck"
            >
              <svg viewBox="0 0 10 10" className="size-2.5 text-on-hue">
                <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-base leading-tight font-semibold ">{guest.name}</span>
          {guest.description && <span className="mt-0.5 block truncate text-xs text-ink-dim">{guest.description}</span>}
        </span>
        {/* Narrow: the label and the voiceprint on a second line under the name. Wide: their own columns. */}
        <span className="col-[3/-1] row-start-2 flex items-center justify-between gap-4 @2xl:contents">
          <Chip color={color}>{LABELS[guest.label].name}</Chip>
          <span aria-hidden className="flex max-w-40 min-w-0 flex-1 flex-col gap-1 @2xl:max-w-none">
            <Voiceprint fit={fit} love={love_back} reach={reach} className="w-full" />
            <span className="readout grid grid-cols-3 text-center text-[0.6875rem]">
              <span style={{ color: SCORE_HUE.fit }}>{out100(fit)}</span>
              <span style={{ color: SCORE_HUE.love_back }}>{out100(love_back)}</span>
              <span style={{ color: SCORE_HUE.reach }}>{out100(reach)}</span>
            </span>
          </span>
        </span>
        <span className="readout col-start-4 row-start-1 text-right text-xl @2xl:col-start-auto @2xl:row-start-auto">
          {out100(guest.scores.echo)}
        </span>
        <span className="sr-only">
          , {LABELS[guest.label].name}: fit {out100(fit)}, love back {out100(love_back)}, reach{" "}
          {reach === null ? "not scored" : out100(reach)}, Echo score {out100(guest.scores.echo)}
          {picked ? ", picked to invite" : ""}
        </span>
      </button>
    </li>
  );
}

// The guest's picture from Qloo, or their initials on a recessed surface tinted with the label's hue when there's
// none or it doesn't load.
const QLOO_WIDTH = /-\d+x-auto(?=\.\w+$)/;
const LARGE_WIDTH = 1200;

function sources(url: string | null, small: boolean): string[] {
  if (!url) return [];
  const large = url.replace(QLOO_WIDTH, `-${LARGE_WIDTH}x-auto`);
  return small || large === url ? [url] : [large, url];
}

export function Picture({ guest, sizes, small = false }: { guest: Guest; sizes: string; small?: boolean }) {
  const [broken, setBroken] = useState<string[]>([]);
  const url = sources(guest.image_url, small).find((source) => !broken.includes(source));
  const markBroken = (source: string) => setBroken((failed) => [...failed, source]);
  if (url) {
    return (
      <Image
        key={url}
        src={url}
        onError={() => markBroken(url)}
        // Qloo answers some missing portraits with a tiny placeholder instead of an error; theirs are 420 wide.
        onLoad={(event) => event.currentTarget.naturalWidth < 48 && markBroken(url)}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className="object-cover object-[50%_25%]"
      />
    );
  }
  const letters = guest.name
    .split(/\s+/)
    .map((part) => part.match(/[\p{L}\p{N}]/u)?.[0])
    .filter((letter): letter is string => Boolean(letter));
  const initials = letters.length > 1 ? `${letters[0]}${letters[letters.length - 1]}` : letters.join("");
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center" style={hue(LABEL_HUE[guest.label])}>
      <span className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--hue) 16%, transparent)" }} />
      <span className={`relative font-display font-semibold text-ink-soft ${small ? "text-sm" : "text-5xl"}`}>
        {initials}
      </span>
    </span>
  );
}
