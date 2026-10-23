import type { Guest } from "@/lib/echo";
import { AGES, labelMeans, LABELS } from "@/lib/format";
import { AGE_ORDER } from "@/lib/stats";

import { channel, hue, LABEL_HUE, Meter, out100, Scribble, SCORE_HUE } from "./gallery";
import { MAX_PICKS } from "./invite";
import { Picture } from "./wall";

const SITES: Record<string, string> = { imdb: "IMDb", spotify: "Spotify", musicbrainz: "MusicBrainz" };

type Props = {
  guest: Guest;
  index: number;
  picked: boolean;
  full: boolean;
  open: boolean;
  onPick: () => void;
  onOpen: () => void;
};

// The preview monitor: the selected guest at full size, with their levels, the episode idea and the
// evidence behind it. The only place a guest's words are shown, so the rest of the gallery stays visual.
export function Preview({ guest, index, picked, full, open, onPick, onOpen }: Props) {
  const { scores, idea, evidence } = guest;
  const sweet = guest.label === "sweet_spot";
  return (
    <section aria-labelledby="preview" aria-live="polite" className="panel flex flex-col rounded-[4px]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 id="preview" className="silk flex items-center gap-2 text-ink">
          <span className="sr-only">Selected guest: </span>
          PVW · {channel(index)}
        </h2>
        {sweet && (
          <span className="silk rounded-[2px] bg-tally px-1.5 py-1 text-[0.5625rem] text-on-light">On air</span>
        )}
      </div>

      <div className="group monitor relative m-2 mb-0 aspect-video overflow-hidden rounded-[2px]">
        <Picture guest={guest} sizes="(min-width: 1024px) 30vw, 95vw" />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-monitor via-monitor/80 to-transparent px-3 pt-10 pb-3">
          <h3 className="font-cond text-3xl leading-none font-semibold tracking-wide uppercase">{guest.name}</h3>
          {guest.description && <p className="mt-1 text-sm text-ink-soft">{guest.description}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Scribble color={LABEL_HUE[guest.label]}>{LABELS[guest.label].name}</Scribble>
          <span className="text-sm text-ink-soft">{labelMeans(guest.label, scores.reach === null)}</span>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          <Level name="Fit" value={scores.fit} color={SCORE_HUE.fit} />
          <Level name="Love back" value={scores.love_back} color={SCORE_HUE.love_back} />
          <Level name="Reach" value={scores.reach} color={SCORE_HUE.reach} />
        </dl>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPick}
            disabled={full && !picked}
            aria-pressed={picked}
            className={`key flex-1 ${picked ? "key-lit" : ""}`}
            style={hue("var(--pvw)")}
          >
            {picked ? "Picked to invite" : full ? `Up to ${MAX_PICKS} invites` : "Invite"}
            <span className="sr-only"> {guest.name}</span>
          </button>
          <button
            type="button"
            onClick={onOpen}
            aria-expanded={open}
            aria-controls="deep-dive"
            className={`key flex-1 ${open ? "key-lit" : ""}`}
            style={hue("var(--ink)")}
          >
            Episode &amp; fans
          </button>
        </div>

        {idea ? (
          <div className="flex flex-col gap-1.5 border-t border-line pt-4">
            <p className="font-cond text-xl leading-tight font-semibold">
              <span className="sr-only">Episode idea: </span>
              {idea.title}
            </p>
            <p className="text-sm text-ink-soft">{idea.reason}</p>
          </div>
        ) : (
          <p className="border-t border-line pt-4 text-sm text-ink-dim">
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
                className="inline-flex items-center gap-1 text-fit underline"
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
      </div>
    </section>
  );
}

function Level({ name, value, color }: { name: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="silk text-[0.625rem]" style={{ color }}>
        {name}
      </dt>
      <dd className="flex flex-col gap-1.5">
        <span className="font-cond text-3xl leading-none font-semibold">{value === null ? "–" : out100(value)}</span>
        {value === null ? (
          <span className="text-[0.6875rem] leading-tight text-ink-dim">Too little data</span>
        ) : (
          <Meter value={value} color={color} segments={16} className="h-2" />
        )}
      </dd>
    </div>
  );
}

function Evidence({ evidence }: { evidence: NonNullable<Guest["evidence"]> }) {
  return (
    <dl className="flex flex-col gap-3 border-t border-line pt-4">
      {evidence.shared_tastes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <dt className="silk text-ink-dim">Both audiences love</dt>
          <dd className="flex flex-wrap gap-1.5">
            {evidence.shared_tastes.map((taste) => (
              <span key={taste} className="rounded-[2px] border border-fit/40 bg-fit/10 px-1.5 py-0.5 text-xs text-fit">
                {taste}
              </span>
            ))}
          </dd>
        </div>
      )}
      {evidence.new_podcasts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <dt className="silk text-ink-dim">Their fans&apos; podcasts, new to you</dt>
          <dd className="flex flex-wrap gap-1.5">
            {evidence.new_podcasts.map((podcast) => (
              <span
                key={podcast}
                className="rounded-[2px] border border-reach/40 bg-reach/10 px-1.5 py-0.5 text-xs text-reach"
              >
                {podcast}
              </span>
            ))}
          </dd>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <dt className="silk text-ink-dim">Their fans skew</dt>
        <dd>
          <span className="sr-only">
            {evidence.ages.length ? evidence.ages.map((age) => AGES[age]).join(", ") : "No age data yet"}
          </span>
          <span aria-hidden className="grid grid-cols-6 gap-1">
            {AGE_ORDER.map((age) => {
              const on = evidence.ages.includes(age);
              return (
                <span key={age} className="flex flex-col items-center gap-1">
                  <span className={`h-2 w-full rounded-[1px] ${on ? "lamp" : "lamp-off"}`} style={hue("var(--love)")} />
                  <span className={`text-[0.625rem] ${on ? "text-ink" : "text-ink-dim"}`}>{SHORT_AGE[age]}</span>
                </span>
              );
            })}
          </span>
        </dd>
      </div>
    </dl>
  );
}

export const SHORT_AGE: Record<(typeof AGE_ORDER)[number], string> = {
  "24_and_younger": "≤24",
  "25_to_29": "25–29",
  "30_to_34": "30–34",
  "35_to_44": "35–44",
  "45_to_54": "45–54",
  "55_and_older": "55+",
};
