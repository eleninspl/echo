import type { CSSProperties } from "react";

import type { Guest } from "@/lib/echo";

import { Ring } from "./logo";

const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

// The guests set as a lineup: billing size is the Echo score, so sweet spots headline.
// With no sweet spot, the three closest headline instead.
export function Bill({ guests }: { guests: Guest[] }) {
  if (!guests.length) return null;
  const sweet = guests.filter((guest) => guest.label === "sweet_spot");
  const headliners = sweet.length ? sweet : guests.slice(0, 3);
  const top = guests.slice(0, 10).filter((guest) => !headliners.includes(guest));
  const further = guests.slice(10).filter((guest) => !headliners.includes(guest));
  const tiers = [
    { guests: headliners, className: "text-[clamp(2.5rem,7vw,5.5rem)] font-black gap-x-6", ring: "size-[0.32em]" },
    { guests: top, className: "text-[clamp(1.625rem,3.6vw,2.75rem)] font-extrabold gap-x-5", ring: "size-[0.36em]" },
    { guests: further, className: "text-[1.375rem] font-bold gap-x-4", ring: "size-[0.4em]" },
  ];
  let order = 0;

  return (
    <section aria-labelledby="bill" className="flex flex-col gap-8">
      <h2 id="bill" className="max-w-3xl text-xl font-semibold text-balance">
        {sweet.length
          ? `${COUNT[sweet.length] ?? sweet.length} ${sweet.length === 1 ? "guest clears" : "guests clear"} all three: your listeners over-index on them, and their fans are new to you.`
          : "No guest clears all three yet. These come closest."}
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
                    <a href={`#guest-${guest.ref}`} className="inline-flex items-baseline gap-[0.18em] hover:underline">
                      <Ring
                        className={`${tier.ring} self-center ${guest.label === "sweet_spot" ? "text-vermilion" : "text-on-field-soft"}`}
                      />
                      {guest.name}
                    </a>
                  </li>
                ))}
              </ul>
            ),
        )}
      </div>
      <p className="flex items-center gap-2 text-sm text-on-field-soft">
        {sweet.length > 0 && <Ring className="size-3.5 text-vermilion" />}
        <span>
          {sweet.length > 0 && "Sweet spot. "}Billing is the Echo score, fit, love back and reach together, not fame.
        </span>
      </p>
    </section>
  );
}
