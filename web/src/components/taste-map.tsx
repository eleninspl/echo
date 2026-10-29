"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { echo, type AgeBucket, type Analysis, type Lens, type MapRow } from "@/lib/echo";
import { category as categoryName } from "@/lib/format";
import { STAGE_ID, TASTES_ID, type Ask, type Pointer } from "@/lib/pointer";
import { MAX_SIDE, middleOf, ring, SIDES, tasteKey, venn, type Spot } from "@/lib/taste-layout";
import type { Rerun } from "@/lib/use-analysis";
import { AGE_ORDER } from "@/lib/stats";
import { isKept, prefetch, useFetched, useSettled } from "@/lib/use-fetched";

import { Picture } from "./guest-list";
import { categoryHue, Info, SectionHead } from "./hud";
import { useReveal } from "./reveal";
import {
  BridgeSide,
  EchoNote,
  LensBar,
  LensSide,
  lensWords,
  Overview,
  pull,
  sideOf,
  TasteImage,
  TasteSide,
} from "./taste-side";

const SETTLED = 1900;
const MOVE = 900;
const ASK_AFTER = 350;
const ALL: Lens = { age: null, country: null };

const lensId = ({ age, country }: Lens) => (age || country ? `${age ?? ""}|${country ?? ""}` : "");

function lensOf(id: string): Lens {
  const [age, country] = id.split("|");
  return { age: (age || null) as AgeBucket | null, country: country || null };
}

const filled = (rows: MapRow[]) => rows.filter((row) => row.items.length > 0);

type Props = {
  analysis: Analysis;
  rerun: Rerun;
  pointer: Pointer | null;
  onClearPointer: () => void;
  bridged: string | null;
  onBridge: (guestId: string | null) => void;
  onAsk: (ask: Ask) => void;
  onOpen: (ref: string) => void;
};

