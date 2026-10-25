import type { CSSProperties } from "react";

import type { Guest, MapRow } from "@/lib/echo";
import { AGES, category, SHORT_AGE } from "@/lib/format";
import { AGE_ORDER, type Stats } from "@/lib/stats";

import { categoryHue, hue, Info, Meter, ZoneHead } from "./hud";

// The audience spectrum: what the show's listeners over-index on, a column per category in its own hue,
// each taste a bar as long as its affinity. Above it, how the tastes split across the categories. The
// guests come from the same data.
export function Spectrum({ rows }: { rows: MapRow[] }) {
  const filled = rows.filter((row) => row.items.length > 0);
  if (!filled.length) return null;
  const total = filled.reduce((sum, row) => sum + row.items.length, 0);
  return (
    <section aria-labelledby="spectrum" className="zone">
      <ZoneHead id="spectrum" title="What your listeners love">
        <span>
          {total} tastes · {filled.length} categories
        </span>
        <Info>
          What your listeners over-index on as a group, strongest first in each category. A longer bar is a stronger
          affinity, out of 100.
        </Info>
      </ZoneHead>
      <div className="flex flex-col gap-2 px-4 pt-4">
        <div aria-hidden className="flex h-2.5 gap-1">
          {filled.map((row, index) => (
            <span
              key={row.category}
              className="bar rounded-full"
              style={
                {
                  flexGrow: row.items.length,
                  background: categoryHue(row.category),
                  "--order": index,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {filled.map((row) => (
            <li key={row.category} className="flex items-center gap-1.5 text-sm">
              <span aria-hidden className="size-2 rounded-full" style={{ background: categoryHue(row.category) }} />
              <span className="text-ink-soft">{category(row.category)}</span>
              <span className="readout">{row.items.length}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {filled.map((row) => (
          <div
            key={row.category}
            className="flex flex-col gap-2 rounded-xl bg-well p-3"
            style={hue(categoryHue(row.category))}
          >
            <h3 className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display text-base font-semibold">
                <span aria-hidden className="size-2 rounded-full" style={{ background: "var(--hue)" }} />
                {category(row.category)}
              </span>
              <span className="readout text-sm text-ink-dim">{row.items.length}</span>
            </h3>
            <ol className="flex flex-col gap-1">
              {row.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="relative overflow-hidden rounded-md"
                  title={`${item.name}: affinity ${Math.round(item.affinity * 100)}`}
                >
                  <span
                    aria-hidden
                    className="bar absolute inset-y-0 left-0"
                    style={
                      {
                        width: `calc((100% - 2.5rem) * ${Math.max(item.affinity, 0.04)})`,
                        "--order": index,
                      } as CSSProperties
                    }
                  />
                  <span className="relative flex items-center justify-between gap-2 px-2 py-1 text-[0.8125rem]">
                    <span className="truncate">{item.name}</span>
                    <span className="readout w-7 shrink-0 text-right text-ink-soft">
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
    <section aria-labelledby="ages" className="zone flex flex-col">
      <ZoneHead id="ages" title="Guests' fans by age">
        <span>{stats.withAges} guests</span>
        <Info>
          For each age group, how many guests&apos; fans skew to it. A guest&apos;s fans can skew to more than one.
        </Info>
      </ZoneHead>
      {stats.withAges === 0 ? (
        <p className="p-4 text-sm text-ink-dim">No age data for these guests&apos; fans yet.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-end gap-2 p-4">
          <ol className="grid h-40 grid-cols-6 items-end gap-2">
            {AGE_ORDER.map((age, index) => (
              <li key={age} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="readout text-sm">{stats.ages[age]}</span>
                <span className="block w-full" style={{ height: `${Math.max(stats.ages[age] / peak, 0.02) * 100}%` }}>
                  <Meter
                    vertical
                    value={1}
                    color="var(--love)"
                    order={index}
                    className="h-full w-full"
                  />
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
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <section aria-labelledby="common" className="zone flex flex-col">
      <ZoneHead id="common" title="Common ground">
        <Info>
          Tastes your listeners share with each guest&apos;s fans, counted across the guests. Longer: shared with more
          guests.
        </Info>
      </ZoneHead>
      {top.length ? (
        <ol className="flex flex-col gap-1.5 p-4">
          {top.map(([taste, n], index) => (
            <li key={taste} className="relative overflow-hidden rounded-md bg-well" style={hue("var(--fit)")}>
              <span
                aria-hidden
                className="bar absolute inset-y-0 left-0"
                style={{ width: `calc((100% - 4.5rem) * ${n / top[0][1]})`, "--order": index } as CSSProperties}
              />
              <span className="relative flex items-center justify-between gap-2 px-2 py-1 text-[0.8125rem]">
                <span className="truncate">{taste}</span>
                <span className="readout w-15 shrink-0 text-right text-ink-soft">
                  {n} {n === 1 ? "guest" : "guests"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="p-4 text-sm text-ink-dim">No shared tastes for these guests yet.</p>
      )}
    </section>
  );
}
