import type { Analysis, Guest } from "@/lib/echo";
import { AGES, labelMeans, LABELS, SHORT_AGE } from "@/lib/format";
import { AGE_ORDER } from "@/lib/stats";

import { GuestDetails } from "./guest-details";
import { Picture } from "./guest-list";
import { Chip, hue, LABEL_HUE, out100, rank, SCORE_HUE, Voiceprint } from "./hud";
import { MAX_PICKS } from "./invite";

const SITES: Record<string, string> = { imdb: "IMDb", spotify: "Spotify", musicbrainz: "MusicBrainz" };

export type DossierView = "profile" | "episode";

type Props = {
  analysis: Analysis;
  guest: Guest;
  index: number;
  picked: boolean;
  full: boolean;
  view: DossierView;
  onPick: () => void;
  onView: (view: DossierView) => void;
};

// The selected guest: portrait, label, the three scores as gauges, invite, and two views: the profile
// (the episode idea and the evidence behind it) and the full episode with their fans next to yours.
export function Dossier({ analysis, guest, index, picked, full, view, onPick, onView }: Props) {
  const { scores } = guest;
  const color = LABEL_HUE[guest.label];
  return (
    <section aria-labelledby="dossier" aria-live="polite" className="zone flex flex-col">
      <div className="flex min-h-12 items-center justify-between gap-3 px-5 pt-4 pb-1">
        <h2 id="dossier" className="font-display text-[0.9375rem] font-semibold text-ink">
          <span className="sr-only">Selected guest, </span>
          Guest {rank(index)}
        </h2>
        <Chip color={color}>{LABELS[guest.label].name}</Chip>
      </div>

      {/* Beside the list on a wide screen the portrait is large with the name over it; stacked under the list,
          a smaller portrait with the name beside it, so the scores stay near the top. */}
      <div className="mx-4 mt-3 flex items-center gap-5 lg:block">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-well sm:size-32 lg:aspect-[4/3] lg:size-auto lg:w-full">
          <Picture guest={guest} sizes="(min-width: 1024px) 34vw, 128px" />
          <div className="absolute inset-x-0 bottom-0 hidden bg-linear-to-t from-black/75 via-black/45 to-transparent px-4 pt-16 pb-3.5 lg:block">
            <h3 className="font-display text-[1.875rem] leading-none font-semibold text-white">{guest.name}</h3>
            {guest.description && <p className="mt-1.5 text-sm text-white/80">{guest.description}</p>}
          </div>
        </div>
        <div className="min-w-0 lg:hidden">
          <h3 className="font-display text-[1.75rem] leading-tight font-semibold text-balance">{guest.name}</h3>
          {guest.description && <p className="mt-1 text-sm text-ink-soft">{guest.description}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col">
          <Voiceprint fit={scores.fit} love={scores.love_back} reach={scores.reach} bars={60} height={64} className="w-full" />
          <dl className="grid grid-cols-3">
            <Level name="Fit" value={scores.fit} color={SCORE_HUE.fit} />
            <Level name="Love back" value={scores.love_back} color={SCORE_HUE.love_back} />
            <Level name="Reach" value={scores.reach} color={SCORE_HUE.reach} />
          </dl>
        </div>
        <p className="text-sm text-ink-soft">
          <span className="font-semibold" style={{ color }}>
            {LABELS[guest.label].name}.
          </span>{" "}
          {labelMeans(guest.label, scores.reach === null)}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPick}
            disabled={full && !picked}
            aria-pressed={picked}
            className={`btn ${picked ? "btn-solid" : ""}`}
            style={hue("var(--ink)")}
          >
            {picked ? "Picked to invite" : full ? `Up to ${MAX_PICKS} invites` : "Pick to invite"}
            <span className="sr-only"> {guest.name}</span>
          </button>
          <button
            type="button"
            onClick={() => onView(view === "episode" ? "profile" : "episode")}
            aria-expanded={view === "episode"}
            aria-controls="dossier-view"
            className={`btn ${view === "episode" ? "btn-solid" : ""}`}
            style={hue("var(--accent)")}
          >
            {view === "episode" ? "Back to profile" : "Episode & fans"}
          </button>
        </div>

        <div id="dossier-view" className="flex flex-col gap-5">
          {view === "episode" ? (
            <GuestDetails
              key={guest.ref}
              id={analysis.id}
              guestRef={guest.ref}
              guestName={guest.name}
              showMap={analysis.audience_map}
            />
          ) : (
            <Profile guest={guest} />
          )}
        </div>
      </div>
    </section>
  );
}

