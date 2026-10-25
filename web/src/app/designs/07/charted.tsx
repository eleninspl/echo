"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";
import { score } from "@/lib/format";

import { EMBER, GOLD, MIST, PARCHMENT, round, SectionHead, SERIF, ShowMark, SILVER, SMALL_CAPS, StarGlyph, starPath, css } from "./atlas";

const GREEK = "αβγδεζηθικλμνξοπρστυφχψω";

const CX = 300;
const CY = 830;
const INNER = 420;
const OUTER = 790;
const SPAN = (22 * Math.PI) / 180;

type Reading = { state: "loading" } | { state: "ready"; analysis: Analysis } | { state: "missing" };

function place(fit: number, loveBack: number) {
  const angle = (Math.min(Math.max(fit, 0), 1) * 2 - 1) * SPAN;
  const radius = INNER + Math.min(Math.max(loveBack, 0), 1) * (OUTER - INNER);
  return { x: round(CX + radius * Math.sin(angle)), y: round(CY - radius * Math.cos(angle)) };
}

function arc(loveBack: number) {
  const from = place(0, loveBack);
  const to = place(1, loveBack);
  const radius = INNER + loveBack * (OUTER - INNER);
  return `M${from.x},${from.y} A${radius},${radius} 0 0 1 ${to.x},${to.y}`;
}

function ranked(guests: Guest[]): Guest[] {
  return [...guests].sort((a, b) => b.scores.echo - a.scores.echo);
}

export function ChartedShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const single = featured.length === 1;
  const columns = featured.length === 3 ? "lg:grid-cols-3" : "";
  return (
    <section aria-labelledby="charted" id="charted-shows" className="flex scroll-mt-8 flex-col gap-10">
      <SectionHead id="charted" eyebrow="Shows Echo has run" title="Open a chart Echo has already drawn">
        Each star is a guest Echo found, placed by fit and love back, sized by reach. Stars are lettered in
        Echo&apos;s order, α first.
      </SectionHead>
      <ul className={single ? "flex flex-col" : `grid grid-cols-1 gap-6 md:grid-cols-2 ${columns}`}>
        {featured.map((item, index) => (
          <ChartCard key={item.analysis_id} item={item} wide={single} order={index} />
        ))}
      </ul>
    </section>
  );
}

function ChartCard({ item, wide, order }: { item: Featured; wide: boolean; order: number }) {
  const { show, analysis_id } = item;
  const [reading, setReading] = useState<Reading>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(analysis_id, controller.signal)
      .then((analysis) => setReading({ state: "ready", analysis }))
      .catch(() => {
        if (!controller.signal.aborted) setReading({ state: "missing" });
      });
    return () => controller.abort();
  }, [analysis_id]);

  const guests = reading.state === "ready" && reading.analysis.status === "done" ? ranked(reading.analysis.guests) : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot");
  const href = `/analyses/${encodeURIComponent(analysis_id)}`;
  const plate = String(order + 1).padStart(2, "0");

  return (
    <li
      className={`${css.frame} ${css.corners} ${css.rise} relative`}
      style={{ "--order": order } as CSSProperties}
    >
      <div className={wide ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : "flex h-full flex-col"}>
        <figure
          className={`flex flex-col gap-3 p-5 sm:p-7 ${
            wide ? "border-b border-(--atlas-line) lg:border-r lg:border-b-0" : "border-b border-(--atlas-line)"
          }`}
        >
          <div className={`${SMALL_CAPS} flex items-baseline justify-between text-sm tracking-[0.2em] text-(--atlas-dim) lowercase`}>
            <span>Plate {plate}</span>
            <span>{guests.length ? `${guests.length} stars` : " "}</span>
          </div>
          <div className="flex flex-1 items-center">
            <GuestSky guests={guests} state={reading.state} />
          </div>
          <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-(--atlas-dim)">
            <span>Across: fit</span>
            <span>Up: love back</span>
            <span>Size: reach</span>
            <span className="inline-flex items-center gap-1.5">
              <StarGlyph size={10} /> Sweet spot
            </span>
          </figcaption>
        </figure>

        <div className="flex flex-1 flex-col gap-5 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <ShowMark show={show} size={wide ? 72 : 56} />
            <div className="min-w-0">
              <h3 className={`${SERIF} text-[clamp(1.6rem,2.6vw,2.25rem)] leading-[1.05] font-normal text-(--atlas-parchment)`}>
                <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-white">
                  {show.title}
                </Link>
              </h3>
              {show.description && (
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-(--atlas-mist)">{show.description}</p>
              )}
            </div>
          </div>

          <Tally reading={reading} guests={guests.length} sweet={sweet.length} />

          {guests.length > 0 && <Catalogue guests={guests.slice(0, wide ? 5 : 3)} />}

          <span
            aria-hidden
            className={`${SMALL_CAPS} mt-auto inline-flex items-center gap-2 self-start border-b border-(--atlas-gold-line) pb-1 text-[1.05rem] font-semibold tracking-[0.16em] text-(--atlas-gold) lowercase`}
          >
            Open the full chart <span className="tracking-normal">→</span>
          </span>
        </div>
      </div>
    </li>
  );
}

