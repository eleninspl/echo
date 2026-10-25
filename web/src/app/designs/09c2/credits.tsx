"use client";

import { useFeatured } from "@/components/featured";

import { LABEL_NAME, LABEL_NOTE, LABEL_ORDER, plural } from "./inks";
import { useAnalysis } from "./runs";

export function RunCredits() {
  const featured = useFeatured();
  const first = featured?.[0] ?? null;
  const analysis = useAnalysis(first?.analysis_id ?? null);
  if (!first || analysis?.status !== "done" || !analysis.guests.length)
    return null;

  const guests = analysis.guests;
  const groups = LABEL_ORDER.map((label) => ({
    label,
    names: guests.filter((guest) => guest.label === label),
  })).filter((group) => group.names.length > 0);
  const hosts = analysis.left_out.filter((item) => item.why === "host").length;
  const past = analysis.left_out.filter(
    (item) => item.why === "past_guest",
  ).length;
  const leftOut = [
    hosts ? plural(hosts, "host", "hosts") : null,
    past ? plural(past, "past guest", "past guests") : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="w2-credits"
      className="mt-6 grid grid-cols-1 gap-y-6 lg:col-span-12 lg:mt-10 lg:grid-cols-12 lg:gap-x-6"
    >
      <div className="lg:col-span-3">
        <h3
          id="w2-credits"
          className="w2-display text-[1.65rem] leading-[1.12] sm:text-[1.9rem]"
        >
          The {plural(guests.length, "guest", "guests")} Echo found for{" "}
          <span className="w2-italic">{first.show.title}</span>, by label
        </h3>
        <p className="mt-3 max-w-[34ch] text-[1rem] leading-relaxed text-(--w2-soft) italic">
          Each guest takes the first label that fits, so every name appears
          once.
        </p>
      </div>
      <div className="lg:col-span-9 lg:pt-2">
        <dl className="border-t-2 border-(--w2-ink)">
          {groups.map(({ label, names }) => (
            <div
              key={label}
              className="grid grid-cols-1 gap-y-1 border-b border-(--w2-rule) py-3.5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-x-6"
            >
              <dt className="flex flex-col">
                <span className="w2-sans flex items-baseline gap-2 text-[0.98rem] font-semibold">
                  {LABEL_NAME[label]}
                  <span className="w2-figures font-normal text-(--w2-soft)">
                    {names.length}
                  </span>
                </span>
                <span className="text-[0.92rem] leading-snug text-(--w2-soft) italic">
                  {LABEL_NOTE[label]}
                </span>
              </dt>
              <dd className="text-[1.12rem] leading-[1.5]">
                {names.map((guest, index) => (
                  <span key={guest.ref}>
                    {index > 0 && ", "}
                    {guest.name}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        {leftOut.length > 0 && (
          <p className="mt-3 text-[0.95rem] text-(--w2-soft) italic">
            Left out before scoring: {leftOut.join(" and ")}.
          </p>
        )}
      </div>
    </section>
  );
}
