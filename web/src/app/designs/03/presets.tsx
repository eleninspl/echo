"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";
import type { Featured, Guest } from "@/lib/echo";

import { guestsOf, sweetSpots, useAnalysis } from "./data";
import { s } from "./styles";
import { Cover, LABEL_NAME, Led, LedBar, Screws } from "./parts";

const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 lg:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
};

export function Presets() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const columns = GRID[Math.min(featured.length, 4)];
  return (
    <section id="presets" aria-labelledby="presets-03-title" className={`${s.plate} relative rounded-[24px] px-4 pt-10 pb-10 sm:px-10`}>
      <Screws />
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <p className={`${s.label} text-[0.75rem] text-(--print-soft)`}>03 · Memory</p>
          <h2 id="presets-03-title" className="text-[clamp(1.875rem,3.4vw,2.75rem)] leading-none font-semibold tracking-[-0.025em]">
            Shows Echo has run
          </h2>
        </div>
        <p className="max-w-md text-[0.9375rem] text-(--print-soft)">
          Each one is a finished analysis. Open it to see every guest, why they fit, and what your listeners share with
          their fans.
        </p>
      </div>
      <ul className={`grid gap-4 ${columns}`}>
        {featured.slice(0, 4).map((item, index) => (
          <PresetCard key={item.analysis_id} item={item} slot={index + 1} wide={featured.length === 1} />
        ))}
      </ul>
    </section>
  );
}

