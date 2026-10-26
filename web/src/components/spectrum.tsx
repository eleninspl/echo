import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";
import { AGES, SHORT_AGE } from "@/lib/format";
import { AGE_ORDER, type Stats } from "@/lib/stats";

import { hue, Info, Meter, SectionHead } from "./hud";

// A thin line under a name, filled in the section's hue to a share of its length.
export function Track({ share, order }: { share: number; order: number }) {
  return (
    <span aria-hidden className="mt-1.5 block h-1 rounded-full bg-steel/60">
      <span
        className="bar block h-full rounded-full"
        style={
          { width: `${Math.max(share, 0.04) * 100}%`, background: "var(--hue)", "--order": order } as CSSProperties
        }
      />
    </span>
  );
}

// Which age groups the guests' audiences lean to, counted over the guests Qloo had age data for.
export function FanAges({ stats }: { stats: Stats }) {
  const peak = Math.max(1, ...AGE_ORDER.map((age) => stats.ages[age]));
  return (
    <section aria-labelledby="ages" className="flex flex-col gap-4">
      <SectionHead id="ages" title="Guests' fans by age" small>
        <span>{stats.withAges} guests</span>
        <Info>
          For each age group, how many guests&apos; fans lean to it. A guest&apos;s fans can lean to more than one.
        </Info>
      </SectionHead>
      {stats.withAges === 0 ? (
        <p className="text-sm text-ink-dim">No age data for these guests&apos; fans yet.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-end gap-2">
          <ol className="grid h-36 grid-cols-6 items-end gap-5">
            {AGE_ORDER.map((age, index) => (
              <li key={age} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="readout text-sm">{stats.ages[age]}</span>
                <span className="block w-full" style={{ height: `${Math.max(stats.ages[age] / peak, 0.02) * 100}%` }}>
                  <Meter vertical value={1} color="var(--love)" order={index} className="h-full w-full" />
                </span>
                <span className="sr-only">{AGES[age]}</span>
              </li>
            ))}
          </ol>
          <ol aria-hidden className="grid grid-cols-6 gap-5 text-center text-[0.6875rem] text-ink-soft">
            {AGE_ORDER.map((age) => (
              <li key={age}>{SHORT_AGE[age]}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// The tastes that come up for more than one guest: the common ground the lineup is built on.
export function CommonGround({ guests }: { guests: Guest[] }) {
  const counts = new Map<string, number>();
  for (const guest of guests)
    for (const taste of guest.evidence?.shared_tastes ?? []) counts.set(taste, (counts.get(taste) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <section aria-labelledby="common" className="flex flex-col gap-4">
      <SectionHead id="common" title="Common ground" small>
        <Info>
          Tastes your listeners share with each guest&apos;s fans, counted across the guests. Longer: shared with more
          guests.
        </Info>
      </SectionHead>
      {top.length ? (
        <ol className="flex flex-col gap-2.5" style={hue("var(--fit)")}>
          {top.map(([taste, n], index) => (
            <li key={taste}>
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{taste}</span>
                <span className="readout shrink-0 text-xs text-ink-dim">
                  {n} {n === 1 ? "guest" : "guests"}
                </span>
              </span>
              <Track share={n / top[0][1]} order={index} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-dim">No shared tastes for these guests yet.</p>
      )}
    </section>
  );
}
