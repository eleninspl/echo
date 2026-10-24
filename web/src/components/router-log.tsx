"use client";

import { useState, type ReactNode } from "react";

import type { QlooCall } from "@/lib/echo";
import { ms, type Stats } from "@/lib/stats";

import { Info, ZoneHead } from "./hud";

// Every Qloo call the analysis made, on one timeline: a bar from when it started to when it finished,
// packed into lanes so parallel calls sit side by side; cached calls are ticks. The table underneath has
// every path and parameter, for anyone who wants the data behind the run.
const PATH_HUE: Record<string, string> = {
  "/search": "var(--fit)",
  "/v2/insights": "var(--love)",
  "/entities": "var(--reach)",
  "/v2/tags": "var(--books)",
  "/v2/analysis/compare": "var(--far)",
};
const hueOf = (path: string) => PATH_HUE[path] ?? "var(--balanced)";

type Placed = { call: QlooCall; index: number; start: number; end: number; lane: number };

function place(calls: QlooCall[]): { placed: Placed[]; total: number; lanes: number } {
  const times = calls.map((call) => Date.parse(call.at));
  const valid = times.filter((time) => !Number.isNaN(time));
  if (!valid.length) return { placed: [], total: 0, lanes: 0 };
  const origin = Math.min(...valid);
  const placed: Placed[] = [];
  const laneEnds: number[] = [];
  calls
    .map((call, index) => ({ call, index, start: times[index] - origin }))
    .filter(({ start }) => !Number.isNaN(start))
    .sort((a, b) => a.start - b.start)
    .forEach(({ call, index, start }) => {
      const end = start + Math.max(call.duration_ms, 0);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane < 0) lane = laneEnds.length;
      // A cached call has no duration; give it a sliver so it doesn't share a lane's exact instant.
      laneEnds[lane] = Math.max(end, start + 1);
      placed.push({ call, index, start, end, lane });
    });
  return { placed, total: Math.max(...placed.map((p) => p.end), 1), lanes: laneEnds.length };
}