function PresetCard({ item, slot, wide }: { item: Featured; slot: number; wide: boolean }) {
  const loaded = useAnalysis(item.analysis_id);
  const guests = guestsOf(loaded);
  const sweet = sweetSpots(guests);
  const top = guests.slice(0, wide ? 5 : 3);
  const ready = guests.length > 0;

  return (
    <li className="@container min-w-0">
      <Link
        href={`/analyses/${encodeURIComponent(item.analysis_id)}`}
        className="group flex h-full flex-col gap-3 rounded-[18px] border border-(--seam) bg-(--plate-hi) p-3 shadow-[0_2px_0_var(--seam)] transition-shadow hover:shadow-[0_2px_0_var(--seam),0_0_0_2px_var(--print)]"
      >
        <span className="flex items-center gap-3 px-1 pt-1">
          <span className={`${s.label} rounded-[5px] bg-(--print) px-1.5 py-1 text-[0.6875rem] text-(--plate-hi)`}>
            P{slot}
          </span>
          <span className="min-w-0 flex-1 truncate text-lg leading-tight font-semibold">{item.show.title}</span>
          <Led on={sweet > 0} />
        </span>

        <span className={`${s.screen} grid flex-1 grid-cols-1 overflow-hidden rounded-[12px] @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`}>
          <span className={`${s.dotGrid} flex flex-col gap-4 p-4 @3xl:border-r @3xl:border-(--screen-line)`}>
            <span className="flex items-start gap-3">
              <Cover show={item.show} size={wide ? 64 : 48} />
              <span className="flex min-w-0 flex-col gap-1">
                {item.show.description && (
                  <span className={`${s.mono} line-clamp-2 text-xs leading-snug text-(--lcd-dim)`}>
                    {item.show.description}
                  </span>
                )}
              </span>
            </span>
            <span className="grid grid-cols-2 gap-3">
              <Stat value={ready ? guests.length : null} name="Guests scored" />
              <Stat value={ready ? sweet : null} name={sweet === 1 ? "Sweet spot" : "Sweet spots"} lit={sweet > 0} />
            </span>
            <Scope guests={guests} loading={loaded.state === "loading"} />
          </span>

          <span className="flex flex-col border-t border-(--screen-line) @3xl:border-t-0">
            <span className={`${s.mono} flex justify-between px-4 pt-3 pb-2 text-[0.6875rem] text-(--lcd-dim) uppercase`}>
              <span>Top guests</span>
              <span>Ranked by Echo</span>
            </span>
            {ready ? (
              <span className="flex flex-col">
                {top.map((guest, index) => (
                  <GuestRow key={guest.ref} guest={guest} rank={index + 1} />
                ))}
              </span>
            ) : (
              <span className={`${s.mono} px-4 pb-4 text-xs text-(--lcd-dim) uppercase`}>
                {loaded.state === "loading" ? <span className={s.blink}>Reading</span> : "No guests to show"}
              </span>
            )}
            <span className="mt-auto flex items-center justify-between gap-3 border-t border-(--screen-line) px-4 py-3">
              <span className={`${s.mono} text-[0.6875rem] text-(--lcd-dim) uppercase`}>
                {ready ? `${guests.length - top.length} more inside` : ""}
              </span>
              <span
                className={`${s.label} ${s.softKey} rounded-[8px] px-3 py-2 text-[0.75rem] group-hover:border-(--orange) group-hover:bg-(--orange) group-hover:text-(--print)`}
              >
                Open analysis →
              </span>
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function Stat({ value, name, lit = false }: { value: number | null; name: string; lit?: boolean }) {
  return (
    <span className="flex flex-col gap-1.5 rounded-[8px] border border-(--screen-line) px-3 py-2.5">
      <span className={`${s.dot} text-[2.25rem] leading-none font-black ${lit ? "text-(--orange)" : "text-(--lcd)"}`}>
        {value === null ? "--" : String(value).padStart(2, "0")}
      </span>
      <span className={`${s.label} text-[0.625rem] text-(--lcd-dim)`}>{name}</span>
    </span>
  );
}

function GuestRow({ guest, rank }: { guest: Guest; rank: number }) {
  const sweet = guest.label === "sweet_spot";
  return (
    <span className="flex flex-col gap-2.5 border-t border-dashed border-(--screen-line) px-4 py-3 first:border-t-0">
      <span className="flex items-center gap-3">
        <span className={`${s.mono} text-[0.6875rem] text-(--lcd-dim)`}>{String(rank).padStart(2, "0")}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{guest.name}</span>
        <span className={`${s.label} flex shrink-0 items-center gap-1.5 text-[0.625rem] ${sweet ? "text-(--orange)" : "text-(--lcd-dim)"}`}>
          <Led on={sweet} onScreen className="size-1.5" />
          {LABEL_NAME[guest.label]}
        </span>
      </span>
      <span className="grid grid-cols-3 gap-3">
        <LedBar name="Fit" value={guest.scores.fit} />
        <LedBar name="Love back" value={guest.scores.love_back} />
        <LedBar name="Reach" value={guest.scores.reach} />
      </span>
    </span>
  );
}

const PLOT = { left: 30, right: 290, top: 24, bottom: 150 };

function Scope({ guests, loading }: { guests: Guest[]; loading: boolean }) {
  const plotted = guests.filter((guest) => guest.scores.reach !== null);
  const unplotted = guests.length - plotted.length;
  const x = (value: number) => PLOT.left + value * (PLOT.right - PLOT.left);
  const y = (value: number) => PLOT.bottom - value * (PLOT.bottom - PLOT.top);
  return (
    <span className="flex flex-col gap-1.5">
      <svg viewBox="0 0 300 172" className="block h-auto w-full" role="img" aria-label={`Guests by reach and fit. ${plotted.length} plotted.`}>
        <rect
          x={x(0.33)}
          y={y(1)}
          width={x(1) - x(0.33)}
          height={y(0.5) - y(1)}
          fill="rgb(255 90 26 / 0.1)"
          stroke="var(--orange)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text x={x(1) - 4} y={y(1) + 11} textAnchor="end" className={s.mono} fontSize="8" fill="var(--orange)">
          SWEET SPOT ZONE
        </text>
        <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} stroke="var(--lcd-dim)" strokeWidth="1" />
        <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} stroke="var(--lcd-dim)" strokeWidth="1" />
        {[0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} y1={PLOT.bottom} x2={x(tick)} y2={PLOT.bottom + 3} stroke="var(--lcd-dim)" />
            <line x1={PLOT.left - 3} y1={y(tick)} x2={PLOT.left} y2={y(tick)} stroke="var(--lcd-dim)" />
          </g>
        ))}
        <text x={PLOT.right} y="166" textAnchor="end" className={s.mono} fontSize="8.5" fill="var(--lcd-dim)">
          REACH →
        </text>
        <text x={PLOT.left - 4} y="11" className={s.mono} fontSize="8.5" fill="var(--lcd-dim)">
          ↑ FIT
        </text>
        {loading && (
          <text x="160" y="84" textAnchor="middle" className={`${s.mono} ${s.blink}`} fontSize="10" fill="var(--lcd-dim)">
            READING
          </text>
        )}
        {plotted.map((guest) => {
          const sweet = guest.label === "sweet_spot";
          return (
            <circle
              key={guest.ref}
              cx={x(guest.scores.reach ?? 0)}
              cy={y(guest.scores.fit)}
              r={2.5 + guest.scores.love_back * 5}
              fill={sweet ? "var(--orange)" : "var(--lcd)"}
              fillOpacity={sweet ? 1 : 0.55}
              stroke="var(--screen)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <span className={`${s.mono} text-[0.625rem] leading-snug text-(--lcd-dim)`}>
        Dot size is love back.
        {unplotted > 0 && ` ${unplotted} ${unplotted === 1 ? "guest has" : "guests have"} no reach score and ${unplotted === 1 ? "isn't" : "aren't"} plotted.`}
      </span>
    </span>
  );
}
