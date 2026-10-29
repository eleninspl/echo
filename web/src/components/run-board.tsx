import type { Step } from "@/lib/echo";

import { Lamp, SectionHead } from "./hud";

// The run's steps beside echo rings sounding while Echo works. Fixed heights, so polling never moves
// the page.
export function Rundown({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((step) => !step.done);
  const done = steps.filter((step) => step.done).length;
  return (
    <section aria-labelledby="running" className="flex flex-col gap-4">
      <SectionHead id="running" title="Echo is running">
        <span className="text-accent">
          {done} / {steps.length}
        </span>
      </SectionHead>
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <ol className="flex flex-col">
          {steps.map((step, index) => {
            const on = index === current;
            return (
              <li
                key={step.key}
                aria-current={on ? "step" : undefined}
                className={`flex h-12 items-center gap-4 border-b border-steel last:border-b-0 ${step.done || on ? "text-ink" : "text-ink-dim"}`}
              >
                <span className="readout w-6 text-sm text-ink-dim">{String(index + 1).padStart(2, "0")}</span>
                <Lamp
                  color={step.done ? "var(--ink-soft)" : "var(--accent)"}
                  on={step.done || on}
                  className={`size-2.5 ${on ? "pulse" : ""}`}
                />
                <span className={on ? "font-semibold" : ""}>{step.label}</span>
                <span className="sr-only">{step.done ? "(done)" : on ? "(running)" : "(waiting)"}</span>
              </li>
            );
          })}
        </ol>
        <Radar label={current >= 0 ? steps[current].label : "Finishing"} done={done} total={steps.length} />
      </div>
      <p className="text-sm text-ink-soft">It usually takes under a minute.</p>
      <p aria-live="polite" className="sr-only">
        {current >= 0 ? `${steps[current].label}, step ${current + 1} of ${steps.length}.` : "Finishing."}
      </p>
    </section>
  );
}

// Echo rings sounding from the show while it works, and the steps done as an arc around them.
function Radar({ label, done, total }: { label: string; done: number; total: number }) {
  const r = 120;
  const arc = 2 * Math.PI * (r + 14);
  return (
    <div aria-hidden className="relative mx-auto size-72 shrink-0">
      <svg viewBox="-150 -150 300 300" className="absolute inset-0 size-full overflow-visible">
        {[0.33, 0.66, 1].map((t) => (
          <circle key={t} r={r * t} fill="none" stroke="var(--steel)" />
        ))}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="ring"
            r="12"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${i * 0.93}s` }}
          />
        ))}
        <circle r="7" fill="var(--accent)" />
        <circle r={r + 14} fill="none" stroke="var(--sweet)" strokeOpacity="0.16" strokeWidth="5" />
        <circle
          r={r + 14}
          fill="none"
          stroke="var(--sweet)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(arc * done) / Math.max(total, 1)} ${arc}`}
          transform="rotate(-90)"
          style={{ transition: "stroke-dasharray 600ms var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-x-0 -bottom-2 flex flex-col items-center">
        <span className="tag text-accent">{label}</span>
      </div>
    </div>
  );
}
