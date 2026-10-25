"use client";

import Link from "next/link";

import type { Guest } from "@/lib/echo";

import { Lineup } from "./lineup";
import { Keyed } from "./marks";
import { PARTS, PART_NAME, capital, countLabel, ordinal, out100, plural, runHref, scoreOf, word } from "./palette";
import { useLeadRun } from "./runs";
import { FitLoveChart, SizeKey } from "./scatter";

const FRAME = "mx-auto w-full max-w-[1240px] px-4 sm:px-8 lg:px-10";

export function RunFinding() {
  const run = useLeadRun();
  if (run.state === "empty") return null;

  if (run.state === "loading") {
    return (
      <section aria-label="What one run found" className={`${FRAME} pt-20 pb-8`}>
        <p className="w5-waiting w5-serif text-[1.4rem] text-(--w5-muted)">Loading the run…</p>
      </section>
    );
  }

  const { item, guests } = run;
  const shown = guests.slice(0, 20);
  const sweet = countLabel(guests, "sweet_spot");

  return (
    <section aria-labelledby="w5-found" className="pt-20 lg:pt-28">
      <div className={FRAME}>
        <div className="max-w-[44rem]">
          <h2 id="w5-found" className="w5-serif text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.08] font-medium text-balance">
            What Echo found for {item.show.title}
          </h2>
          <p className="w5-serif mt-5 text-[1.22rem] leading-[1.55] text-(--w5-soft)">{summary(guests, item.show.title)}</p>
        </div>

        <figure aria-labelledby="w5-scatter-title" className="mt-12">
          <div className="flex flex-col gap-4 border-t-2 border-(--w5-ink) pt-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-[46rem]">
              <h3 id="w5-scatter-title" className="text-[1.2rem] leading-snug font-bold">
                {sweet === 0
                  ? `None of the ${guests.length} guests clears all three bars`
                  : `${capital(word(sweet))} of ${guests.length} guests ${plural(sweet, "clears", "clear")} all three bars`}
              </h3>
              <p className="mt-1 text-[0.98rem] leading-snug text-(--w5-soft)">
                Each dot is a guest, placed by <Keyed part="fit">fit</Keyed> and{" "}
                <Keyed part="love">love back</Keyed>. Bigger dots bring more new ears (
                <Keyed part="reach">reach</Keyed>). Filled dots are sweet spots. Hover or tab to a dot for its
                scores.
              </p>
            </div>
            <SizeKey />
          </div>
          <div className="mt-6">
            <FitLoveChart guests={guests} />
          </div>
          <figcaption className="mt-3 border-t border-(--w5-line) pt-2.5 text-[0.82rem] text-(--w5-muted)">
            Source: Echo&apos;s run for {item.show.title}, from Qloo taste data. Scores are percentiles within the run.
          </figcaption>
        </figure>

        <div className="mt-20 max-w-[44rem] lg:mt-24">
          <p className="w5-serif text-[1.22rem] leading-[1.55] text-(--w5-soft)">{rankingNote(guests)}</p>
        </div>

        <figure aria-labelledby="w5-lineup-title" className="mt-10">
          <div className="border-t-2 border-(--w5-ink) pt-3">
            <h3 id="w5-lineup-title" className="text-[1.2rem] leading-snug font-bold">
              {guests.length > shown.length
                ? `The top ${shown.length} of ${guests.length} guests, in Echo's order`
                : `All ${guests.length} guests, in Echo's order`}
            </h3>
            <p className="mt-1 max-w-[62ch] text-[0.98rem] leading-snug text-(--w5-soft)">
              Each guest&apos;s three scores as swells, left to right: <Keyed part="fit">fit</Keyed>,{" "}
              <Keyed part="love">love back</Keyed>, <Keyed part="reach">reach</Keyed>. The dashed line in each
              swell is its sweet-spot bar. Numbers in bold clear it.
            </p>
          </div>
          <div className="mt-7">
            <Lineup guests={shown} />
          </div>
          <figcaption className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-(--w5-line) pt-2.5 text-[0.82rem] text-(--w5-muted)">
            <span>
              Source: Echo&apos;s run for {item.show.title}. A guest whose reach can&apos;t be scored needs 50 on both
              fit and love back.
            </span>
            <Link
              href={runHref(item.analysis_id)}
              className="text-[0.95rem] font-semibold text-(--w5-ink) underline decoration-1 underline-offset-[3px] hover:decoration-2"
            >
              Open the full run for {item.show.title}
            </Link>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function summary(guests: Guest[], title: string) {
  const sweet = countLabel(guests, "sweet_spot");
  const safe = countLabel(guests, "safe");
  const far = countLabel(guests, "far");
  const long = countLabel(guests, "long_shot");
  const parts = [`Echo found ${guests.length} guests for ${title}.`];
  parts.push(
    sweet === 0
      ? "None of them clears all three bars, and Echo says so."
      : `${capital(word(sweet))} ${plural(sweet, "clears", "clear")} all three bars and ${plural(sweet, "lands", "land")} in the sweet spot.`,
  );
  if (safe)
    parts.push(
      `${capital(word(safe))} ${plural(safe, "is", "are")} safe: loved both ways, but their fans already overlap with yours.`,
    );
  if (far) parts.push(`${capital(word(far))} ${plural(far, "is", "are")} far: new ears that may not stay.`);
  if (long)
    parts.push(
      `${capital(word(long))} ${plural(long, "is a long shot", "are long shots")}: your listeners don't lean their way.`,
    );
  return parts.join(" ");
}

function rankingNote(guests: Guest[]) {
  const parts = [
    "Echo ranks guests by multiplying the three scores, so one weak score pulls a guest down however strong the other two are.",
  ];
  const fittest = guests.reduce(
    (best, guest, index) => (guest.scores.fit > guests[best].scores.fit ? index : best),
    0,
  );
  if (fittest >= 3) {
    const guest = guests[fittest];
    const weakest = PARTS.filter((part) => part !== "fit")
      .map((part) => ({ part, value: scoreOf(guest, part) }))
      .filter((entry): entry is { part: typeof entry.part; value: number } => entry.value !== null)
      .sort((a, b) => a.value - b.value)[0];
    if (weakest) {
      parts.push(
        `${guest.name} has the run's highest fit, ${out100(guest.scores.fit)}, and still ranks ${ordinal(fittest + 1)}, because ${PART_NAME[weakest.part].toLowerCase()} is ${out100(weakest.value)}.`,
      );
    }
  }
  const top = guests[0];
  const leadsOnSomething = PARTS.some((part) => {
    const value = scoreOf(top, part);
    if (value === null) return false;
    return guests.every((guest) => (scoreOf(guest, part) ?? 0) <= value);
  });
  if (!leadsOnSomething && guests.length > 2) {
    parts.push(`${top.name} ranks first without leading on any single score.`);
  }
  return parts.join(" ");
}

export function SweetShare() {
  const run = useLeadRun();
  if (run.state !== "ready") return null;
  const sweet = countLabel(run.guests, "sweet_spot");
  return (
    <>
      {" "}
      In the run above, {word(sweet)} of {run.guests.length}.
    </>
  );
}
