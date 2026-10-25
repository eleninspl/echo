"use client";

import Link from "next/link";

import { useFeatured } from "@/components/featured";
import type { Featured, Guest } from "@/lib/echo";

import { Cover } from "./cover";
import { useAnalysis } from "./load";
import { DoubleUnderline, Note } from "./marks";
import {
  callFirst,
  fewNewEars,
  INK,
  LABEL_NAME,
  out100,
  PARTS,
  plural,
} from "./scores";
import { Swell } from "./swell";

const COLUMNS =
  "grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 lg:grid-cols-[96px_32px_minmax(0,1fr)_282px_150px] lg:gap-x-4 xl:grid-cols-[128px_36px_minmax(0,1fr)_336px_196px] xl:gap-x-5";

const LEAD_ROWS = 6;

export function RunShows() {
  const featured = useFeatured();
  if (!featured?.length) return null;
  const [lead, ...others] = featured;

  return (
    <section
      id="w6-runs"
      aria-labelledby="w6-runs-title"
      className="mx-auto w-full max-w-[1200px] scroll-mt-6 px-4 sm:px-8 xl:px-0"
    >
      <div className="border-t-[1.5px] border-(--w6-ink) pt-14 pb-24 lg:pt-20">
        <div className="max-w-[640px]">
          <h2
            id="w6-runs-title"
            className="w6-serif text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] font-medium tracking-[-0.018em]"
          >
            Shows Echo has run
          </h2>
          <p className="w6-serif mt-4 text-[1.1875rem] leading-relaxed text-(--w6-soft)">
            The guests Echo found for each show, best first. Open a run to see
            every guest and what drives each score.
          </p>
        </div>
        <LeadSheet item={lead} />
        {others.length > 0 && (
          <ul className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
            {others.map((item) => (
              <SmallSheet key={item.analysis_id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function runLink(id: string) {
  return `/analyses/${encodeURIComponent(id)}`;
}

function LeadSheet({ item }: { item: Featured }) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;
  const shown = guests.slice(0, LEAD_ROWS);
  const first = callFirst(shown);
  const unscored = shown.findIndex((guest) => guest.scores.reach === null);
  const safe = fewNewEars(shown);

  return (
    <article
      aria-labelledby="w6-lead-title"
      className="mt-12 border border-(--w6-rule-strong) bg-(--w6-paper) lg:mt-14"
    >
      <header
        className={`${COLUMNS} gap-y-6 px-4 pt-6 pb-6 sm:px-8 sm:pt-8 lg:px-8 lg:pt-10 lg:pb-8 xl:px-10`}
      >
        <div className="col-span-2 flex min-w-0 items-start gap-4 sm:gap-5 lg:col-span-2 lg:col-start-2">
          <Cover show={show} size={72} />
          <div className="min-w-0">
            <h3
              id="w6-lead-title"
              className="w6-serif text-[1.75rem] leading-tight font-medium tracking-[-0.01em] sm:text-[2rem]"
            >
              <Link href={runLink(analysis_id)} className="hover:underline">
                {show.title}
              </Link>
            </h3>
            {show.description && (
              <p className="mt-1.5 max-w-[48ch] text-[0.9375rem] leading-snug text-balance text-(--w6-soft)">
                {show.description}
              </p>
            )}
          </div>
        </div>
        <dl className="col-span-2 flex gap-10 lg:col-span-2 lg:col-start-4 lg:gap-12">
          <Figure value={done ? guests.length : null} term="guests scored" />
          <Figure
            value={done ? sweet : null}
            term={sweet === 1 ? "sweet spot" : "sweet spots"}
            marked={done && sweet > 0}
          />
        </dl>
      </header>

      <div aria-hidden className={`${COLUMNS} px-4 sm:px-8 xl:px-10`}>
        <div className="col-span-2 grid grid-cols-subgrid border-y-[1.5px] border-(--w6-ink) py-2 text-[0.8125rem] font-semibold lg:col-span-3 lg:col-start-2">
          <span className="hidden text-(--w6-dim) lg:col-start-2 lg:block">
            Guest
          </span>
          <span className="col-start-2 grid max-w-[336px] grid-cols-3 text-center lg:col-start-3 lg:max-w-none">
            {PARTS.map(({ part, name }) => (
              <span key={part} style={{ color: INK[part] }}>
                {name}
              </span>
            ))}
          </span>
        </div>
      </div>

      {done ? (
        <ol className="px-4 sm:px-8 xl:px-10">
          {shown.map((guest, index) => (
            <Row
              key={guest.ref}
              guest={guest}
              rank={index + 1}
              callFirst={index === first}
              unscored={index === unscored}
              fewNewEars={index === safe}
            />
          ))}
        </ol>
      ) : (
        <ol aria-hidden className="px-4 sm:px-8 xl:px-10">
          {Array.from({ length: LEAD_ROWS }, (_, index) => (
            <li
              key={index}
              className="w6-waiting h-[84px] border-b border-(--w6-rule) last:border-b-0"
            />
          ))}
        </ol>
      )}

      <footer
        className={`${COLUMNS} border-t border-(--w6-rule) px-4 py-5 sm:px-8 xl:px-10`}
      >
        <Link
          href={runLink(analysis_id)}
          className="w6-link col-span-2 text-[1rem] font-semibold lg:col-span-3 lg:col-start-3"
        >
          {done
            ? `All ${guests.length} guests, with what drives each score`
            : "Open this run"}
          <span aria-hidden> →</span>
        </Link>
      </footer>
    </article>
  );
}

function Figure({
  value,
  term,
  marked = false,
}: {
  value: number | null;
  term: string;
  marked?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <dt className="order-2 mt-3.5 text-[0.9375rem] text-(--w6-soft)">
        {term}
      </dt>
      <dd className="order-1">
        <span
          className={`w6-figures relative inline-block text-[3.25rem] leading-none font-medium tracking-[-0.03em] ${value === null ? "w6-waiting text-(--w6-dim)" : ""}`}
        >
          {value ?? "–"}
          {marked && (
            <DoubleUnderline className="-bottom-3.5 -left-2 h-4 w-[calc(100%+16px)]" />
          )}
        </span>
      </dd>
    </div>
  );
}

function Row({
  guest,
  rank,
  callFirst: first,
  unscored,
  fewNewEars: few,
}: {
  guest: Guest;
  rank: number;
  callFirst: boolean;
  unscored: boolean;
  fewNewEars: boolean;
}) {
  const sweet = guest.label === "sweet_spot";
  const { fit, love_back, reach } = guest.scores;
  const reachNote = unscored
    ? ["reach", "not scored"]
    : few
      ? ["adds few", "new ears"]
      : null;

  return (
    <li className={`${COLUMNS} group relative items-start pt-4`}>
      {first && (
        <div className="hidden lg:col-start-1 lg:row-start-1 lg:block">
          <Note
            lines={["call first"]}
            width={96}
            height={40}
            text={{ x: -12, y: -10 }}
            size={25}
            tilt={-6}
            arrow={{
              from: { x: 38, y: 26 },
              to: { x: 110, y: 13 },
              bend: 0.3,
              seed: 4,
            }}
            className="xl:translate-x-6"
          />
        </div>
      )}
      <span className="w6-figures col-start-1 row-start-1 pt-[3px] text-right text-[0.9375rem] text-(--w6-dim) lg:col-start-2">
        {rank}
      </span>
      <div className="col-start-2 row-start-1 min-w-0 lg:col-start-3">
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="w6-serif text-[1.1875rem] leading-snug font-semibold">
            {guest.name}
          </span>
          <span
            className={`text-[0.8125rem] ${sweet ? "font-semibold text-(--w6-ink)" : "text-(--w6-dim)"}`}
          >
            {LABEL_NAME[guest.label]}
          </span>
          {first && (
            <Note
              lines={["call first"]}
              width={92}
              height={22}
              text={{ x: 26, y: -2 }}
              size={22}
              tilt={-5}
              arrow={{
                from: { x: 22, y: 12 },
                to: { x: 2, y: 12 },
                bend: 0.2,
                seed: 6,
              }}
              className="lg:hidden"
            />
          )}
        </p>
        {guest.description && (
          <p className="mt-0.5 truncate text-[0.875rem] text-(--w6-soft)">
            {guest.description}
          </p>
        )}
        <p className="sr-only">
          Fit {out100(fit)}, love back {out100(love_back)}, reach{" "}
          {reach === null ? "not scored" : out100(reach)}.
        </p>
      </div>
      <div className="col-start-2 row-start-2 mt-3 max-w-[336px] lg:col-start-4 lg:row-start-1 lg:mt-0 lg:max-w-none">
        <Swell guest={guest} className="w-full" />
      </div>
      {reachNote && (
        <>
          <div className="hidden lg:col-start-5 lg:row-start-1 lg:block">
            <Note
              lines={reachNote}
              width={150}
              height={48}
              text={{ x: 26, y: -2 }}
              size={23}
              tilt={-3}
              arrow={{
                from: { x: 20, y: 12 },
                to: { x: -22, y: 9 },
                bend: -0.3,
                seed: unscored ? 8 : 11,
              }}
            />
          </div>
          <div className="col-start-2 row-start-3 flex max-w-[336px] justify-end lg:hidden">
            <Note
              lines={[reachNote.join(" ")]}
              width={260}
              height={30}
              text={{ x: 62, y: 8 }}
              size={21}
              tilt={-2}
              end
              arrow={{
                from: { x: 207, y: 20 },
                to: { x: 214, y: -6 },
                bend: -0.25,
                seed: 12,
              }}
            />
          </div>
        </>
      )}
      <span
        aria-hidden
        className="col-span-2 row-start-4 mt-4 h-px bg-(--w6-rule) group-last:invisible lg:col-span-3 lg:col-start-2 lg:row-start-2"
      />
    </li>
  );
}

function SmallSheet({ item }: { item: Featured }) {
  const { show, analysis_id } = item;
  const analysis = useAnalysis(analysis_id);
  const done = analysis?.status === "done";
  const guests = done ? analysis.guests : [];
  const sweet = guests.filter((guest) => guest.label === "sweet_spot").length;

  return (
    <li className="min-w-0 border-t-[1.5px] border-(--w6-ink) pt-5">
      <div className="flex items-start gap-4">
        <Cover show={show} size={48} />
        <div className="min-w-0">
          <h3 className="w6-serif text-[1.375rem] leading-tight font-medium">
            <Link href={runLink(analysis_id)} className="hover:underline">
              {show.title}
            </Link>
          </h3>
          <p
            className={`w6-figures mt-1 text-[0.9375rem] text-(--w6-soft) ${done ? "" : "w6-waiting"}`}
          >
            {done
              ? `${plural(guests.length, "guest", "guests")} · ${plural(sweet, "sweet spot", "sweet spots")}`
              : "Loading the run"}
          </p>
        </div>
      </div>
      <div
        aria-hidden
        className="mt-4 grid grid-cols-[20px_minmax(0,1fr)_168px] gap-x-3 border-b border-(--w6-ink) pb-1.5 text-[0.75rem] font-semibold"
      >
        <span className="col-start-3 grid grid-cols-3 text-center whitespace-nowrap">
          {PARTS.map(({ part, name }) => (
            <span key={part} style={{ color: INK[part] }}>
              {name}
            </span>
          ))}
        </span>
      </div>
      <ol>
        {guests.slice(0, 3).map((guest, index) => (
          <li
            key={guest.ref}
            className="grid grid-cols-[20px_minmax(0,1fr)_168px] items-center gap-x-3 border-b border-(--w6-rule) py-2.5"
          >
            <span className="w6-figures text-right text-[0.875rem] text-(--w6-dim)">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="w6-serif block truncate text-[1.0625rem] font-semibold">
                {guest.name}
              </span>
              <span
                className={`block text-[0.8125rem] ${guest.label === "sweet_spot" ? "font-semibold" : "text-(--w6-dim)"}`}
              >
                {LABEL_NAME[guest.label]}
              </span>
            </span>
            <Swell guest={guest} column={56} className="w-[168px]" />
          </li>
        ))}
      </ol>
      <Link
        href={runLink(analysis_id)}
        className="w6-link mt-3 inline-block text-[0.9375rem] font-semibold"
      >
        Open the run<span aria-hidden> →</span>
      </Link>
    </li>
  );
}
