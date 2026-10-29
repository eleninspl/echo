import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type MouseEvent } from "react";
import { flushSync } from "react-dom";

import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";
import { guestPath } from "@/lib/paths";

import { Chip, hue, Info, LABEL_HUE, out100, rank, SCORE_HUE, SectionHead } from "./hud";
import { Voiceprint } from "./voiceprint";

type Props = {
  analysisId: string;
  guests: Guest[];
  // Whether this run came with episode ideas.
  ideas: boolean;
  open: string | null;
  highlighted: string | null;
  picked: string[];
  onOpen: (guestRef: string) => void;
  onPick: (guestRef: string) => void;
  onHighlight: (guestRef: string | null) => void;
};

// How many of a guest's shared tastes a wide row shows.
const SHARED = 3;

type Sort = "echo" | "fit" | "love_back" | "reach";

const SORTS: { key: Sort; name: string; color: string }[] = [
  { key: "echo", name: "Echo score", color: "var(--ink)" },
  { key: "fit", name: "Fit", color: SCORE_HUE.fit },
  { key: "love_back", name: "Love back", color: SCORE_HUE.love_back },
  { key: "reach", name: "Reach", color: SCORE_HUE.reach },
];

// The guests by one score, highest first; ties and missing scores keep their Echo order.
function sorted(guests: Guest[], sort: Sort): Guest[] {
  if (sort === "echo") return guests;
  const score = (guest: Guest) => guest.scores[sort] ?? -1;
  return [...guests].sort((a, b) => score(b) - score(a) || guests.indexOf(a) - guests.indexOf(b));
}

// Every guest, best Echo score first or by one score: rank, portrait, name, label, the three scores as a voiceprint
// and the Echo score. A row opens its guest beside the list and lights its dot on the chart; the button at the end
// picks it. The rank stays the Echo rank whatever the order, as everywhere else.
export function GuestList({
  analysisId,
  guests,
  ideas,
  open,
  highlighted,
  picked,
  onOpen,
  onPick,
  onHighlight,
}: Props) {
  const [sort, setSort] = useState<Sort>("echo");
  const shown = sorted(guests, sort);
  const by = SORTS.find(({ key }) => key === sort) ?? SORTS[0];
  const order = sort === "echo" ? "ranked" : `by ${by.name.toLowerCase()}`;
  // The rows glide to their new places where the browser can, and simply jump where it can't or motion is off.
  const choose = (next: Sort) => {
    const apply = () => flushSync(() => setSort(next));
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) apply();
    else document.startViewTransition(apply);
  };
  return (
    <section aria-labelledby="guests" className="@container flex flex-col gap-4">
      <SectionHead id="guests" title={`All ${guests.length} guests, ${order}`}>
        <div role="group" aria-label="Sort the guests" className="flex flex-wrap items-center gap-1">
          {/* On a phone the word goes, so the sort and its hint fit on one line; the group still names it. */}
          <span className="mr-1 hidden sm:inline">Sort</span>
          {SORTS.map(({ key, name, color }) => {
            const on = key === sort;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => choose(key)}
                className={`flex min-h-8 items-center gap-1.5 rounded-full px-2 transition-colors sm:px-2.5 ${
                  on ? "bg-deck-hi text-ink ring-1 ring-steel-hi" : "text-ink-dim hover:bg-deck hover:text-ink"
                }`}
              >
                <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
                {name}
              </button>
            );
          })}
        </div>
        <Info>
          Ranked by the Echo score, which weighs fit, love back and reach together. Each score is out of 100, ranked
          within these guests. The top 10 come with {ideas ? "an episode idea and evidence" : "evidence"}.
        </Info>
      </SectionHead>
      <div
        aria-hidden
        className="tag -mb-1.5 hidden grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_6.5rem_10.5rem_2.75rem_2.25rem] gap-x-5 px-2 whitespace-nowrap text-ink-dim @2xl:grid @5xl:grid-cols-[1.5rem_2.75rem_minmax(12rem,0.8fr)_minmax(0,1.2fr)_6.5rem_15rem_2.75rem_2.25rem]"
      >
        <span className="col-start-4 hidden @5xl:block">Both audiences love</span>
        <span className="col-start-5 grid grid-cols-3 text-center @5xl:col-start-6">
          <span className="text-fit">Fit</span>
          <span className="text-love">Love back</span>
          <span className="text-reach">Reach</span>
        </span>
        <span className="text-right">Echo score</span>
      </div>
      <ol className="flex flex-col border-t border-steel">
        {shown.map((guest) => (
          <Row
            key={guest.ref}
            href={guestPath(analysisId, guest.ref)}
            guest={guest}
            index={guests.indexOf(guest)}
            selected={guest.ref === open}
            lit={guest.ref === highlighted}
            picked={picked.includes(guest.ref)}
            onOpen={() => onOpen(guest.ref)}
            onPick={() => onPick(guest.ref)}
            onHighlight={onHighlight}
          />
        ))}
      </ol>
    </section>
  );
}

