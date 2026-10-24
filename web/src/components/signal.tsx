import { Lamp, PanelHead, SCORE_HUE } from "./gallery";

const TERMS = [
  { term: "Fit", color: SCORE_HUE.fit, means: "Your listeners over-index on them, beyond their fame" },
  { term: "Love back", color: SCORE_HUE.love_back, means: "Their fans over-index on your show" },
  { term: "Reach", color: SCORE_HUE.reach, means: "Their fans are new to you" },
];

// The signal path: how Echo scores a guest, drawn. Two audiences overlap; fit runs from your show to
// the guest, love back runs home, and reach is the part of their audience you don't have yet.
export function SignalPath() {
  return (
    <section aria-labelledby="signal" className="panel flex flex-col rounded-[4px]">
      <PanelHead id="signal" title="Signal path · how Echo scores a guest" />
      <div className="monitor relative m-2 overflow-hidden rounded-[2px]">
        <p aria-hidden className="silk absolute inset-x-3 top-3 flex justify-between">
          <span className="text-fit">Your listeners</span>
          <span className="text-love">Their fans</span>
        </p>
        <svg viewBox="0 0 520 330" className="mx-auto block w-full max-w-md md:max-w-none" role="img" aria-labelledby="signal-desc">
          <desc id="signal-desc">
            Two overlapping circles: your listeners and the guest&apos;s fans. Fit runs from your show to the guest,
            love back from the guest to your show, and reach is the part of the guest&apos;s fans outside your
            listeners.
          </desc>
          <defs>
            <clipPath id="theirs">
              <circle cx="320" cy="165" r="118" />
            </clipPath>
            <mask id="outside-ours">
              <rect width="520" height="330" fill="#fff" />
              <circle cx="200" cy="165" r="118" fill="#000" />
            </mask>
            <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="var(--reach)" strokeWidth="2" strokeOpacity="0.5" />
            </pattern>
            <marker
              id="tip-fit"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" fill="var(--fit)" />
            </marker>
            <marker
              id="tip-love"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" fill="var(--love)" />
            </marker>
          </defs>

          {/* Graticule */}
          {[110, 220, 330, 440].map((x) => (
            <line key={x} x1={x} x2={x} y1={0} y2={330} stroke="var(--line)" strokeOpacity="0.5" />
          ))}
          {[82, 165, 248].map((y) => (
            <line key={y} x1={0} x2={520} y1={y} y2={y} stroke="var(--line)" strokeOpacity="0.5" />
          ))}

          <circle
            cx="200"
            cy="165"
            r="118"
            fill="var(--fit)"
            fillOpacity="0.07"
            stroke="var(--fit)"
            strokeOpacity="0.7"
          />
          <circle
            cx="320"
            cy="165"
            r="118"
            fill="var(--love)"
            fillOpacity="0.07"
            stroke="var(--love)"
            strokeOpacity="0.7"
          />
          <g clipPath="url(#theirs)" mask="url(#outside-ours)">
            <rect width="520" height="330" fill="url(#hatch)" />
          </g>

          {/* Echo rings sounding from the show. */}
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              className="ring"
              cx="175"
              cy="165"
              r="10"
              fill="none"
              stroke="var(--fit)"
              vectorEffect="non-scaling-stroke"
              style={{ animationDelay: `${i * 0.9}s` }}
            />
          ))}

          {/* The arcs leave and land on the nodes' inner edges, so the labels beside the nodes stay clear. */}
          <path
            className="flow"
            d="M 186 155 C 225 84, 300 84, 334 154"
            fill="none"
            stroke="var(--fit)"
            strokeWidth="2.5"
            markerEnd="url(#tip-fit)"
          />
          <path
            className="flow"
            d="M 334 176 C 300 246, 225 246, 188 177"
            fill="none"
            stroke="var(--love)"
            strokeWidth="2.5"
            markerEnd="url(#tip-love)"
          />

          <circle cx="175" cy="165" r="9" fill="var(--fit)" />
          <circle cx="345" cy="165" r="9" fill="var(--love)" />

          <g className="signal-label font-cond">
            <text x="160" y="171" textAnchor="end" fill="var(--ink)">
              YOUR SHOW
            </text>
            <text x="360" y="171" fill="var(--ink)">
              GUEST
            </text>
            <text x="260" y="90" textAnchor="middle" fill="var(--fit)">
              FIT
            </text>
            <text x="260" y="262" textAnchor="middle" fill="var(--love)">
              LOVE BACK
            </text>
            <text x="398" y="104" fill="var(--reach)">
              REACH
            </text>
          </g>
        </svg>
      </div>
    </section>
  );
}

// The three scores in words, and what on air means: the key to the signal path and the whole gallery.
export function ScoreKey() {
  return (
    <section aria-label="How Echo scores a guest" className="panel rounded-[4px]">
      <dl className="grid grid-cols-1 gap-px p-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
        {TERMS.map(({ term, color, means }) => (
          <div key={term} className="flex flex-col gap-1 px-2 py-2">
            <dt className="font-cond text-lg leading-none font-semibold" style={{ color }}>
              {term}
            </dt>
            <dd className="text-sm leading-snug text-ink-soft">{means}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-sm text-ink-soft">
        <Lamp color="var(--tally)" className="h-2.5 w-4" />
        <span>
          <span className="font-cond font-semibold tracking-wider text-tally uppercase">On air</span> · high on all
          three. Rare, and Echo says so.
        </span>
      </p>
    </section>
  );
}
