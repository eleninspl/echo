import Link from "next/link";

import type { AgeBucket, Guest, Scores as GuestScores } from "@/lib/echo";
import { AGES, labelMeans, LABELS, SHORT_AGE } from "@/lib/format";
import { guestPath } from "@/lib/paths";
import { AGE_ORDER } from "@/lib/stats";

import { Picture } from "./guest-list";
import { Chip, hue, LABEL_HUE, out100, rank, SCORE_HUE, Voiceprint } from "./hud";
import { MAX_PICKS } from "./invite";

const SITES: Record<string, string> = { imdb: "IMDb", spotify: "Spotify", musicbrainz: "MusicBrainz" };

type Props = {
  analysisId: string;
  guest: Guest;
  index: number;
  picked: boolean;
  full: boolean;
  onPick: () => void;
};

export function Dossier({ analysisId, guest, index, picked, full, onPick }: Props) {
  const { scores, idea, evidence } = guest;
  const color = LABEL_HUE[guest.label];
  const href = guestPath(analysisId, guest.ref);
  return (
    <section aria-labelledby="dossier" aria-live="polite" className="zone @container flex flex-col">
      <div className="flex min-h-12 items-center justify-between gap-3 px-5 pt-4 pb-1">
        <h2 id="dossier" className="font-display text-[0.9375rem] font-semibold text-ink">
          <span className="sr-only">Selected guest, </span>
          Guest {rank(index)}
        </h2>
        <Chip color={color}>{LABELS[guest.label].name}</Chip>
      </div>

      <div className="grid gap-5 px-5 pt-3 pb-5 @xl:grid-cols-2 @xl:gap-x-8">
        <div className="flex flex-col gap-4">
          <Link href={href} className="group flex items-center gap-4 rounded-xl">
            <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-well">
              <Picture guest={guest} sizes="80px" small />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-2xl leading-tight font-semibold text-balance decoration-1 underline-offset-4 group-hover:underline">
                {guest.name}
              </span>
              {guest.description && (
                <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{guest.description}</span>
              )}
            </span>
          </Link>
          <Scores scores={scores} />
          <p className="text-sm text-ink-soft">
            <span className="font-semibold" style={{ color }}>
              {LABELS[guest.label].name}.
            </span>{" "}
            {labelMeans(guest.label, scores.reach === null)}
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-steel pt-4 @xl:border-t-0 @xl:pt-0">
          {idea ? (
            <div className="flex flex-col gap-1.5">
              <p className="tag text-ink-dim">Episode idea</p>
              <p className="font-display text-lg leading-tight font-semibold text-balance">{idea.title}</p>
              <p className="line-clamp-3 text-sm text-ink-soft">{idea.pitch}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-dim">
              {evidence ? "No episode idea yet." : "Echo writes ideas and evidence for the top 10."}
            </p>
          )}
          {evidence && (
            <dl className="flex flex-col gap-3">
              {evidence.shared_tastes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <dt className="tag text-ink-dim">Both audiences love</dt>
                  <dd>
                    <TasteChips names={evidence.shared_tastes} color="var(--fit)" />
                  </dd>
                </div>
              )}
              {evidence.new_podcasts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <dt className="tag text-ink-dim">Their fans&apos; podcasts, new to you</dt>
                  <dd>
                    <TasteChips names={evidence.new_podcasts} color="var(--reach)" />
                  </dd>
                </div>
              )}
              {evidence.ages.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <dt className="tag text-ink-dim">Their fans skew</dt>
                  <dd>
                    <AgeLamps ages={evidence.ages} />
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-b-2xl border-t border-steel bg-deck p-4 lg:sticky lg:bottom-0">
        <PickButton guestName={guest.name} picked={picked} full={full} onPick={onPick} />
        <Link href={href} className="btn btn-solid" style={hue("var(--accent)")}>
          Open guest
          <span className="sr-only"> {guest.name}</span>
          <svg aria-hidden viewBox="0 0 12 12" className="size-3">
            <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

export function Scores({
  scores,
  bars = 60,
  height = 36,
  readout = "text-2xl",
}: {
  scores: GuestScores;
  bars?: number;
  height?: number;
  readout?: string;
}) {
  return (
    <div className="flex flex-col">
      <Voiceprint
        fit={scores.fit}
        love={scores.love_back}
        reach={scores.reach}
        bars={bars}
        height={height}
        className="w-full"
      />
      <dl className="grid grid-cols-3">
        <Level name="Fit" value={scores.fit} color={SCORE_HUE.fit} readout={readout} />
        <Level name="Love back" value={scores.love_back} color={SCORE_HUE.love_back} readout={readout} />
        <Level name="Reach" value={scores.reach} color={SCORE_HUE.reach} readout={readout} />
      </dl>
    </div>
  );
}

// One score under its lobe of the voiceprint: a leader down from the lobe, the name and the figure.
function Level({
  name,
  value,
  color,
  readout,
}: {
  name: string;
  value: number | null;
  color: string;
  readout: string;
}) {
  return (
    <div className="flex flex-col-reverse items-center gap-1">
      <dt className="tag text-center" style={{ color }}>
        {name}
      </dt>
      <dd className="flex flex-col items-center">
        <span aria-hidden className="h-3 w-px" style={{ background: color }} />
        <span aria-hidden className="mb-1.5 size-1.5 rounded-full" style={{ background: color }} />
        <span className={`readout ${readout}`}>{out100(value)}</span>
        {value === null && <span className="text-[0.6875rem] leading-tight text-ink-dim">Too little data</span>}
      </dd>
    </div>
  );
}

export function PickButton({
  guestName,
  picked,
  full,
  onPick,
}: {
  guestName: string;
  picked: boolean;
  full: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={full && !picked}
      aria-pressed={picked}
      className={`btn ${picked ? "btn-solid" : ""}`}
      style={hue("var(--ink)")}
    >
      {picked ? "Picked to invite" : full ? `Up to ${MAX_PICKS} invites` : "Pick to invite"}
      <span className="sr-only"> {guestName}</span>
    </button>
  );
}

export function TasteChips({ names, color }: { names: string[]; color: string }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <Chip key={name} color={color} plain>
          {name}
        </Chip>
      ))}
    </span>
  );
}

export function AgeLamps({ ages }: { ages: AgeBucket[] }) {
  return (
    <>
      <span className="sr-only">{ages.length ? ages.map((age) => AGES[age]).join(", ") : "No age data yet"}</span>
      <span aria-hidden className="grid grid-cols-6 gap-1">
        {AGE_ORDER.map((age) => {
          const on = ages.includes(age);
          return (
            <span key={age} className="flex flex-col items-center gap-1">
              <span className={`h-2 w-full ${on ? "lamp" : "lamp-off"}`} style={hue("var(--love)")} />
              <span className={`text-[0.6875rem] ${on ? "text-ink" : "text-ink-dim"}`}>{SHORT_AGE[age]}</span>
            </span>
          );
        })}
      </span>
    </>
  );
}

export function GuestLinks({ links }: { links: Guest["links"] }) {
  if (!Object.keys(links).length) return null;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {Object.entries(links).map(([site, url]) => (
        <a
          key={site}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-accent underline"
        >
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
