"use client";

import { useEffect, useRef, useState } from "react";

import type { Analysis } from "./echo";

// How long each step of a run stays on screen at least, so one the engine finishes in a blink can still be read.
const HOLD_MS = 1600;
// How long the finished list of steps shows before the page opens.
const END_MS = 900;

// The leading steps that are done, in order: a later step done early waits for the ones before it.
function doneCount(analysis: Analysis): number {
  const next = analysis.steps.findIndex((step) => !step.done);
  return next === -1 ? analysis.steps.length : next;
}

type Pace = { id: string; shown: number };

// A running analysis as the run screen should show it: the engine's steps revealed one at a time, each held at least
// HOLD_MS, with each step's results (tastes, who was left out, guests, evidence) held back until its step shows done.
// Once the engine is done and every step has shown, the analysis passes through as it is. An analysis first seen
// finished, failed or with an error passes straight through: there is nothing to watch.
export function usePacedRun(analysis: Analysis | null): Analysis | null {
  const [pace, setPace] = useState<Pace | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  // When the run on screen last moved on a step.
  const moved = useRef<{ id: string; at: number } | null>(null);
  const id = analysis?.id ?? null;

  // A run seen running starts its pace from where the engine is, so a reload mid-run doesn't replay it.
  if (analysis && id !== seen) {
    setSeen(id);
    setPace(analysis.status === "running" ? { id: analysis.id, shown: doneCount(analysis) } : null);
  }

  const total = analysis?.steps.length ?? 0;
  // When the engine is done, one more beat past the last step: the finished list, then the page.
  const target = !analysis ? 0 : analysis.status === "done" ? total + 1 : doneCount(analysis);
  const pacing = pace !== null && pace.id === id && analysis?.status !== "failed";

  useEffect(() => {
    if (!pacing) return;
    if (moved.current?.id !== pace.id) moved.current = { id: pace.id, at: Date.now() };
    if (pace.shown >= target) return;
    const wait = Math.max(0, moved.current.at + (pace.shown >= total ? END_MS : HOLD_MS) - Date.now());
    const timer = setTimeout(() => {
      moved.current = { id: pace.id, at: Date.now() };
      setPace({ ...pace, shown: pace.shown + 1 });
    }, wait);
    return () => clearTimeout(timer);
  }, [pacing, pace, target, total]);

  if (!analysis || !pacing || pace.shown > total) return analysis;
  return held(analysis, pace.shown);
}

// The analysis with only its first `shown` steps done and their results.
function held(analysis: Analysis, shown: number): Analysis {
  const order = analysis.steps.map((step) => step.key);
  const done = (key: string) => {
    const index = order.indexOf(key);
    return index !== -1 && index < shown;
  };
  const guests = !done("score")
    ? []
    : done("evidence")
      ? analysis.guests
      : analysis.guests.map((guest) => ({ ...guest, evidence: null, idea: null }));
  return {
    ...analysis,
    status: "running",
    steps: analysis.steps.map((step, index) => ({ ...step, done: index < shown })),
    audience_map: done("map") ? analysis.audience_map : analysis.audience_map.map((row) => ({ ...row, items: [] })),
    left_out: done("clean") ? analysis.left_out : [],
    guests,
  };
}
