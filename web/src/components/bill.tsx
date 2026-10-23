import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { Ring } from "./logo";

const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

const count = (n: number) => COUNT[n] ?? String(n);

// A sweet spot without a reach score is judged on fit and love back alone (docs/qloo.md, Scoring),
// so the headline only claims all three for the ones that have them.
function headline(sweet: Guest[]): string {
  if (!sweet.length) return "No guest clears all three yet. These come closest.";
  const unscored = sweet.filter((guest) => guest.scores.reach === null).length;
  if (!unscored) {
    return `${count(sweet.length)} ${sweet.length === 1 ? "guest clears" : "guests clear"} all three: your listeners over-index on them, their fans over-index on your show, and those fans are new to you.`;
  }
  const spots = `${count(sweet.length)} sweet ${sweet.length === 1 ? "spot" : "spots"}: your listeners over-index on them, and their fans over-index on your show.`;
  const which =
    sweet.length === 1
      ? "There's"
      : unscored === sweet.length
        ? "For all of them, there's"
        : `For ${count(unscored).toLowerCase()}, there's`;
  return `${spots} ${which} too little data to say how new those fans are.`;
}

// The guests set as a lineup: billing size is the Echo score, so sweet spots headline.
// With no sweet spot, the three closest headline instead.
export function Bill({ guests }: { guests: Guest[] }) {
  if (!guests.length) return null;
  const sweet = guests.filter((guest) => guest.label === "sweet_spot");
  const headliners = sweet.length ? sweet : guests.slice(0, 3);
  const top = guests.slice(0, 10).filter((guest) => !headliners.includes(guest));
  const further = guests.slice(10).filter((guest) => !headliners.includes(guest));
  const tiers = [
    { guests: headliners, className: "text-[clamp(2.5rem,7vw,5.5rem)] font-black gap-x-8", ring: "size-[0.32em]" },
    { guests: top, className: "text-[clamp(1.625rem,3.6vw,2.75rem)] font-extrabold gap-x-5", ring: "size-[0.36em]" },
    { guests: further, className: "text-[1.375rem] font-bold gap-x-4", ring: "size-[0.4em]" },
  ];
  let order = 0;

  return (
    <section aria-labelledby="bill" className="flex flex-col gap-8">
      <h2 id="bill" className="max-w-3xl text-xl font-semibold text-balance">
        {headline(sweet)}
      </h2>
      <div className="flex flex-col gap-6 border-t-2 border-on-field pt-6">
        {tiers.map(
          (tier, index) =>
            tier.guests.length > 0 && (
              <ul
                key={index}
                className={`flex flex-wrap items-baseline gap-y-1 font-display leading-[0.95] tracking-tight uppercase ${tier.className}`}
              >
                {tier.guests.map((guest) => (
                  <li key={guest.ref} className="print" style={{ "--order": order++ } as CSSProperties}>
                    <a href={`#guest-${guest.ref}`} className="group inline-flex flex-col">
                      <span className="inline-flex items-baseline gap-[0.18em] group-hover:underline">
                        <Ring
                          sweet={guest.label === "sweet_spot"}
                          className={`${tier.ring} self-center ${guest.label === "sweet_spot" ? "text-on-field" : "text-on-field-soft"}`}
                        />
                        {guest.name}
                        {guest.label === "sweet_spot" && <span className="sr-only"> (sweet spot)</span>}
                      </span>
                      {/* The headliners' credit line, as a bill prints it under the name. */}
                      {index === 0 && guest.description && (
                        <span className="mt-1.5 flex pl-[0.5em]">
                          <span className="font-sans text-base font-semibold tracking-normal normal-case">
                            {guest.description}
                          </span>
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            ),
        )}
      </div>
      <p className="flex items-center gap-2 text-sm text-on-field-soft">
        {sweet.length > 0 && <Ring sweet className="size-3.5 text-on-field" />}
        <span>
          {sweet.length > 0 && "Sweet spot. "}Billing is the Echo score, fit, love back and reach together, not fame.
        </span>
      </p>
    </section>
  );
}