function Profile({ guest }: { guest: Guest }) {
  const { idea, evidence } = guest;
  return (
    <>
      {idea ? (
        <div className="flex flex-col gap-2 border-t border-steel pt-4">
          <p className="tag text-ink-dim">Episode idea</p>
          <p className="font-display text-xl leading-tight font-semibold text-balance">{idea.title}</p>
          <p className="text-sm text-ink-soft">{idea.pitch}</p>
          <p className="text-sm text-ink">{idea.reason}</p>
        </div>
      ) : (
        <p className="border-t border-steel pt-4 text-sm text-ink-dim">
          {evidence ? "No episode idea yet." : "Echo writes ideas and evidence for the top 10."}
        </p>
      )}

      {evidence && <Evidence evidence={evidence} />}

      {Object.keys(guest.links).length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {Object.entries(guest.links).map(([site, url]) => (
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
      )}
    </>
  );
}

// One score under its lobe of the voiceprint: a leader down from the lobe, the name and the figure.
function Level({ name, value, color }: { name: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col-reverse items-center gap-1">
      <dt className="tag text-center" style={{ color }}>
        {name}
      </dt>
      <dd className="flex flex-col items-center">
        <span aria-hidden className="h-3 w-px" style={{ background: color }} />
        <span aria-hidden className="mb-1.5 size-1.5 rounded-full" style={{ background: color }} />
        <span className="readout text-[1.75rem]">{out100(value)}</span>
        {value === null && <span className="text-[0.6875rem] leading-tight text-ink-dim">Too little data</span>}
      </dd>
    </div>
  );
}

function Evidence({ evidence }: { evidence: NonNullable<Guest["evidence"]> }) {
  return (
    <dl className="flex flex-col gap-4 border-t border-steel pt-4">
      {evidence.shared_tastes.length > 0 && (
        <div className="flex flex-col gap-2">
          <dt className="tag text-ink-dim">Both audiences love</dt>
          <dd className="flex flex-wrap gap-1.5">
            {evidence.shared_tastes.map((taste) => (
              <Chip key={taste} color="var(--fit)" plain>
                {taste}
              </Chip>
            ))}
          </dd>
        </div>
      )}
      {evidence.new_podcasts.length > 0 && (
        <div className="flex flex-col gap-2">
          <dt className="tag text-ink-dim">Their fans&apos; podcasts, new to you</dt>
          <dd className="flex flex-wrap gap-1.5">
            {evidence.new_podcasts.map((podcast) => (
              <Chip key={podcast} color="var(--reach)" plain>
                {podcast}
              </Chip>
            ))}
          </dd>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <dt className="tag text-ink-dim">Their fans skew</dt>
        <dd>
          <span className="sr-only">
            {evidence.ages.length ? evidence.ages.map((age) => AGES[age]).join(", ") : "No age data yet"}
          </span>
          <span aria-hidden className="grid grid-cols-6 gap-1">
            {AGE_ORDER.map((age) => {
              const on = evidence.ages.includes(age);
              return (
                <span key={age} className="flex flex-col items-center gap-1">
                  <span className={`h-2 w-full ${on ? "lamp" : "lamp-off"}`} style={hue("var(--love)")} />
                  <span className={`text-[0.6875rem] ${on ? "text-ink" : "text-ink-dim"}`}>{SHORT_AGE[age]}</span>
                </span>
              );
            })}
          </span>
        </dd>
      </div>
    </dl>
  );
}