export function RouterLog({ calls, stats }: { calls: QlooCall[]; stats: Stats }) {
  const [open, setOpen] = useState(false);
  if (!calls.length) return null;
  const { placed, total, lanes } = place(calls);
  const paths = [...new Set(calls.map((call) => call.path))];
  const lane = 7;
  const height = Math.max(lanes, 1) * lane + 4;
  const step = total > 8000 ? 2000 : total > 3000 ? 1000 : 500;
  const ticks = Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => i * step);
  const qloo = ms(stats.qlooTime);
  const median = ms(stats.medianCall);
  const slowest = ms(stats.slowest);

  return (
    <section aria-labelledby="qloo" className="zone">
      <ZoneHead id="qloo" title="What Qloo saw">
        <span>
          {stats.calls} calls · {stats.cached} cached · {qloo.value} {qloo.unit}
        </span>
        <Info>
          Every call this analysis made to Qloo, from the first starting. Many run at once. Each describes an audience
          as a group; no personal data goes to Qloo.
        </Info>
      </ZoneHead>
      <div className="flex flex-col gap-4 p-4">
        <dl className="grid grid-cols-2 gap-px bg-steel sm:grid-cols-4">
          <Readout name="Calls" value={String(stats.calls)} note={`${stats.fresh} fresh · ${stats.cached} cached`}>
            <span aria-hidden className="flex h-1.5 gap-px">
              {calls.map((call, i) => (
                <span
                  key={i}
                  className="flex-1"
                  style={{ background: call.cached ? "color-mix(in srgb, var(--fit) 25%, transparent)" : "var(--fit)" }}
                />
              ))}
            </span>
          </Readout>
          <Readout name="Qloo time" value={qloo.value} unit={qloo.unit} note="first call to last, in parallel" />
          <Readout name="Median call" value={median.value} unit={median.unit} note="fresh calls only" />
          <Readout
            name="Slowest call"
            value={slowest.value}
            unit={slowest.unit}
            note={`${stats.failedCalls} refused`}
          />
        </dl>
        <ul aria-label="Endpoints" className="flex flex-wrap gap-x-5 gap-y-1">
          {paths.map((path) => (
            <li key={path} className="flex items-center gap-2 text-sm">
              <span aria-hidden className="h-2 w-4" style={{ background: hueOf(path) }} />
              <span className="font-mono text-xs text-ink-soft">{path}</span>
              <span className="readout">{calls.filter((call) => call.path === path).length}</span>
            </li>
          ))}
          {stats.failedCalls > 0 && (
            <li className="flex items-center gap-2 text-sm text-alert">
              <span aria-hidden className="h-2 w-4 border border-alert" />
              {stats.failedCalls} refused
            </li>
          )}
        </ul>
        <div className="screen relative px-2 pt-2 pb-6">
          <svg
            aria-hidden
            viewBox={`0 0 1000 ${height}`}
            preserveAspectRatio="none"
            className="block w-full"
            style={{ height: Math.min(Math.max(height * 1.6, 72), 220) }}
          >
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={(tick / total) * 1000}
                x2={(tick / total) * 1000}
                y1={0}
                y2={height}
                stroke="var(--steel)"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {placed.map(({ call, index, start, end, lane: row }) => {
              const x = (start / total) * 1000;
              const w = Math.max(((end - start) / total) * 1000, 2.5);
              const color = hueOf(call.path);
              const failed = call.status >= 400;
              return (
                <rect
                  key={index}
                  className="fade"
                  x={x}
                  y={row * lane + 2}
                  width={call.cached ? 2.5 : w}
                  height={lane - 2}
                  rx={1}
                  fill={failed ? "none" : color}
                  fillOpacity={call.cached ? 0.45 : 0.9}
                  stroke={failed ? "var(--alert)" : "none"}
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: `${(start / total) * 700}ms` }}
                />
              );
            })}
          </svg>
          <div aria-hidden className="absolute inset-x-2 bottom-1 h-4">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2 text-[0.625rem] whitespace-nowrap text-ink-dim first:translate-x-0 last:-translate-x-full"
                style={{ left: `${(tick / total) * 100}%` }}
              >
                {tick >= 1000 ? `${tick / 1000} s` : `${tick} ms`}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="calls"
          className="btn self-start"
        >
          {open ? "Hide the calls" : "Every call"}
          <svg aria-hidden viewBox="0 0 12 12" className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
        <div id="calls" hidden={!open} className="max-h-[32rem] overflow-auto border border-steel">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-deck-hi">
              <tr>
                <th scope="col" className="tag px-3 py-2 text-ink-dim">
                  <span className="sr-only">Number</span>#
                </th>
                <th scope="col" className="tag px-3 py-2 text-ink-dim">
                  Call
                </th>
                <th scope="col" className="tag hidden px-3 py-2 text-right text-ink-dim sm:table-cell">
                  Status
                </th>
                <th scope="col" className="tag hidden px-3 py-2 text-right text-ink-dim sm:table-cell">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call, index) => (
                <tr key={index} className="border-t border-steel align-top">
                  <td className="px-3 py-2 text-ink-dim">{index + 1}</td>
                  <td className="px-3 py-2">
                    <p className="flex items-center gap-2 font-mono text-xs font-semibold">
                      <span aria-hidden className="size-2" style={{ background: hueOf(call.path) }} />
                      {call.path}
                    </p>
                    <p className="text-xs text-ink-soft sm:hidden">
                      {call.status} · {call.cached ? "Cached" : `${call.duration_ms} ms`}
                    </p>
                    <dl className="mt-1 grid gap-x-3 font-mono text-xs text-ink-soft sm:grid-cols-[auto_1fr]">
                      {Object.entries(call.params).map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt>{key}</dt>
                          <dd className="break-all text-ink">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </td>
                  <td className={`hidden px-3 py-2 text-right sm:table-cell ${call.status >= 400 ? "text-alert" : ""}`}>
                    {call.status}
                  </td>
                  <td className="hidden px-3 py-2 text-right whitespace-nowrap sm:table-cell">
                    {call.cached ? "Cached" : `${call.duration_ms} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// One figure about the run's calls: the value, its unit, and a note, with an optional gauge under it.
function Readout({
  name,
  value,
  unit,
  note,
  children,
}: {
  name: string;
  value: string;
  unit?: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-deck p-3">
      <dt className="tag text-ink-dim">{name}</dt>
      <dd className="flex flex-col gap-2">
        <span className="readout text-3xl">
          {value}
          {unit && <span className="ml-1 text-base text-ink-soft">{unit}</span>}
        </span>
        {children}
        <span className="text-xs text-ink-soft">{note}</span>
      </dd>
    </div>
  );
}
