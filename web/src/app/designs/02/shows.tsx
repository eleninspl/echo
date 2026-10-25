"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { useFeatured } from "@/components/featured";
import { echo, type Analysis, type Featured, type Guest } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import styles from "./classes";
import { FRAME, GRID, percent } from "./grid";
import { Cover, SectionHead } from "./parts";

type Loaded = Analysis | "unavailable" | null;

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const count = featured.length;
  return (
    <section id="d02-shows" aria-labelledby="d02-shows-title" className={`${FRAME} pb-28 md:pb-40`}>
      <SectionHead
        number="03"
        id="d02-shows-title"
        title="Shows Echo has run"
        note={
          <>
            <span className="font-bold">
              {count} {count === 1 ? "show" : "shows"}
            </span>{" "}
            with every guest already scored. Open one to see the full list.
          </>
        }
      />
      <ol className="mt-12 border-b border-(--ink) md:mt-16">
        {featured.map((item, index) => (
          <ShowRow key={item.analysis_id} item={item} index={index} />
        ))}
      </ol>
    </section>
  );
}

function ShowRow({ item, index }: { item: Featured; index: number }) {
  const { show, analysis_id } = item;
  const [loaded, setLoaded] = useState<Loaded>(null);

  useEffect(() => {
    const controller = new AbortController();
    echo
      .analysis(analysis_id, controller.signal)
      .then(setLoaded)
      .catch(() => {
        if (!controller.signal.aborted) setLoaded("unavailable");
      });
    return () => controller.abort();
  }, [analysis_id]);

  const analysis = loaded && loaded !== "unavailable" && loaded.status === "done" ? loaded : null;
  const guests = analysis?.guests ?? [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const href = `/analyses/${encodeURIComponent(analysis_id)}`;

  return (
    <li
      className={`${styles.rise} group relative ${GRID} gap-y-8 border-t border-(--ink) py-8 md:py-12`}
      style={{ "--order": index } as CSSProperties}
    >
      <span className="col-span-1 text-[15px] font-bold tabular-nums">{String(index + 1).padStart(2, "0")}</span>
      <Cover show={show} className="col-span-2 w-full md:col-span-3" />

      <div className="col-span-full flex flex-col md:col-span-4 md:col-start-5">
        <h3 className="text-[clamp(2rem,3.6vw,3.25rem)] leading-[0.95] font-bold tracking-[-0.04em] group-hover:text-(--red)">
          <Link href={href} className={`${styles.row} after:absolute after:inset-0`}>
            {show.title}
          </Link>
        </h3>
        {show.description && <p className="mt-3 max-w-[40ch] text-[17px] leading-snug text-(--grey)">{show.description}</p>}

        <dl className={`${styles.figures} mt-8 grid grid-cols-2 gap-x-6 border-t-2 border-(--ink) pt-3`}>
          <Stat value={analysis ? guests.length : null} label="Guests scored" />
          <Stat value={analysis ? sweet : null} label={sweet === 1 ? "Sweet spot" : "Sweet spots"} signal />
        </dl>

        {analysis && guests.length > 0 && <TopGuests guests={guests.slice(0, 3)} />}
        {loaded !== null && !analysis && (
          <p className="mt-6 text-[15px] text-(--grey)">The numbers aren&apos;t available right now. The analysis still opens.</p>
        )}

        <span aria-hidden className="mt-8 inline-flex items-center gap-3 text-[17px] font-bold group-hover:text-(--red)">
          Open the analysis <span className={styles.arrow}>→</span>
        </span>
      </div>

      <div className="col-span-full md:col-span-4 md:col-start-9">
        <GuestField guests={guests} loading={loaded === null} explain={index === 0} />
      </div>
    </li>
  );
}

function Stat({ value, label, signal = false }: { value: number | null; label: string; signal?: boolean }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-2 text-[15px] font-bold">{label}</dt>
      <dd
        className={`text-[clamp(3.5rem,6.4vw,6.25rem)] leading-[0.82] font-bold tracking-[-0.06em] ${signal ? "text-(--red)" : ""}`}
      >
        {value ?? "–"}
      </dd>
    </div>
  );
}