export function TasteMap({ analysis, rerun, pointer, onClearPointer, bridged, onBridge, onAsk, onOpen }: Props) {
  const base = useMemo(() => filled(analysis.audience_map), [analysis.audience_map]);
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [stage, shown] = useReveal<HTMLDivElement>();
  const [settled, setSettled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [lens, setLens] = useState<Lens>(ALL);
  const [echoed, setEchoed] = useState<string[]>([]);
  const [seenPointer, setSeenPointer] = useState(pointer?.key ?? null);
  const [seenBridge, setSeenBridge] = useState(bridged);

  if (pointer && pointer.key !== seenPointer) {
    setSeenPointer(pointer.key);
    // Ask Echo points at tastes on the whole map; it doesn't pick an age or a country (W33).
    setLens(ALL);
    setFocus(pointer.category);
    setChosen(null);
    setEchoed(pointer.tastes);
  }
  if (bridged !== seenBridge) {
    setSeenBridge(bridged);
    setLens(ALL);
    setChosen(null);
    setFocus(null);
    setEchoed([]);
  }

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setSettled(true), SETTLED);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const wanted = lensId(lens);
  const mapKey = (id: string) => `${analysis.id}|map|${id}`;
  // A lens asked for settles before it's fetched, so stepping through ages doesn't fetch each; one already here shows
  // at once.
  const settledAsk = useSettled(wanted, ASK_AFTER);
  const asked = wanted && isKept(mapKey(wanted)) ? wanted : settledAsk;
  const fetchedLens = useFetched(asked ? mapKey(asked) : null, (signal) =>
    echo.lens(analysis.id, lensOf(asked), signal),
  );
  // Pointing at a lens fetches it ahead of the click.
  const peek = (next: Lens) => {
    const id = lensId(next);
    if (id) void prefetch(mapKey(id), () => echo.lens(analysis.id, next));
  };

  // Once the map is in view, each age group's map loads in the background, two at a time, so switching ages is
  // instant (6 Qloo calls each, cached by the engine after the first time).
  useEffect(() => {
    if (!shown || bridged) return;
    let stopped = false;
    const queue = [...AGE_ORDER];
    const worker = async () => {
      for (let age = queue.shift(); age && !stopped; age = queue.shift()) {
        const next = { age, country: null };
        await prefetch(`${analysis.id}|map|${lensId(next)}`, () => echo.lens(analysis.id, next));
      }
    };
    void Promise.all([worker(), worker()]);
    return () => {
      stopped = true;
    };
  }, [shown, bridged, analysis.id]);
  const lensRows = useMemo(
    () => (fetchedLens.value ? filled(fetchedLens.value.audience_map) : null),
    [fetchedLens.value],
  );
  const target = !wanted ? base : wanted === asked ? lensRows : null;
  const [lastRows, setLastRows] = useState(base);
  if (target && target.length && target !== lastRows) setLastRows(target);
  const rows = target?.length ? target : lastRows;
  const lensProblem = wanted && wanted === asked ? fetchedLens.problem : null;
  const lensLoading = Boolean(wanted) && !target && !lensProblem;

  const guest = bridged ? (analysis.guests.find((one) => one.id === bridged) ?? null) : null;
  const fetchedBridge = useFetched(guest ? `${analysis.id}|bridge|${guest.ref}` : null, (signal) =>
    echo.bridge(analysis.id, guest?.ref ?? "", signal),
  );
  const bridge = guest ? fetchedBridge.value : null;

  const side = Math.min(width, MAX_SIDE);
  const radial = useMemo(() => (side > 0 && rows.length ? ring(rows, side) : null), [rows, side]);
  const twin = useMemo(() => (side > 0 && bridge ? venn(bridge, side, focus) : null), [bridge, side, focus]);
  const layout = twin ?? radial;
  const spots = useMemo(() => layout?.spots ?? [], [layout]);

  const [was, setWas] = useState({ layout, spots });
  const [change, setChange] = useState<{ ghosts: Spot[]; entering: string[] } | null>(null);
  if (layout !== was.layout) {
    const now = new Set(spots.map((spot) => spot.key));
    const before = new Set(was.spots.map((spot) => spot.key));
    setChange(
      settled && was.spots.length
        ? {
            ghosts: was.spots.filter((spot) => !now.has(spot.key)),
            entering: spots.filter((spot) => !before.has(spot.key)).map((spot) => spot.key),
          }
        : null,
    );
    setWas({ layout, spots });
  }

  useEffect(() => {
    if (!change) return;
    const timer = window.setTimeout(() => setChange(null), MOVE + 300);
    return () => window.clearTimeout(timer);
  }, [change]);

  const baseKeys = useMemo(
    () => new Set(base.flatMap((row) => row.items.map((item) => tasteKey(row.category, item.name)))),
    [base],
  );

  if (!base.length) return null;

  const picked = spots.find((spot) => spot.key === chosen);
  const lit = spots.find((spot) => spot.key === (hovered ?? chosen));
  const total = rows.reduce((sum, row) => sum + row.items.length, 0);
  const lensOn = Boolean(wanted) && !twin;
  const echoedKeys = spots.filter((spot) => echoed.includes(spot.item.name)).map((spot) => spot.key);
  const echoedNames = spots.filter((spot) => echoedKeys.includes(spot.key)).map((spot) => spot.item.name);
  const fresh = lensOn && target ? spots.filter((spot) => !baseKeys.has(spot.key)) : [];
  const shownKeys = new Set(spots.map((spot) => spot.key));
  const gone =
    lensOn && target
      ? base.flatMap((row) =>
          row.items.filter((item) => !shownKeys.has(tasteKey(row.category, item.name))).map((item) => item.name),
        )
      : [];
  const all = [
    ...spots.map((spot) => ({ spot, ghost: false })),
    ...(change?.ghosts ?? []).map((spot) => ({ spot, ghost: true })),
  ];
  const categories = bridge ? [...new Set(SIDES.flatMap((where) => bridge[where].map((row) => row.category)))] : [];

  function changeLens(next: Lens) {
    setLens(next);
    setChosen(null);
    setEchoed([]);
  }

  function clearEchoed() {
    setEchoed([]);
    setFocus(null);
    onClearPointer();
  }

  return (
    <section aria-labelledby={TASTES_ID} className="flex flex-col gap-6">
      <SectionHead id={TASTES_ID} title="What your listeners love">
        <span>
          {total} tastes · {rows.length} categories
        </span>
        <Info>
          What your listeners like more than most people do, as a group. The closer to your show and the bigger the
          circle, the stronger the pull, out of 100. Pick an age group or a country to see how it shifts, or a guest to
          see what their fans love next to yours.
        </Info>
      </SectionHead>
      {!guest && <LensBar lens={lens} onLens={changeLens} onPeek={peek} problem={lensProblem} />}
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_22rem] @4xl:items-center">
        <div ref={frame} id={STAGE_ID} className="flex min-w-0 scroll-mt-20 flex-col gap-4">
          {echoedNames.length > 0 && <EchoNote names={echoedNames} onClear={clearEchoed} />}
          <div
            ref={stage}
            role="group"
            aria-label={
              twin && guest
                ? `What your listeners and ${guest.name}'s fans love`
                : `${lensWords(lens)}: their tastes around your show`
            }
            aria-busy={lensLoading || (guest !== null && !bridge) || undefined}
            className="relative isolate mx-auto"
            style={{ width: side, height: side }}
          >
            {radial && (
              <>
                <svg
                  aria-hidden
                  width={side}
                  height={side}
                  className="pointer-events-none absolute inset-0 overflow-visible transition-opacity duration-500"
                  style={{ opacity: twin ? 0 : lensLoading ? 0.55 : 1 }}
                >
                  {radial.rows.map((row, k) => {
                    const middle = middleOf(k, radial.wedge);
                    const on = focus === row.category || picked?.category === row.category;
                    return (
                      <path
                        key={row.category}
                        d={sector(
                          radial.centre,
                          radial.inner,
                          radial.outer,
                          middle - radial.wedge / 2,
                          middle + radial.wedge / 2,
                        )}
                        fill={categoryHue(row.category)}
                        fillOpacity={on ? 0.12 : 0.035}
                        stroke="var(--steel)"
                        strokeOpacity="0.7"
                        style={{ transition: "fill-opacity 300ms ease-out" }}
                      />
                    );
                  })}
                  {[0.5, 0].map((strength) => (
                    <circle
                      key={strength}
                      cx={radial.centre}
                      cy={radial.centre}
                      r={radial.inner + 8 + (1 - strength) * (radial.outer - radial.inner - 8)}
                      fill="none"
                      stroke="var(--steel-hi)"
                      strokeDasharray="2 5"
                    />
                  ))}
                  {lit && !twin && (
                    <line
                      x1={radial.centre}
                      y1={radial.centre}
                      x2={lit.x}
                      y2={lit.y}
                      stroke={categoryHue(lit.category)}
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                      strokeOpacity="0.8"
                    />
                  )}
                  <g transform={`translate(${radial.centre} ${radial.centre})`}>
                    {[0, 1, 2].map((i) => (
                      <circle
                        key={i}
                        className="ring"
                        r={radial.inner * 0.45}
                        fill="none"
                        stroke="var(--brand)"
                        strokeOpacity="0.5"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                        style={{ animationDelay: `${i * 0.93}s`, animationDuration: "4.2s" }}
                      />
                    ))}
                  </g>
                </svg>

                <span
                  aria-hidden
                  className="pointer-events-none absolute overflow-hidden rounded-full transition-opacity duration-500 motion-reduce:hidden"
                  style={{
                    left: radial.centre - radial.outer,
                    top: radial.centre - radial.outer,
                    width: radial.outer * 2,
                    height: radial.outer * 2,
                    opacity: twin ? 0 : 1,
                  }}
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0turn, transparent 0.8turn, color-mix(in srgb, var(--brand) 14%, transparent) 1turn)",
                      animation: `spin ${lensLoading ? 2.5 : 14}s linear infinite`,
                    }}
                  />
                </span>
              </>
            )}

            {twin && guest && (
              <>
                <svg aria-hidden width={side} height={side} className="fade pointer-events-none absolute inset-0">
                  <circle
                    cx={twin.left}
                    cy={twin.middle}
                    r={twin.radius}
                    fill="var(--fit)"
                    fillOpacity="0.07"
                    stroke="var(--fit)"
                    strokeOpacity="0.45"
                  />
                  <circle
                    cx={twin.right}
                    cy={twin.middle}
                    r={twin.radius}
                    fill="var(--reach)"
                    fillOpacity="0.07"
                    stroke="var(--reach)"
                    strokeOpacity="0.45"
                  />
                </svg>
                {(
                  [
                    ["yours", twin.left - twin.radius * 0.45, twin.middle + twin.radius + 12 * twin.scale],
                    ["both", side / 2, twin.middle + twin.half + 12 * twin.scale],
                    ["theirs", twin.right + twin.radius * 0.45, twin.middle + twin.radius + 12 * twin.scale],
                  ] as const
                ).map(([where, x, y]) => (
                  <span
                    key={where}
                    aria-hidden
                    className="fade pointer-events-none absolute flex -translate-x-1/2 items-baseline gap-1.5 text-xs font-semibold whitespace-nowrap sm:text-sm"
                    style={{ left: x, top: y, color: sideOf(where).color }}
                  >
                    {sideOf(where).name}
                    <span className="readout text-ink-dim">{twin.totals[where]}</span>
                  </span>
                ))}
                <span
                  aria-hidden
                  className="fade pointer-events-none absolute flex -translate-x-1/2 flex-col items-center gap-1"
                  style={{ left: twin.right, top: side * 0.09 - 22 * twin.scale }}
                >
                  <span
                    className="relative block overflow-hidden rounded-full bg-well"
                    style={{ width: 44 * twin.scale, height: 44 * twin.scale, boxShadow: "0 0 0 2px var(--reach)" }}
                  >
                    <Picture guest={guest} sizes="44px" small />
                  </span>
                  <span className="max-w-40 truncate text-xs font-semibold text-ink-soft">
                    {guest.name}&apos;s fans
                  </span>
                </span>
                <span
                  aria-hidden
                  className="fade pointer-events-none absolute -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-ink-soft"
                  style={{ left: twin.left, top: side * 0.09 + 26 * twin.scale }}
                >
                  Your listeners
                </span>
              </>
            )}

            {radial && (
              <span
                aria-hidden
                className="absolute overflow-hidden rounded-full bg-well shadow-pop"
                style={
                  twin
                    ? {
                        left: twin.left - 22 * twin.scale,
                        top: side * 0.09 - 22 * twin.scale,
                        width: 44 * twin.scale,
                        height: 44 * twin.scale,
                        boxShadow: "0 0 0 2px var(--fit)",
                        transition: `all ${MOVE}ms var(--ease-out)`,
                      }
                    : {
                        left: radial.centre - radial.inner + 10 * radial.scale,
                        top: radial.centre - radial.inner + 10 * radial.scale,
                        width: (radial.inner - 10 * radial.scale) * 2,
                        height: (radial.inner - 10 * radial.scale) * 2,
                        transition: settled ? `all ${MOVE}ms var(--ease-out)` : undefined,
                      }
                }
              >
                {analysis.show.image_url && (
                  <Image src={analysis.show.image_url} alt="" fill unoptimized sizes="96px" className="object-cover" />
                )}
              </span>
            )}

            {radial &&
              radial.rows.map((row, k) => {
                const middle = middleOf(k, radial.wedge);
                const radius = radial.outer + 22 * radial.scale;
                const on = focus === row.category;
                return (
                  <button
                    key={row.category}
                    type="button"
                    aria-pressed={on}
                    tabIndex={twin ? -1 : undefined}
                    aria-hidden={twin ? true : undefined}
                    onClick={() => setFocus(on ? null : row.category)}
                    className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full px-2 py-1 font-display text-sm font-semibold whitespace-nowrap transition-[opacity,background-color] duration-300 hover:bg-deck-hi ${
                      twin ? "pointer-events-none opacity-0" : focus && !on ? "opacity-40" : ""
                    } ${on ? "bg-deck-hi" : ""}`}
                    style={{
                      left: radial.centre + Math.cos(middle) * radius,
                      top: radial.centre + Math.sin(middle) * radius,
                    }}
                  >
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ background: categoryHue(row.category) }}
                    />
                    {categoryName(row.category)}
                  </button>
                );
              })}

            {radial &&
              all.map(({ spot, ghost }, order) => {
                const color = categoryHue(spot.category);
                const on = spot.key === chosen;
                const near = spot.key === hovered || on;
                const lighted = echoedKeys.includes(spot.key);
                const dim = echoedKeys.length
                  ? !lighted
                  : focus !== null && !twin
                    ? spot.category !== focus
                    : picked !== undefined && spot.category !== picked.category;
                const centre = twin ? side / 2 : radial.centre;
                const delay = settled
                  ? 0
                  : 150 + (Math.hypot(spot.x - centre, spot.y - centre) / (side / 2)) * 650 + order * 4;
                const entering = change?.entering.includes(spot.key) ?? false;
                const isFresh = lensOn && !ghost && target !== null && !baseKeys.has(spot.key);
                const stagger = Math.min(order, 60) * 5;
                return (
                  <button
                    key={spot.key}
                    type="button"
                    aria-pressed={on}
                    aria-hidden={ghost || undefined}
                    tabIndex={ghost ? -1 : undefined}
                    aria-label={`${spot.item.name}, ${categoryName(spot.category)}${
                      spot.side
                        ? `, ${sideOf(spot.side).name.toLowerCase()}`
                        : `, ${pull(spot.item.affinity)} out of 100`
                    }${lighted ? ", lit by Ask Echo" : ""}${isFresh ? ", new for this group" : ""}`}
                    onClick={() => setChosen(on ? null : spot.key)}
                    onPointerEnter={() => setHovered(spot.key)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(spot.key)}
                    onBlur={() => setHovered(null)}
                    className={`absolute rounded-full before:absolute before:inset-0 before:-z-10 before:rounded-full before:content-[''] pointer-coarse:before:-inset-3 ${
                      near ? "z-10" : ""
                    } ${ghost ? "pointer-events-none" : ""} ${entering ? "taste-pop" : ""}`}
                    style={{
                      left: spot.x - spot.size,
                      top: spot.y - spot.size,
                      width: spot.size * 2,
                      height: spot.size * 2,
                      transform: shown ? "none" : `translate(${centre - spot.x}px, ${centre - spot.y}px) scale(0.2)`,
                      opacity: !shown || ghost ? 0 : dim ? 0.28 : 1,
                      transition: settled
                        ? `left ${MOVE}ms var(--ease-out) ${stagger}ms, top ${MOVE}ms var(--ease-out) ${stagger}ms, width ${MOVE}ms var(--ease-out), height ${MOVE}ms var(--ease-out), opacity 350ms ease-out`
                        : `transform 1100ms var(--ease-out) ${delay}ms, opacity 500ms ease-out ${delay}ms`,
                    }}
                  >
                    {(on || lighted) && !ghost && (
                      <span
                        aria-hidden
                        className="absolute inset-0 animate-ping rounded-full border-2 motion-reduce:hidden"
                        style={{ borderColor: lighted ? "var(--brand)" : color }}
                      />
                    )}
                    <span
                      className={`relative block size-full overflow-hidden rounded-full bg-well transition-[scale] duration-200 ease-(--ease-out) ${near ? "scale-[1.35]" : ""}`}
                      style={{
                        boxShadow: lighted
                          ? "0 0 0 3px var(--brand), 0 0 18px color-mix(in srgb, var(--brand) 55%, transparent)"
                          : spot.side === "theirs"
                            ? `0 0 0 ${on ? 2.5 : 1.5}px ${color}, 0 0 14px color-mix(in srgb, var(--reach) 60%, transparent)`
                            : `0 0 0 ${on ? 2.5 : 1.5}px ${color}`,
                      }}
                    >
                      <TasteImage item={spot.item} color={color} />
                    </span>
                    {isFresh && (
                      <span
                        aria-hidden
                        className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-sweet shadow-[0_0_0_2px_var(--void)]"
                      />
                    )}
                  </button>
                );
              })}

            {lit && (
              <span
                aria-hidden
                className="pointer-events-none absolute z-20 flex max-w-[15rem] -translate-x-1/2 -translate-y-full items-baseline gap-2 rounded-full bg-deck px-3 py-1.5 text-sm whitespace-nowrap shadow-pop ring-1 ring-steel"
                style={{
                  left: Math.min(Math.max(lit.x, 90), side - 90),
                  top: lit.y - lit.size * 1.35 - 8,
                }}
              >
                <span className="truncate font-semibold">{lit.item.name}</span>
                <span className="readout text-ink-dim">{pull(lit.item.affinity)}</span>
              </span>
            )}
          </div>
        </div>

        {picked ? (
          <TasteSide
            analysis={analysis}
            spot={picked}
            lens={twin ? ALL : lens}
            bridged={twin ? guest : null}
            rerun={rerun}
            onBack={() => setChosen(null)}
            onAsk={onAsk}
            onOpen={onOpen}
          />
        ) : guest ? (
          <BridgeSide
            guest={guest}
            totals={twin?.totals ?? null}
            focus={focus}
            categories={categories}
            loading={fetchedBridge.loading}
            problem={fetchedBridge.problem}
            onRetry={fetchedBridge.retry}
            onFocus={setFocus}
            onBack={() => onBridge(null)}
            onOpen={onOpen}
            guests={analysis.guests}
            onBridge={onBridge}
          />
        ) : wanted ? (
          <LensSide
            lens={lens}
            fresh={fresh.map((spot) => spot.item.name)}
            gone={gone}
            loading={lensLoading}
            problem={lensProblem}
            onRetry={fetchedLens.retry}
            onClear={() => changeLens(ALL)}
          />
        ) : (
          <Overview rows={rows} focus={focus} onFocus={setFocus} guests={analysis.guests} onBridge={onBridge} />
        )}
      </div>
    </section>
  );
}

function sector(centre: number, inner: number, outer: number, from: number, to: number) {
  const point = (radius: number, angle: number) =>
    `${centre + Math.cos(angle) * radius} ${centre + Math.sin(angle) * radius}`;
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${point(inner, from)} L ${point(outer, from)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, to)} L ${point(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, from)} Z`;
}