function Row({
  href,
  guest,
  index,
  selected,
  lit,
  picked,
  onOpen,
  onPick,
  onHighlight,
}: {
  href: string;
  guest: Guest;
  index: number;
  selected: boolean;
  lit: boolean;
  picked: boolean;
  onOpen: () => void;
  onPick: () => void;
  onHighlight: (guestRef: string | null) => void;
}) {
  const color = LABEL_HUE[guest.label];
  const sweet = guest.label === "sweet_spot";
  const { fit, love_back, reach } = guest.scores;
  const [lobe, setLobe] = useState<number | null>(null);
  return (
    <li
      id={`guest-${guest.ref}`}
      className={`rise group relative grid scroll-mt-32 grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_auto_2.25rem] items-center gap-x-3.5 gap-y-2 border-b border-steel px-2 py-3 transition-colors @2xl:grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_6.5rem_10.5rem_2.75rem_2.25rem] @2xl:gap-x-5 @5xl:grid-cols-[1.5rem_2.75rem_minmax(12rem,0.8fr)_minmax(0,1.2fr)_6.5rem_15rem_2.75rem_2.25rem] ${
        lit || selected ? "bg-deck/70" : "hover:bg-deck/70"
      }`}
      style={
        {
          "--order": index,
          // Each row its own name, so a change of sort can move it.
          viewTransitionName: `guest-${guest.ref.replace(/[^\w-]/g, "-")}`,
          ...hue(color),
        } as CSSProperties
      }
      onPointerEnter={() => onHighlight(guest.ref)}
      onPointerLeave={() => onHighlight(null)}
    >
      <span className={`readout row-span-2 text-sm @2xl:row-span-1 ${selected ? "text-ink" : "text-ink-dim"}`}>
        {rank(index)}
      </span>
      <span
        className="relative row-span-2 size-11 self-center rounded-full bg-well @2xl:row-span-1"
        style={{ boxShadow: sweet ? `0 0 0 2px var(--void), 0 0 0 3.5px ${color}` : "inset 0 0 0 1px var(--steel)" }}
      >
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <Picture guest={guest} sizes="44px" small />
        </span>
      </span>
      <span className="min-w-0">
        <Link
          href={href}
          scroll={false}
          aria-current={selected || undefined}
          onClick={(event: MouseEvent) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onOpen();
          }}
          onFocus={() => onHighlight(guest.ref)}
          onBlur={() => onHighlight(null)}
          className="block truncate font-display text-base leading-tight font-semibold outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:underline"
        >
          {guest.name}
          <span className="sr-only">
            , {LABELS[guest.label].name}: fit {out100(fit)}, love back {out100(love_back)}, reach{" "}
            {reach === null ? "not scored" : out100(reach)}, Echo score {out100(guest.scores.echo)}
          </span>
        </Link>
        {guest.description && <span className="mt-0.5 block truncate text-xs text-ink-dim">{guest.description}</span>}
      </span>
      {/* Wide: what both audiences love fills the middle, on one line; chips that don't fit wrap out of sight. */}
      <span aria-hidden className="hidden h-6 min-w-0 flex-wrap gap-1.5 overflow-hidden @5xl:flex">
        {guest.evidence?.shared_tastes.slice(0, SHARED).map((taste) => (
          <span
            key={taste}
            className="max-w-full truncate rounded-full px-2.5 py-0.5 text-xs leading-5 text-ink-soft"
            style={{ background: "color-mix(in srgb, var(--fit) 12%, var(--well))" }}
          >
            {taste}
          </span>
        ))}
      </span>
      {/* Narrow: the label and the voiceprint on a second line under the name. Wide: their own columns. */}
      <span className="col-[3/-1] row-start-2 flex items-center justify-between gap-4 @2xl:contents">
        <Chip color={color}>{LABELS[guest.label].name}</Chip>
        <span
          aria-hidden
          onClick={onOpen}
          className="relative z-10 flex max-w-40 min-w-0 flex-1 cursor-pointer flex-col gap-1 @2xl:max-w-none"
        >
          <Voiceprint fit={fit} love={love_back} reach={reach} className="w-full" lit={lobe} onLobe={setLobe} />
          <span className="readout grid grid-cols-3 text-center text-[0.6875rem]">
            {[
              { value: fit, color: SCORE_HUE.fit },
              { value: love_back, color: SCORE_HUE.love_back },
              { value: reach, color: SCORE_HUE.reach },
            ].map(({ value, color }, index) => (
              <span
                key={color}
                className={`transition-opacity duration-200 ${lobe !== null && lobe !== index ? "opacity-35" : ""}`}
                style={{ color }}
              >
                {out100(value)}
              </span>
            ))}
          </span>
        </span>
      </span>
      <span
        aria-hidden
        className="readout col-start-4 row-start-1 text-right text-xl @2xl:col-start-auto @2xl:row-start-auto"
      >
        {out100(guest.scores.echo)}
      </span>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={picked}
        title={picked ? "Picked to invite" : "Pick to invite"}
        className={`relative z-10 col-start-5 row-start-1 flex size-9 items-center justify-center rounded-full transition-colors @2xl:col-start-auto @2xl:row-start-auto ${
          picked
            ? "bg-ink text-on-hue"
            : "text-ink-soft shadow-[inset_0_0_0_1px_var(--steel-hi)] hover:bg-deck-hi hover:text-ink"
        }`}
      >
        <span className="sr-only">
          {picked ? "Picked to invite" : "Pick to invite"} {guest.name}
        </span>
        <svg aria-hidden viewBox="0 0 12 12" className="size-3">
          {picked ? (
            <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          ) : (
            <path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          )}
        </svg>
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

export function Picture({
  guest,
  sizes,
  small = false,
}: {
  guest: Pick<Guest, "name" | "image_url" | "label">;
  sizes: string;
  small?: boolean;
}) {
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
