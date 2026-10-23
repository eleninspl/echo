import type { Guest, Label } from "@/lib/echo";
import { AGES, LABELS, score } from "@/lib/format";

const TAG: Record<Label, string> = {
  sweet_spot: "bg-vermilion text-tag-ink border-vermilion",
  safe: "bg-tag-safe text-tag-ink border-tag-safe",
  far: "border-link text-link",
  long_shot: "border-dashed border-ink",
  balanced: "border-ink",
};

const SITES: Record<string, string> = { imdb: "IMDb", spotify: "Spotify", musicbrainz: "MusicBrainz" };

export function GuestTable({ guests }: { guests: Guest[] }) {
  return (
    <section aria-labelledby="guests">
      <div className="grid-lines mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <h2 id="guests" className="font-display text-5xl leading-none font-extrabold uppercase">
          The guests
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Each score is out of 100, ranked within these {guests.length}. Fit is how much your listeners over-index on
          the guest beyond their fame; love back, how much the guest&apos;s fans over-index on your show; reach, how
          new those fans are to you.
        </p>
        <ol className="mt-8 border-t-2 border-ink">
          {guests.map((guest, index) => (
            <GuestRow key={guest.ref} guest={guest} rank={index + 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function GuestRow({ guest, rank }: { guest: Guest; rank: number }) {
  const { scores, idea, evidence } = guest;
  return (
    <li
      id={`guest-${guest.ref}`}
      className="grid scroll-mt-6 grid-cols-[2.5rem_1fr] gap-x-4 gap-y-5 border-b border-rule py-6 target:bg-well md:grid-cols-12 md:gap-x-8"
    >
      <p className="font-display text-3xl leading-none font-extrabold tabular-nums md:col-span-1" aria-hidden>
        {rank}
      </p>
      <div className="flex flex-col items-start gap-2 md:col-span-4">
        <h3 className="font-display text-3xl leading-none font-extrabold uppercase">
          <span className="sr-only">{rank}. </span>
          {guest.name}
        </h3>
        {guest.description && <p className="text-ink-soft">{guest.description}</p>}
        <p className="flex flex-col items-start gap-1.5">
          <span className={`border-2 px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${TAG[guest.label]}`}>
            {LABELS[guest.label].name}
          </span>
          <span className="text-sm text-ink-soft">{LABELS[guest.label].means}</span>
        </p>
        <Links links={guest.links} />
      </div>
      <dl className="col-start-2 flex flex-col gap-3 md:col-span-3 md:col-start-auto">
        <Meter name="Fit" value={scores.fit} />
        <Meter name="Love back" value={scores.love_back} />
        <Meter name="Reach" value={scores.reach} missing="Too few of their fans' podcasts to tell" />
      </dl>
      <div className="col-start-2 flex flex-col gap-4 md:col-span-4 md:col-start-auto">
        {idea ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-lg leading-snug font-semibold">{idea.title}</p>
            <p>{idea.reason}</p>
            <p className="text-ink-soft">{idea.pitch}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Echo writes the episode idea and evidence for the top 10.</p>
        )}
        {evidence && <Evidence evidence={evidence} />}
      </div>
    </li>
  );
}

function Meter({ name, value, missing }: { name: string; value: number | null; missing?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <dt>{name}</dt>
        <dd className="font-display text-2xl leading-none font-extrabold tabular-nums">
          {value === null ? <span title={missing}>{score(value)}</span> : score(value)}
          {value === null && <span className="sr-only">{missing}</span>}
        </dd>
      </div>
      <div aria-hidden className="mt-1 h-1.5 bg-rule">
        {value !== null && <div className="h-full bg-ink" style={{ width: `${Math.max(value * 100, 2)}%` }} />}
      </div>
    </div>
  );
}

function Evidence({ evidence }: { evidence: NonNullable<Guest["evidence"]> }) {
  return (
    <dl className="flex flex-col gap-1 border-t border-rule pt-3 text-sm [&_dt]:text-xs [&_dt]:font-semibold [&_dt]:tracking-wide [&_dt]:text-ink-soft [&_dt]:uppercase [&_dt:not(:first-child)]:mt-2">
      {evidence.shared_tastes.length > 0 && (
        <>
          <dt>Both audiences over-index on</dt>
          <dd>{evidence.shared_tastes.join(", ")}</dd>
        </>
      )}
      {evidence.new_podcasts.length > 0 && (
        <>
          <dt>Their fans&apos; podcasts, new to you</dt>
          <dd>{evidence.new_podcasts.join(", ")}</dd>
        </>
      )}
      <dt>Their fans skew</dt>
      <dd>{evidence.ages.length ? evidence.ages.map((age) => AGES[age]).join(", ") : "No age data for their fans yet"}</dd>
    </dl>
  );
}

function Links({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links);
  if (!entries.length) return null;
  return (
    <p className="flex flex-wrap gap-x-4 text-sm">
      {entries.map(([site, url]) => (
        <a key={site} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link underline">
          {SITES[site] ?? site}
          <svg aria-hidden viewBox="0 0 12 12" className="size-3">
            <path d="M4 2h6v6M10 2L3 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ))}
    </p>
  );
}
