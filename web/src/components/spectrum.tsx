import type { CSSProperties } from "react";

import type { Guest, MapRow } from "@/lib/echo";
import { AGES, category } from "@/lib/format";
import { AGE_ORDER, type Stats } from "@/lib/stats";

import { categoryHue, hue, Info, PanelHead } from "./gallery";
import { SHORT_AGE } from "./preview";

// The audience spectrum: what the show's listeners over-index on, one band per category, each taste a
// bar as long as its affinity. The guests come from the same data.
export function Spectrum({ rows }: { rows: MapRow[] }) {
  const filled = rows.filter((row) => row.items.length > 0);
  if (!filled.length) return null;
  const total = filled.reduce((sum, row) => sum + row.items.length, 0);
  return (
    <section aria-labelledby="spectrum" className="panel rounded-[4px]">
      <PanelHead id="spectrum" title="Audience spectrum">
        <span>
          {total} tastes · {filled.length} bands
        </span>
        <Info>
          What your listeners over-index on as a group, strongest first in each category. A longer bar is a stronger
          affinity.
        </Info>
      </PanelHead>
      <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {filled.map((row) => (
          <div key={row.category} className="flex flex-col gap-2 bg-panel p-3" style={hue(categoryHue(row.category))}>
            <h3 className="flex items-center justify-between">
              <span className="silk" style={{ color: "var(--hue)" }}>
                {category(row.category)}
              </span>
              <span className="silk text-ink-dim">{row.items.length}</span>
            </h3>
            <ol className="flex flex-col gap-1">
              {row.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="relative overflow-hidden rounded-[2px] bg-monitor"
                  title={`${item.name}: affinity ${Math.round(item.affinity * 100)}`}
                >
                  <span
                    aria-hidden
                    className="spectrum-bar absolute inset-y-0 left-0"
                    style={{ width: `${Math.max(item.affinity, 0.04) * 100}%`, "--order": index } as CSSProperties}
                  />
                  <span className="relative flex items-center justify-between gap-2 px-2 py-1 text-[0.8125rem]">
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 font-cond font-semibold text-ink-soft">
                      {Math.round(item.affinity * 100)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

// Which age groups the guests' audiences skew to, counted over the guests Qloo had age data for.
export function FanAges({ stats }: { stats: Stats }) {
  const peak = Math.max(1, ...AGE_ORDER.map((age) => stats.ages[age]));
  return (
    <section aria-labelledby="ages" className="panel flex flex-col rounded-[4px]">
      <PanelHead id="ages" title="Guest audiences by age">
        <span>{stats.withAges} guests</span>
        <Info>
          For each age group, how many guests&apos; fans skew to it. A guest&apos;s fans can skew to more than one.
        </Info>
      </PanelHead>
      {stats.withAges === 0 ? (
        <p className="p-4 text-sm text-ink-dim">No age data for these guests&apos; fans yet.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-end gap-2 p-4">
          <ol className="grid h-36 grid-cols-6 items-end gap-2">
            {AGE_ORDER.map((age) => (
              <li key={age} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="font-cond text-sm font-semibold">{stats.ages[age]}</span>
                <span
                  className="meter meter-v block w-full"
                  style={
                    {
                      "--hue": "var(--love)",
                      "--segments": Math.max(stats.ages[age] * 3, 1),
                      "--level": "100%",
                      height: `${Math.max(stats.ages[age] / peak, 0.02) * 100}%`,
                    } as CSSProperties
                  }
                >
                  <span className="unlit" />
                  <span className="lit" />
                </span>
                <span className="sr-only">{AGES[age]}</span>
              </li>
            ))}
          </ol>
          <ol aria-hidden className="grid grid-cols-6 gap-2 text-center text-[0.6875rem] text-ink-soft">
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
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!top.length) return null;
  const peak = top[0][1];
  return (
    <section aria-labelledby="common" className="panel flex flex-col rounded-[4px]">
      <PanelHead id="common" title="Common ground">
        <Info>
          Tastes your listeners share with each guest&apos;s fans, counted across the guests. Longer: shared with more
          guests.
        </Info>
      </PanelHead>
      <ol className="flex flex-col gap-1.5 p-4">
        {top.map(([taste, n], index) => (
          <li key={taste} className="relative overflow-hidden rounded-[2px] bg-monitor" style={hue("var(--fit)")}>
            <span
              aria-hidden
              className="spectrum-bar absolute inset-y-0 left-0"
              style={{ width: `${(n / peak) * 100}%`, "--order": index } as CSSProperties}
            />
            <span className="relative flex items-center justify-between gap-2 px-2 py-1 text-[0.8125rem]">
              <span className="truncate">{taste}</span>
              <span className="shrink-0 font-cond font-semibold text-ink-soft">
                {n} {n === 1 ? "guest" : "guests"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
