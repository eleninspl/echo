"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import type { Guest } from "@/lib/echo";

import { styles } from "./styles";
import { useAnalysis } from "./use-analysis";
import { grain, MUTED, round, toneAt, voice } from "./wave";

const WIDTH = 1200;
const HEIGHT = 120;

type Swell = { fit: number; loveBack: number; reach: number | null; lit: boolean };

const fromGuest = (guest: Guest): Swell => ({
  fit: guest.scores.fit,
  loveBack: guest.scores.love_back,
  reach: guest.scores.reach,
  lit: guest.label === "sweet_spot",
});

const STAND_IN: Swell[] = Array.from({ length: 16 }, (_, index) => {
  const fade = 1 - index / 22;
  return {
    fit: (0.35 + 0.6 * grain(index + 3)) * fade,
    loveBack: (0.35 + 0.6 * grain(index + 17)) * fade,
    reach: (0.35 + 0.6 * grain(index + 29)) * fade,
    lit: index < 3,
  };
});

function Strip({ swells, perGuest, className }: { swells: Swell[]; perGuest: number; className: string }) {
  const gap = perGuest > 8 ? 2 : 1;
  const slots = swells.length * (perGuest + gap) - gap;
  const step = WIDTH / slots;
  const thickness = step * 0.5;
  const middle = HEIGHT / 2;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={className}
      focusable="false"
    >
      <line
        x1={0}
        x2={WIDTH}
        y1={middle}
        y2={middle}
        stroke="#36253d"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {swells.flatMap((swell, column) =>
        voice(swell.fit, swell.loveBack, swell.reach, perGuest, column * 7).map((bar, index) => {
          const slot = column * (perGuest + gap) + index;
          const size = bar.unscored ? thickness * 1.4 : Math.max(2, bar.level * (HEIGHT - 4));
          return (
            <rect
              key={slot}
              x={round(slot * step + (step - thickness) / 2)}
              y={round(middle - size / 2)}
              width={round(thickness)}
              height={round(size)}
              rx={round(thickness / 2)}
              fill={swell.lit && !bar.unscored ? toneAt(bar.position) : MUTED}
              className={styles.swell}
              style={{ "--at": round(slot / slots) } as CSSProperties}
            />
          );
        }),
      )}
    </svg>
  );
}

function Strips({ swells }: { swells: Swell[] }) {
  return (
    <div className="relative h-20 w-full sm:h-28">
      <Strip swells={swells} perGuest={11} className="absolute inset-0 size-full max-sm:invisible" />
      <Strip swells={swells} perGuest={6} className="absolute inset-0 size-full sm:invisible" />
    </div>
  );
}

function sweetLine(count: number) {
  if (count === 0) return "None reached the sweet spot.";
  if (count === 1) return "The one in colour is its sweet spot.";
  return `The ${count} in colour are its sweet spots.`;
}

export function Horizon() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const { analysis, settled } = useAnalysis(first?.analysis_id ?? null);
  const waiting = featured === null || (first !== null && !settled);
  const guests = analysis?.status === "done" && analysis.guests.length ? analysis.guests : null;

  if (waiting) return <div aria-hidden className="h-[8.5rem] sm:h-[10rem]" />;

  if (!first || !guests) {
    return (
      <div aria-hidden className="h-[8.5rem] sm:h-[10rem]">
        <Strips swells={STAND_IN} />
      </div>
    );
  }

  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;

  return (
    <figure className="flex flex-col gap-6">
      <Strips swells={guests.map(fromGuest)} />
      <figcaption
        className={`${styles.after} flex flex-col gap-2 text-[0.9375rem] leading-relaxed text-(--v9e-dim) sm:flex-row sm:items-baseline sm:justify-between sm:gap-10`}
      >
        <p>
          <span className="font-semibold text-(--v9e-ink)">{first.show.title}</span>, as Echo scored it:{" "}
          {guests.length} guests, best first, one wave each. {sweetLine(sweet)}
        </p>
        <Link
          href={`/analyses/${encodeURIComponent(first.analysis_id)}`}
          className="shrink-0 font-semibold text-(--v9e-ink) underline decoration-(--v9e-line-hi) underline-offset-[6px] transition-colors hover:decoration-(--v9e-ink)"
        >
          Open this run
        </Link>
      </figcaption>
    </figure>
  );
}
