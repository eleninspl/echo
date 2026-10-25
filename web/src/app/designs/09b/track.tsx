"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";

import type { Featured, Guest, Label } from "@/lib/echo";

import { Cover } from "./cover";
import { finishedGuests, useAnalysis, useFeatured } from "./data";
import { styles } from "./styles";
import {
  BarRects,
  barsFor,
  grain,
  levelsOf,
  PART_NAME,
  PARTS,
  Reflection,
  round,
  segmentBars,
  TONE,
  type Levels,
  type Paint,
  type Part,
} from "./wave";

export const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

const WAVE_HEIGHT = "h-[150px] sm:h-[210px] lg:h-[248px]";
const WAVE_ROOM = "pt-[150px] sm:pt-[210px] lg:pt-[248px]";
const PLACEHOLDER_COUNT = 14;

export const out100 = (value: number) => String(Math.round(value * 100));

function useBoxSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function gapFor(width: number) {
  if (width >= 1024) return 16;
  if (width >= 640) return 8;
  return 4;
}

type Stretch = { levels: Levels; paint: Paint; glow: boolean };

function WaveDrawing({
  stretches,
  width,
  height,
  active,
  quiet = false,
}: {
  stretches: Stretch[];
  width: number;
  height: number;
  active: number | null;
  quiet?: boolean;
}) {
  if (!width || !height) return null;
  const count = stretches.length;
  const gap = gapFor(width);
  const segment = (width - gap * (count - 1)) / count;
  const bars = barsFor(segment, width >= 640 ? 5 : 2.4);
  const baseline = round(height * 0.68);
  const room = baseline - 6;
  const drawn = stretches.map((stretch, index) => {
    const left = index * (segment + gap);
    return { ...stretch, left, bars: segmentBars(stretch.levels, left, segment, bars, index + 1) };
  });
  const lit = active === null ? null : drawn[active];

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`absolute inset-0 ${quiet ? styles.waiting : ""}`}
      focusable="false"
    >
      <defs>
        <Reflection id="v9b-track" width={width} baseline={baseline} height={height} strength={0.38} />
        <filter id="v9b-track-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={width >= 640 ? 14 : 6} />
        </filter>
        <linearGradient id="v9b-track-column" x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0" stopColor="#ff8fb4" stopOpacity={0.12} />
          <stop offset="0.68" stopColor="#ff8fb4" stopOpacity={0.05} />
          <stop offset="1" stopColor="#ff8fb4" stopOpacity={0} />
        </linearGradient>
      </defs>

      {lit && (
        <rect
          x={round(lit.left - gap / 2)}
          y={0}
          width={round(segment + gap)}
          height={height}
          rx={Math.min(16, segment / 4)}
          fill="url(#v9b-track-column)"
        />
      )}

      {drawn.map((stretch, index) => (
        <line
          key={index}
          x1={round(stretch.left)}
          x2={round(stretch.left + segment)}
          y1={baseline}
          y2={baseline}
          stroke={stretch.glow ? "#6b3a5c" : "#47304d"}
          strokeWidth={1}
        />
      ))}

      {lit && (
        <line
          x1={round(lit.left + segment / 2)}
          x2={round(lit.left + segment / 2)}
          y1={0}
          y2={baseline}
          stroke="#fff4ec"
          strokeOpacity={0.4}
          strokeWidth={1.5}
          strokeDasharray="2 5"
          strokeLinecap="round"
        />
      )}

      <g filter="url(#v9b-track-glow)" opacity={0.85}>
        {drawn
          .filter((stretch) => stretch.glow)
          .map((stretch, index) => (
            <BarRects key={index} bars={stretch.bars} paint="sweet" baseline={baseline} room={room} />
          ))}
      </g>

      <g className="v9b-track-bars">
        {drawn.map((stretch, index) => (
          <BarRects
            key={index}
            bars={stretch.bars}
            paint={index === active && stretch.paint === "unlit" ? "lit" : stretch.paint}
            baseline={baseline}
            room={room}
          />
        ))}
      </g>

      <g mask="url(#v9b-track-mask)" className="v9b-track-bars">
        {drawn.map((stretch, index) => (
          <BarRects
            key={index}
            bars={stretch.bars}
            paint={index === active && stretch.paint === "unlit" ? "lit" : stretch.paint}
            baseline={baseline}
            room={room}
            below
          />
        ))}
      </g>
    </svg>
  );
}