function Tally({ reading, guests, sweet }: { reading: Reading; guests: number; sweet: number }) {
  if (reading.state === "loading") {
    return <p className={`${css.pulse} text-sm text-(--atlas-dim)`}>Reading the chart…</p>;
  }
  if (guests === 0) {
    return <p className="text-sm text-(--atlas-dim)">Open it to see where this run stands.</p>;
  }
  return (
    <dl className="grid grid-cols-2 border-y border-(--atlas-line)">
      <div className="flex flex-col gap-0.5 py-3 pr-4">
        <dt className={`${SMALL_CAPS} text-sm tracking-[0.18em] text-(--atlas-dim) lowercase`}>Guests charted</dt>
        <dd className={`${SERIF} text-[2.6rem] leading-none font-light text-(--atlas-parchment) lining-nums`}>{guests}</dd>
      </div>
      <div className="flex flex-col gap-0.5 border-l border-(--atlas-line) py-3 pl-4">
        <dt className={`${SMALL_CAPS} text-sm tracking-[0.18em] text-(--atlas-dim) lowercase`}>In the sweet spot</dt>
        <dd className={`${SERIF} text-[2.6rem] leading-none font-light text-(--atlas-ember) lining-nums`}>{sweet}</dd>
      </div>
    </dl>
  );
}

