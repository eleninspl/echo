import { Lamp, SCORE_HUE } from "./hud";

const TERMS = [
  { term: "Fit", color: SCORE_HUE.fit, means: "Your listeners over-index on them, beyond their fame" },
  { term: "Love back", color: SCORE_HUE.love_back, means: "Their fans over-index on your show" },
  { term: "Reach", color: SCORE_HUE.reach, means: "Their fans are new to you" },
];

// How Echo scores a guest, drawn as a targeting display: two audiences overlap; fit runs from your show to
// the guest, love back runs home, and reach is the part of their audience you don't have yet. Rings sound
// from the show and a scale turns slowly around it all.
export function SignalPath() {
  const ticks = Array.from({ length: 120 }, (_, i) => i);
  return (
    <figure className="relative">
      <svg viewBox="0 0 560 460" className="block w-full" role="img" aria-labelledby="signal-desc">
        <desc id="signal-desc">
          Two overlapping circles: your listeners and the guest&apos;s fans. Fit runs from your show to the guest, love
          back from the guest to your show, and reach is the part of the guest&apos;s fans outside your listeners.
        </desc>
        <defs>
          <clipPath id="theirs">
            <circle cx="330" cy="230" r="120" />
          </clipPath>
          <mask id="outside-ours">
            <rect width="560" height="460" fill="#fff" />
            <circle cx="230" cy="230" r="120" fill="#000" />
          </mask>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--reach)" strokeWidth="1.6" strokeOpacity="0.55" />
          </pattern>
          <radialGradient id="ours-fill">
            <stop offset="0.6" stopColor="var(--fit)" stopOpacity="0.02" />
            <stop offset="1" stopColor="var(--fit)" stopOpacity="0.14" />
          </radialGradient>
          <radialGradient id="theirs-fill">
            <stop offset="0.6" stopColor="var(--love)" stopOpacity="0.02" />
            <stop offset="1" stopColor="var(--love)" stopOpacity="0.14" />
          </radialGradient>
          <marker id="tip-fit" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--fit)" />
          </marker>
          <marker id="tip-love" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--love)" />
          </marker>
        </defs>

        {/* The turning scale around the display. */}
        <g>
          {ticks.map((i) => {
            const a = (i / ticks.length) * Math.PI * 2;
            const inner = i % 10 === 0 ? 196 : 202;
            return (
              <line
                key={i}
                x1={280 + Math.cos(a) * inner}
                y1={230 + Math.sin(a) * inner}
                x2={280 + Math.cos(a) * 208}
                y2={230 + Math.sin(a) * 208}
                stroke={i % 10 === 0 ? "var(--steel-hi)" : "var(--steel)"}
              />
            );
          })}
        </g>
        <circle cx="280" cy="230" r="214" fill="none" stroke="var(--steel)" strokeDasharray="2 6" />
        <line x1="40" x2="520" y1="230" y2="230" stroke="var(--steel)" strokeDasharray="2 4" />
        <line x1="280" x2="280" y1="10" y2="450" stroke="var(--steel)" strokeDasharray="2 4" />

        <circle cx="230" cy="230" r="120" fill="url(#ours-fill)" stroke="var(--fit)" strokeOpacity="0.8" />
        <circle cx="330" cy="230" r="120" fill="url(#theirs-fill)" stroke="var(--love)" strokeOpacity="0.8" />
        <g clipPath="url(#theirs)" mask="url(#outside-ours)">
          <rect width="560" height="460" fill="url(#hatch)" />
        </g>

        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="ring"
            cx="205"
            cy="230"
            r="11"
            fill="none"
            stroke="var(--fit)"
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${i * 0.93}s` }}
          />
        ))}

        <path
          className="flow"
          d="M 216 219 C 252 150, 320 150, 352 218"
          fill="none"
          stroke="var(--fit)"
          strokeWidth="2.5"
          markerEnd="url(#tip-fit)"
        />
        <path
          className="flow"
          d="M 352 242 C 320 310, 252 310, 218 243"
          fill="none"
          stroke="var(--love)"
          strokeWidth="2.5"
          markerEnd="url(#tip-love)"
        />

        {/* The two nodes, each in a reticle. */}
        <g fill="none" strokeWidth="1.5">
          <path d="M191 220v-6h6M213 214h6v6M219 240v6h-6M197 246h-6v-6" stroke="var(--fit)" />
          <path d="M351 220v-6h6M373 214h6v6M379 240v6h-6M357 246h-6v-6" stroke="var(--love)" />
        </g>
        <circle cx="205" cy="230" r="7" fill="var(--fit)" />
        <circle cx="365" cy="230" r="7" fill="var(--love)" />

        <g className="font-display" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "0.08em" }}>
          <text x="183" y="236" textAnchor="end" fill="var(--ink)">
            YOUR SHOW
          </text>
          <text x="387" y="236" fill="var(--ink)">
            GUEST
          </text>
          <text x="284" y="160" textAnchor="middle" fill="var(--fit)">
            FIT
          </text>
          <text x="284" y="316" textAnchor="middle" fill="var(--love)">
            LOVE BACK
          </text>
        </g>
        {/* Reach: a leader line from the hatched crescent to its label. */}
        <path d="M 420 190 L 470 120 H 520" fill="none" stroke="var(--reach)" />
        <circle cx="420" cy="190" r="3" fill="var(--reach)" />
        <text
          x="520"
          y="112"
          textAnchor="end"
          className="font-display"
          fill="var(--reach)"
          style={{ fontSize: 17, fontWeight: 600, letterSpacing: "0.08em" }}
        >
          REACH
        </text>
        <text x="40" y="40" className="tag" fill="var(--fit)" style={{ fontSize: 10 }}>
          Your listeners
        </text>
        <text x="520" y="440" textAnchor="end" className="tag" fill="var(--love)" style={{ fontSize: 10 }}>
          Their fans
        </text>
      </svg>
    </figure>
  );
}

// The three scores in words, and what a sweet spot is: the key to the diagram and the whole console.
export function ScoreKey() {
  return (
    <section aria-label="How Echo scores a guest" className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-px bg-steel sm:grid-cols-3">
        {TERMS.map(({ term, color, means }) => (
          <div key={term} className="flex flex-col gap-1.5 bg-void p-3">
            <dt className="flex items-center gap-2 font-display text-lg leading-none font-semibold" style={{ color }}>
              <span aria-hidden className="h-0.5 w-4" style={{ background: color }} />
              {term}
            </dt>
            <dd className="text-sm leading-snug text-ink-soft">{means}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-2.5 text-sm text-ink-soft">
        <Lamp color="var(--sweet)" className="h-2 w-4" />
        <span>
          <span className="font-display font-semibold tracking-wider text-sweet uppercase">Sweet spot</span>: high on
          all three. Rare, and Echo says so.
        </span>
      </p>
    </section>
  );
}
