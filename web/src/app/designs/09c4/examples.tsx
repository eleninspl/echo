"use client";

import { useFeatured } from "@/components/featured";
import type { Guest, Label } from "@/lib/echo";

import { GuestMark } from "./marks";
import { ScoreLine } from "./score-line";
import { useAnalysis } from "./runs";

const KINDS: { label: Label; name: string; rule: string }[] = [
  {
    label: "sweet_spot",
    name: "Sweet spot",
    rule: "High on all three at once. Rare: usually 1 to 4 guests in 20, and Echo tells you how many it found.",
  },
  {
    label: "safe",
    name: "Safe",
    rule: "High fit and love back, low reach. Your listeners will enjoy the episode, but it adds almost nobody.",
  },
  {
    label: "far",
    name: "Far",
    rule: "High reach, low love back. New ears, but they have little reason to stay.",
  },
];

function example(guests: Guest[], label: Label) {
  const ranked = guests.map((guest, index) => ({ guest, rank: index + 1 }));
  const matching = ranked.filter(({ guest }) => guest.label === label);
  return (
    matching.find(({ guest }) => guest.scores.reach !== null) ?? matching[0] ?? null
  );
}

export function LabelRows() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  const guests = analysis?.status === "done" ? analysis.guests : null;

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-1 gap-2 border-b-2 border-(--w4-ink) pb-3 md:grid-cols-12 md:gap-6">
        <h3 className="w4-narrow text-[1.75rem] leading-none font-semibold md:col-span-4">
          Where a guest lands
        </h3>
        {first && guests && (
          <p className="text-[0.95rem] text-(--w4-soft) md:col-span-7 md:col-start-6 md:self-end">
            Examples from Echo&apos;s run of{" "}
            <span className="text-(--w4-ink)">{first.show.title}</span>, with
            each guest&apos;s rank in that run.
          </p>
        )}
      </div>
      <dl>
        {KINDS.map((kind) => {
          const found = guests ? example(guests, kind.label) : null;
          return (
            <div
              key={kind.label}
              className="grid grid-cols-1 gap-x-6 gap-y-3 border-b border-(--w4-rule) py-6 md:grid-cols-12"
            >
              <dt
                className={`w4-narrow text-[1.5rem] leading-none md:col-span-2 ${kind.label === "sweet_spot" ? "font-semibold" : "font-normal"}`}
              >
                {kind.name}
              </dt>
              <dd
                className={`max-w-[46ch] leading-snug text-(--w4-soft) ${found ? "md:col-span-3" : "md:col-span-6"}`}
              >
                {kind.rule}
              </dd>
              {found && (
                <dd className="flex items-center gap-4 md:col-span-6 md:col-start-6">
                  <GuestMark scores={found.guest.scores} className="size-16 shrink-0" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[0.95rem] text-(--w4-soft)">
                      <span className="w4-figures">No. {found.rank}</span>{" "}
                      <span className="font-semibold text-(--w4-ink)">
                        {found.guest.name}
                      </span>
                      {found.guest.description && (
                        <span className="max-sm:hidden">, {found.guest.description}</span>
                      )}
                    </span>
                    <ScoreLine scores={found.guest.scores} />
                  </span>
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