function Catalogue({ guests }: { guests: Guest[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className={`${SMALL_CAPS} mb-2 text-left text-sm tracking-[0.18em] text-(--atlas-dim) lowercase`}>
        Brightest guests
      </caption>
      <thead>
        <tr className={`${SMALL_CAPS} text-[0.8rem] tracking-[0.14em] text-(--atlas-dim) lowercase`}>
          <th scope="col" className="w-7 pb-1.5 font-semibold">
            <span className="sr-only">Star</span>
          </th>
          <th scope="col" className="pb-1.5 font-semibold">
            Guest
          </th>
          <th scope="col" className="w-14 pb-1.5 text-right font-semibold">
            Fit
          </th>
          <th scope="col" className="w-14 pb-1.5 text-right font-semibold">
            Love
          </th>
          <th scope="col" className="w-14 pb-1.5 text-right font-semibold">
            Reach
          </th>
        </tr>
      </thead>
      <tbody>
        {guests.map((guest, index) => {
          const sweet = guest.label === "sweet_spot";
          return (
            <tr key={guest.ref} className="border-t border-(--atlas-line) align-baseline">
              <td className={`${SERIF} py-2 text-lg italic ${sweet ? "text-(--atlas-ember)" : "text-(--atlas-gold)"}`}>
                {GREEK[index] ?? index + 1}
              </td>
              <th scope="row" className="py-2 pr-2 font-normal">
                <span className={`${SERIF} flex items-center gap-1.5 text-[1.15rem] leading-tight text-(--atlas-parchment)`}>
                  {guest.name}
                  {sweet && <StarGlyph size={13} className="translate-y-[-1px]" />}
                </span>
                {guest.description && (
                  <span className="block truncate text-xs text-(--atlas-dim)">{guest.description}</span>
                )}
              </th>
              <td className="py-2 text-right text-sm text-(--atlas-mist) tabular-nums">{score(guest.scores.fit)}</td>
              <td className="py-2 text-right text-sm text-(--atlas-mist) tabular-nums">{score(guest.scores.love_back)}</td>
              <td className="py-2 text-right text-sm text-(--atlas-mist) tabular-nums">
                {guest.scores.reach === null ? "–" : score(guest.scores.reach)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GuestSky({ guests, state }: { guests: Guest[]; state: Reading["state"] }) {
  const stars = guests.map((guest, index) => {
    const point = place(guest.scores.fit, guest.scores.love_back);
    const radius = guest.scores.reach === null ? 3.2 : round(3.4 + guest.scores.reach * 7);
    return { guest, index, ...point, radius, sweet: guest.label === "sweet_spot" };
  });
  const sweet = stars.filter((star) => star.sweet).sort((a, b) => a.x - b.x);
  const labels = stars.map((star) => {
    const text = star.sweet ? `${GREEK[star.index] ?? star.index + 1} ${star.guest.name}` : (GREEK[star.index] ?? "");
    const width = text.length * 7.6;
    const rightStart = star.x + star.radius + 5;
    const crowded = stars.some(
      (other) =>
        other !== star &&
        other.x > rightStart - 4 &&
        other.x < rightStart + width + 4 &&
        Math.abs(other.y - star.y) < 12,
    );
    const flip = crowded || rightStart + width > 630;
    return { key: star.guest.ref, text, sweet: star.sweet, x: flip ? star.x - star.radius - 5 : rightStart, y: star.y + 4.5, anchor: flip ? ("end" as const) : ("start" as const) };
  });
  const loveTicks = [0, 0.5, 1];
  const fitTicks = [0, 0.25, 0.5, 0.75, 1];
  const fitAxisLabel = place(0.5, 0);

  return (
    <svg
      viewBox="-34 0 668 472"
      role="img"
      aria-label={
        guests.length
          ? `${guests.length} guests charted by fit and love back, ${sweet.length} in the sweet spot.`
          : "The chart is loading."
      }
      className="block h-auto w-full"
    >
      <defs>
        <radialGradient id="sky-glow">
          <stop offset="0%" stopColor={EMBER} stopOpacity="0.5" />
          <stop offset="40%" stopColor={EMBER} stopOpacity="0.14" />
          <stop offset="100%" stopColor={EMBER} stopOpacity="0" />
        </radialGradient>
      </defs>

      <path
        d={`${arc(1)} L${place(1, 0).x},${place(1, 0).y} A${INNER},${INNER} 0 0 0 ${place(0, 0).x},${place(0, 0).y} Z`}
        fill="#0e1430"
        fillOpacity="0.8"
        stroke={GOLD}
        strokeOpacity="0.55"
      />
      <g fill="none" stroke={SILVER} strokeOpacity="0.14" strokeDasharray="2 5">
        {[0.25, 0.5, 0.75].map((value) => (
          <path key={value} d={arc(value)} />
        ))}
        {[0.25, 0.5, 0.75].map((value) => {
          const from = place(value, 0);
          const to = place(value, 1);
          return <line key={value} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
      </g>

      <g stroke={GOLD} strokeOpacity="0.55">
        {Array.from({ length: 21 }, (_, index) => {
          const value = index / 20;
          const inner = place(value, 0);
          const radius = INNER - (index % 5 === 0 ? 9 : 5);
          const angle = (value * 2 - 1) * SPAN;
          return (
            <line
              key={index}
              x1={inner.x}
              y1={inner.y}
              x2={round(CX + radius * Math.sin(angle))}
              y2={round(CY - radius * Math.cos(angle))}
            />
          );
        })}
      </g>

      <g fill={MIST} fontSize="13" textAnchor="middle" className="tabular-nums">
        {fitTicks.map((value) => {
          const angle = (value * 2 - 1) * SPAN;
          const radius = INNER - 22;
          return (
            <text key={value} x={round(CX + radius * Math.sin(angle))} y={round(CY - radius * Math.cos(angle) + 4)}>
              {Math.round(value * 100)}
            </text>
          );
        })}
      </g>
      <text
        x={fitAxisLabel.x}
        y={fitAxisLabel.y + 46}
        textAnchor="middle"
        fill={GOLD}
        fontSize="15"
        letterSpacing="2.4"
        className="font-(family-name:--font-atlas-sc)"
      >
        fit
      </text>

      <g fill={MIST} fontSize="13" textAnchor="end" className="tabular-nums">
        {loveTicks.map((value) => {
          const point = place(0, value);
          return (
            <text key={value} x={point.x - 8} y={point.y + 4}>
              {Math.round(value * 100)}
            </text>
          );
        })}
      </g>
      <text
        transform={`translate(${place(0, 0.5).x - 30} ${place(0, 0.5).y}) rotate(-112)`}
        textAnchor="middle"
        fill={GOLD}
        fontSize="15"
        letterSpacing="2.4"
        className="font-(family-name:--font-atlas-sc)"
      >
        love back
      </text>

      {state === "loading" && (
        <text
          x={CX}
          y="250"
          textAnchor="middle"
          fill={MIST}
          fontSize="20"
          fontStyle="italic"
          className={`font-(family-name:--font-atlas-serif) ${css.pulse}`}
        >
          Plotting the guests…
        </text>
      )}
      {state !== "loading" && guests.length === 0 && (
        <text
          x={CX}
          y="250"
          textAnchor="middle"
          fill={MIST}
          fontSize="20"
          fontStyle="italic"
          className="font-(family-name:--font-atlas-serif)"
        >
          No guests to plot yet
        </text>
      )}

      {sweet.length > 1 && (
        <polyline
          points={sweet.map((star) => `${star.x},${star.y}`).join(" ")}
          fill="none"
          stroke={EMBER}
          strokeOpacity="0.5"
          strokeWidth="1"
        />
      )}

      {stars.map((star) =>
        star.sweet ? (
          <g key={star.guest.ref}>
            <circle cx={star.x} cy={star.y} r={star.radius * 3.6} fill="url(#sky-glow)" />
            <path d={starPath(star.x, star.y, star.radius + 1.5)} fill={EMBER} />
          </g>
        ) : star.guest.scores.reach === null ? (
          <circle key={star.guest.ref} cx={star.x} cy={star.y} r={star.radius} fill="none" stroke={SILVER} strokeWidth="1.2" />
        ) : (
          <path key={star.guest.ref} d={starPath(star.x, star.y, star.radius)} fill={SILVER} opacity="0.85" />
        ),
      )}

      <g
        fontSize="15"
        className="font-(family-name:--font-atlas-serif)"
        fontStyle="italic"
        stroke="#0e1430"
        strokeWidth="4"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {labels.map((label) => (
          <text
            key={label.key}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor}
            fill={label.sweet ? PARCHMENT : MIST}
            opacity={label.sweet ? 1 : 0.85}
          >
            {label.text}
          </text>
        ))}
      </g>
    </svg>
  );
}