export function GuestTrack() {
  const featured = useFeatured();
  const [chosen, setChosen] = useState(0);
  const item = featured?.[chosen] ?? featured?.[0] ?? null;
  const loaded = useAnalysis(item?.analysis_id ?? null);
  const guests = finishedGuests(loaded);
  const waiting = featured === null || (item !== null && loaded === null);

  return (
    <figure className="flex flex-col gap-5 sm:gap-6">
      {item && guests.length > 0 ? (
        <>
          <TrackHead item={item} guests={guests} featured={featured ?? []} chosen={chosen} onChoose={setChosen} />
          <LiveWave key={item.analysis_id} item={item} guests={guests} />
        </>
      ) : (
        <QuietWave waiting={waiting} />
      )}
    </figure>
  );
}

function TrackHead({
  item,
  guests,
  featured,
  chosen,
  onChoose,
}: {
  item: Featured;
  guests: Guest[];
  featured: Featured[];
  chosen: number;
  onChoose: (index: number) => void;
}) {
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const href = `/analyses/${encodeURIComponent(item.analysis_id)}`;
  return (
    <figcaption className="grid grid-cols-1 items-center gap-x-8 gap-y-3 xl:grid-cols-[fit-content(24rem)_minmax(16rem,1fr)_auto] xl:gap-y-4">
      <div className="flex min-w-0 items-center gap-4">
        <Cover show={item.show} size={52} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-(--v9b-soft)">A show Echo has run</p>
          <p className={`${styles.display} truncate text-xl leading-tight font-semibold sm:text-2xl`}>
            {item.show.title}
          </p>
        </div>
      </div>
      <p className="max-w-[46ch] text-base leading-snug text-pretty text-(--v9b-soft) sm:text-lg xl:border-l xl:border-(--v9b-line) xl:pl-8">
        {guests.length} guests, best first, one stretch of wave each.{" "}
        {sweet > 0 ? (
          <span className={`${styles.gradientText} font-semibold xl:block`}>
            {sweet} of {guests.length} in the sweet spot.
          </span>
        ) : (
          <span className="xl:block">No guest clears all three yet. These come closest.</span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 xl:justify-self-end">
        <Legend />
        <OpenLink href={href} className="hidden sm:inline-flex" />
      </div>
      {featured.length > 1 && (
        <div role="group" aria-label="Choose a show to draw" className="flex flex-wrap gap-2 xl:col-span-3">
          {featured.map((entry, index) => (
            <button
              key={entry.analysis_id}
              type="button"
              aria-pressed={index === chosen}
              onClick={() => onChoose(index)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                index === chosen
                  ? "bg-(--v9b-ink) text-(--v9b-on-hue)"
                  : "text-(--v9b-soft) ring-1 ring-(--v9b-line) hover:text-(--v9b-ink)"
              }`}
            >
              {entry.show.title}
            </button>
          ))}
        </div>
      )}
    </figcaption>
  );
}

export function Legend({ className = "" }: { className?: string }) {
  return (
    <ul aria-label="Key" className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold ${className}`}>
      {PARTS.map((part) => (
        <li key={part} className="inline-flex items-center gap-2" style={{ color: TONE[part] }}>
          <span aria-hidden className="h-3.5 w-1.5 rounded-full" style={{ background: TONE[part] }} />
          {PART_NAME[part]}
        </li>
      ))}
      <li className="inline-flex items-center gap-2 text-(--v9b-ink)">
        <span aria-hidden className={`${styles.gradientFill} h-3.5 w-5 rounded-full`} />
        Sweet spot
      </li>
    </ul>
  );
}

export function OpenLink({ href, className = "" }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`group items-center gap-2 rounded-full py-1 font-semibold text-(--v9b-ink) ${className}`}
    >
      Open the analysis
      <span
        aria-hidden
        className={`${styles.gradientFill} flex size-8 items-center justify-center rounded-full text-(--v9b-on-hue) transition-transform group-hover:translate-x-0.5`}
      >
        <Arrow />
      </span>
    </Link>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" focusable="false" aria-hidden>
      <path
        d="M4 10h11m-4-4 4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function describeGuest(guest: Guest, rank: number) {
  const { fit, love_back, reach } = guest.scores;
  return `${rank}. ${guest.name}, ${LABEL_NAME[guest.label]}. Fit ${out100(fit)}, love back ${out100(love_back)}, reach ${
    reach === null ? "not scored" : out100(reach)
  }. Open the analysis.`;
}

function LiveWave({ item, guests }: { item: Featured; guests: Guest[] }) {
  const box = useRef<HTMLDivElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const pointer = useRef<string>("mouse");
  const { width, height } = useBoxSize(box);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const active = hovered ?? selected;
  const count = guests.length;
  const gap = gapFor(width);
  const segment = width ? (width - gap * (count - 1)) / count : 0;
  const center = active * (segment + gap) + segment / 2;
  const cardWidth = width >= 640 ? Math.min(540, width) : width;
  const cardLeft = width >= 640 ? Math.max(0, Math.min(width - cardWidth, center - cardWidth / 2)) : 0;
  const href = `/analyses/${encodeURIComponent(item.analysis_id)}`;

  const stretches: Stretch[] = guests.map((guest) => ({
    levels: levelsOf(guest),
    paint: guest.label === "sweet_spot" ? "sweet" : "unlit",
    glow: guest.label === "sweet_spot",
  }));

  function move(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    const targets: Record<string, number> = {
      ArrowRight: Math.min(count - 1, index + 1),
      ArrowLeft: Math.max(0, index - 1),
      Home: 0,
      End: count - 1,
    };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setSelected(next);
    links.current[next]?.focus();
  }

  function tap(event: MouseEvent<HTMLAnchorElement>, index: number) {
    if (pointer.current !== "mouse" && index !== selected) {
      event.preventDefault();
      setSelected(index);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <NowPlaying
        guest={guests[active]}
        rank={active + 1}
        left={cardLeft}
        width={cardWidth}
        notch={Math.max(18, Math.min(cardWidth - 18, center - cardLeft))}
        ready={width > 0}
        hintOnRight={center < width / 2}
      />
      <div className="relative">
        <div ref={box} className={`absolute inset-x-0 top-0 ${WAVE_HEIGHT}`}>
          <WaveDrawing stretches={stretches} width={width} height={height} active={active} />
        </div>
        <ol
          aria-label={`Guests for ${item.show.title}, best first`}
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, columnGap: gap }}
          onMouseLeave={() => setHovered(null)}
        >
          {guests.map((guest, index) => {
            const sweet = guest.label === "sweet_spot";
            const on = index === active;
            return (
              <li key={guest.ref} className="min-w-0">
                <Link
                  ref={(node) => {
                    links.current[index] = node;
                  }}
                  href={href}
                  tabIndex={index === selected ? 0 : -1}
                  aria-label={describeGuest(guest, index + 1)}
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setSelected(index)}
                  onKeyDown={(event) => move(event, index)}
                  onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
                    pointer.current = event.pointerType;
                  }}
                  onClick={(event) => tap(event, index)}
                  className={`flex flex-col items-stretch gap-1.5 rounded-xl ${WAVE_ROOM} pb-1 text-center`}
                >
                  <span
                    aria-hidden
                    className={`mx-auto h-[3px] w-[70%] rounded-full ${sweet ? styles.gradientFill : on ? "bg-(--v9b-dim)" : "bg-transparent"}`}
                  />
                  <span
                    aria-hidden
                    className={`${styles.display} text-xs font-semibold tabular-nums sm:text-sm ${
                      on ? "text-(--v9b-ink)" : sweet ? "text-(--v9b-soft)" : "text-(--v9b-dim)"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    aria-hidden
                    className={`hidden truncate px-0.5 text-[13px] leading-tight sm:block lg:text-sm ${
                      on ? "font-semibold text-(--v9b-ink)" : sweet ? "text-(--v9b-soft)" : "text-(--v9b-dim)"
                    }`}
                  >
                    {guest.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <OpenLink href={href} className="mt-2 inline-flex self-start sm:hidden" />
    </div>
  );
}

function NowPlaying({
  guest,
  rank,
  left,
  width,
  notch,
  ready,
  hintOnRight,
}: {
  guest: Guest;
  rank: number;
  left: number;
  width: number;
  notch: number;
  ready: boolean;
  hintOnRight: boolean;
}) {
  const sweet = guest.label === "sweet_spot";
  const { fit, love_back, reach } = guest.scores;
  const values: [Part, string, number | null][] = [
    ["fit", PART_NAME.fit, fit],
    ["love", PART_NAME.love, love_back],
    ["reach", PART_NAME.reach, reach],
  ];
  return (
    <div className="relative min-h-[148px] sm:min-h-[88px]">
      <p
        className={`absolute bottom-4 hidden text-sm whitespace-nowrap text-(--v9b-dim) lg:block ${
          hintOnRight ? "right-0 text-right" : "left-0"
        } ${ready ? "" : "opacity-0"}`}
      >
        Hover or tab through the wave to read each guest.
      </p>
      <div
        aria-hidden
        className={`v9b-now relative flex flex-col gap-3 rounded-[22px] bg-(--v9b-plum) px-4 py-3 shadow-[0_24px_60px_-28px_rgb(255_92_147/0.6)] ring-1 sm:flex-row sm:items-center sm:gap-5 sm:pr-5 ${
          sweet ? "ring-(--v9b-love)/50" : "ring-(--v9b-line)"
        } ${ready ? "" : "opacity-0"}`}
        style={{ marginLeft: left, width: width || undefined }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={`${styles.display} flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold tabular-nums ${
              sweet ? `${styles.gradientFill} text-(--v9b-on-hue)` : "bg-(--v9b-plum-hi) text-(--v9b-ink)"
            }`}
          >
            {rank}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-baseline gap-2.5">
              <span className={`${styles.display} truncate text-lg leading-tight font-semibold`}>{guest.name}</span>
              <span
                className={`shrink-0 text-xs font-bold tracking-[0.08em] uppercase ${
                  sweet ? styles.gradientText : "text-(--v9b-dim)"
                }`}
              >
                {LABEL_NAME[guest.label]}
              </span>
            </span>
            {guest.description && (
              <span className="truncate text-sm text-(--v9b-soft)">{guest.description}</span>
            )}
          </span>
        </div>
        <dl className="flex shrink-0 gap-5 border-t border-(--v9b-line) pt-2.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
          {values.map(([part, name, value]) => (
            <div key={part} className="flex flex-col">
              <dt className="text-xs font-semibold" style={{ color: TONE[part] }}>
                {name}
              </dt>
              <dd className={`${styles.display} text-xl leading-tight font-semibold tabular-nums`}>
                {value === null ? "–" : out100(value)}
              </dd>
            </div>
          ))}
        </dl>
        <span
          className="absolute -bottom-[7px] hidden size-3.5 rotate-45 rounded-[3px] border-r border-b bg-(--v9b-plum) sm:block"
          style={{
            left: notch - 7,
            borderColor: sweet ? "rgb(255 92 147 / 0.5)" : "#47304d",
          }}
        />
      </div>
    </div>
  );
}

function QuietWave({ waiting }: { waiting: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const { width, height } = useBoxSize(box);
  const stretches: Stretch[] = Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => ({
    levels: [0.25 + 0.55 * grain(index + 5), 0.25 + 0.55 * grain(index + 41), 0.2 + 0.6 * grain(index + 83)],
    paint: "quiet",
    glow: false,
  }));
  return (
    <>
      <figcaption className="flex flex-col gap-1">
        <p className={`${styles.display} text-xl font-semibold sm:text-2xl`}>Your guests, as one wave</p>
        <p className="max-w-[60ch] text-base text-(--v9b-soft)">
          {waiting
            ? "Loading the latest run."
            : "Pick your show above. Echo draws every guest it finds here, best first: one stretch of wave each, its three swells fit, love back and reach."}
        </p>
      </figcaption>
      <div ref={box} className={`relative ${WAVE_HEIGHT}`}>
        <WaveDrawing stretches={stretches} width={width} height={height} active={null} quiet />
      </div>
    </>
  );
}
