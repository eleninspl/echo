import type { Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import { channel, Info, Lamp, LABEL_HUE, Meter, out100, PanelHead, SCORE_HUE } from "./gallery";

type Props = {
  guests: Guest[];
  selected: string | null;
  highlighted: string | null;
  onSelect: (guestRef: string) => void;
  onHighlight: (guestRef: string | null) => void;
};

const surname = (name: string) => name.trim().split(/\s+/).pop() ?? name;

// The meter bridge: every guest's three levels side by side, ranked by Echo score, the way a desk shows
// every channel at once. Each channel selects its guest.
export function Bridge({ guests, selected, highlighted, onSelect, onHighlight }: Props) {
  return (
    <section aria-labelledby="bridge" className="panel rounded-[4px]">
      <PanelHead id="bridge" title="Meter bridge">
        <span className="flex items-center gap-1.5 text-fit">
          <Lamp color={SCORE_HUE.fit} className="h-2.5 w-1.5" /> Fit
        </span>
        <span className="flex items-center gap-1.5 text-love">
          <Lamp color={SCORE_HUE.love_back} className="h-2.5 w-1.5" /> Love back
        </span>
        <span className="flex items-center gap-1.5 text-reach">
          <Lamp color={SCORE_HUE.reach} className="h-2.5 w-1.5" /> Reach
        </span>
        <Info>
          One channel per guest, best Echo score first. Each meter is out of 100, ranked within these guests. The lamp
          on top is the guest&apos;s label; red is a sweet spot.
        </Info>
      </PanelHead>
      <ol className="flex snap-x gap-1 overflow-x-auto p-2 [scrollbar-width:thin]">
        {guests.map((guest, index) => {
          const { fit, love_back, reach } = guest.scores;
          const isSelected = guest.ref === selected;
          const isLit = isSelected || guest.ref === highlighted;
          return (
            <li key={guest.ref} className="min-w-9 flex-1 snap-start">
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${channel(index)}, ${guest.name}, ${LABELS[guest.label].name}: fit ${out100(fit)}, love back ${out100(love_back)}, reach ${reach === null ? "not scored" : out100(reach)}`}
                onClick={() => onSelect(guest.ref)}
                onPointerEnter={() => onHighlight(guest.ref)}
                onPointerLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(guest.ref)}
                onBlur={() => onHighlight(null)}
                className={`flex w-full flex-col items-center gap-2 rounded-[3px] px-1 pt-2 pb-2.5 transition-colors ${
                  isSelected
                    ? "bg-bezel shadow-[inset_0_0_0_1px_var(--ink)]"
                    : isLit
                      ? "bg-bezel/70"
                      : "hover:bg-bezel/60"
                }`}
              >
                <Lamp color={LABEL_HUE[guest.label]} on={guest.label === "sweet_spot" || isLit} className="h-1.5 w-6" />
                <span className="flex h-32 gap-[3px] sm:h-40">
                  <Meter vertical value={fit} color={SCORE_HUE.fit} segments={24} order={index} className="w-2" />
                  <Meter
                    vertical
                    value={love_back}
                    color={SCORE_HUE.love_back}
                    segments={24}
                    order={index + 1}
                    className="w-2"
                  />
                  {reach === null ? (
                    <span aria-hidden className="w-2 rounded-[1px] border border-dashed border-line" />
                  ) : (
                    <Meter
                      vertical
                      value={reach}
                      color={SCORE_HUE.reach}
                      segments={24}
                      order={index + 2}
                      className="w-2"
                    />
                  )}
                </span>
                <span className="font-cond text-lg leading-none font-semibold">{out100(guest.scores.echo)}</span>
                <span className={`silk text-[0.5625rem] ${isSelected ? "text-ink" : "text-ink-dim"}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="w-full truncate text-center font-cond text-xs text-ink-soft">
                  {surname(guest.name)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