function TopGuests({ guests }: { guests: Guest[] }) {
  return (
    <table className={`${styles.figures} mt-8 w-full border-collapse text-left`}>
      <caption className="sr-only">The top guests and their scores out of 100</caption>
      <thead>
        <tr className="text-[13px] font-bold">
          <th scope="col" className="pb-2 font-bold">
            Top guests
          </th>
          <th scope="col" className="w-12 pb-2 text-right font-bold">
            Fit
          </th>
          <th scope="col" className="w-16 pb-2 text-right font-bold">
            Love
          </th>
          <th scope="col" className="w-14 pb-2 text-right font-bold">
            Reach
          </th>
        </tr>
      </thead>
      <tbody>
        {guests.map((guest, index) => (
          <tr key={guest.ref} className="border-t border-(--hair) text-[17px]">
            <th scope="row" className="py-2 pr-2 text-left font-bold">
              <span className="mr-3 text-(--grey)">{index + 1}</span>
              {guest.name}
              {guest.label === "sweet_spot" && (
                <span className="ml-2 inline-block size-2.5 rounded-full bg-(--red) align-middle" title={LABELS.sweet_spot.name}>
                  <span className="sr-only">, {LABELS.sweet_spot.name}</span>
                </span>
              )}
            </th>
            <td className="py-2 text-right">{percent(guest.scores.fit)}</td>
            <td className="py-2 text-right">{percent(guest.scores.love_back)}</td>
            <td className="py-2 text-right">{percent(guest.scores.reach)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const FIELD = 400;
const LEFT = 30;
const TOP = 8;
const SPAN = 362;
const PAD = 22;
const TICKS = [0, 0.25, 0.5, 0.75, 1];

function across(value: number) {
  return LEFT + PAD + value * (SPAN - PAD * 2);
}

function up(value: number) {
  return TOP + SPAN - PAD - value * (SPAN - PAD * 2);
}

function GuestField({ guests, loading, explain }: { guests: Guest[]; loading: boolean; explain: boolean }) {
  const ordered = [...guests].reverse().sort((a, b) => Number(a.label === "sweet_spot") - Number(b.label === "sweet_spot"));
  const rank = new Map(guests.slice(0, 3).map((guest, index) => [guest.ref, index + 1]));
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative">
        <svg viewBox={`0 0 ${FIELD} ${FIELD}`} className="block h-auto w-full overflow-visible" aria-hidden>
          {TICKS.map((tick) => (
            <g key={tick} stroke="var(--hair)" strokeWidth="1">
              <line x1={across(tick)} y1={TOP} x2={across(tick)} y2={TOP + SPAN} />
              <line x1={LEFT} y1={up(tick)} x2={LEFT + SPAN} y2={up(tick)} />
            </g>
          ))}
          <line x1={LEFT} y1={TOP + SPAN} x2={LEFT + SPAN} y2={TOP + SPAN} stroke="var(--ink)" strokeWidth="2" />
          <line x1={LEFT} y1={TOP} x2={LEFT} y2={TOP + SPAN} stroke="var(--ink)" strokeWidth="2" />
          {ordered.map((guest, order) => {
            const sweet = guest.label === "sweet_spot";
            const cx = across(guest.scores.fit);
            const cy = up(guest.scores.love_back);
            const r = 5 + (guest.scores.reach ?? 0) * 17;
            const position = rank.get(guest.ref);
            return (
              <g key={guest.ref}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  className={styles.grow}
                  style={{ "--order": order } as CSSProperties}
                  fill={sweet ? "var(--red)" : "var(--paper)"}
                  fillOpacity={sweet ? 1 : 0.6}
                  stroke={sweet ? "var(--red)" : "var(--ink)"}
                  strokeWidth={sweet ? 0 : 1.75}
                />
                {position && (
                  <text x={cx + r + 5} y={cy + 5} fontSize="15" fontWeight="700" fill="var(--ink)">
                    {position}
                  </text>
                )}
              </g>
            );
          })}
          <text x={LEFT + SPAN} y={FIELD - 6} fontSize="14" fontWeight="700" textAnchor="end" fill="var(--ink)">
            Fit →
          </text>
          <text x="20" y={TOP} fontSize="14" fontWeight="700" textAnchor="end" fill="var(--ink)" transform={`rotate(-90 20 ${TOP})`}>
            Love back →
          </text>
        </svg>
        {loading && (
          <p className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-(--grey)">
            Loading the guests
          </p>
        )}
      </div>
      {explain ? (
        <figcaption className="mt-5 text-[13px] leading-snug text-(--grey)">
          Each circle is a guest. Across: fit. Up: love back. Size: reach. <span className="text-(--red)">Red</span>: a
          sweet spot.
        </figcaption>
      ) : (
        <figcaption className="sr-only">
          Each circle is a guest. Across: fit. Up: love back. Size: reach. Red: a sweet spot.
        </figcaption>
      )}
    </figure>
  );
}
