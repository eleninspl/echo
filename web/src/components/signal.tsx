import { LABELS } from "@/lib/format";

import { LABEL_HUE, SCORE_HUE, Voiceprint } from "./hud";

const TERMS = [
  { term: "Fit", color: SCORE_HUE.fit, means: "Your listeners over-index on them, beyond their fame" },
  { term: "Love back", color: SCORE_HUE.love_back, means: "Their fans over-index on your show" },
  { term: "Reach", color: SCORE_HUE.reach, means: "Their fans are new to you" },
];

// How Echo scores a guest: two audiences overlap; fit runs from your show to the guest, love back runs home,
// and reach is the part of their audience you don't have yet. Rings sound from the show.
export function SignalPath() {
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

        {/* The two nodes, each with a soft halo. */}
        <circle cx="205" cy="230" r="14" fill="var(--fit)" fillOpacity="0.18" />
        <circle cx="365" cy="230" r="14" fill="var(--love)" fillOpacity="0.18" />
        <circle cx="205" cy="230" r="7" fill="var(--fit)" />
        <circle cx="365" cy="230" r="7" fill="var(--love)" />

        <g className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>
          <text x="183" y="236" textAnchor="end" fill="var(--ink)">
            Your show
          </text>
          <text x="387" y="236" fill="var(--ink)">
            Guest
          </text>
          <text x="284" y="160" textAnchor="middle" fill="var(--fit)">
            Fit
          </text>
          <text x="284" y="316" textAnchor="middle" fill="var(--love)">
            Love back
          </text>
        </g>
        {/* Reach: a leader line from the hatched crescent to its label. */}
        <path d="M 420 190 Q 440 120 520 120" fill="none" stroke="var(--reach)" strokeLinecap="round" />
        <circle cx="420" cy="190" r="3" fill="var(--reach)" />
        <text
          x="520"
          y="112"
          textAnchor="end"
          className="font-display"
          fill="var(--reach)"
          style={{ fontSize: 18, fontWeight: 600 }}
        >
          Reach
        </text>
        <text x="70" y="70" className="tag" fill="var(--fit)" style={{ fontSize: 11 }}>
          Your listeners
        </text>
        <text x="490" y="400" textAnchor="end" className="tag" fill="var(--love)" style={{ fontSize: 11 }}>
          Their fans
        </text>
      </svg>
    </figure>
  );
}

// What each label's voiceprint looks like: illustrative shapes for the key, not any guest's scores.
const SHAPES = [
  { label: "sweet_spot", fit: 0.85, love: 0.8, reach: 0.85 },
  { label: "safe", fit: 0.85, love: 0.85, reach: 0.08 },
  { label: "far", fit: 0.55, love: 0.12, reach: 0.9 },
  { label: "long_shot", fit: 0.1, love: 0.75, reach: 0.6 },
] as const;

// The three scores in words under one voiceprint, a lobe each, and what each label's shape looks like: the
// key to the diagram and the whole page.
export function ScoreKey() {
  return (
    <section aria-label="How Echo scores a guest" className="flex flex-col gap-5 @container">
      <div className="flex flex-col">
        <Voiceprint fit={0.9} love={0.9} reach={0.9} bars={72} height={48} className="w-full" />
        <dl className="grid grid-cols-3 gap-3">
          {TERMS.map(({ term, color, means }) => (
            <div key={term} className="flex flex-col items-center gap-1.5 text-center">
              <span aria-hidden className="h-3 w-px" style={{ background: color }} />
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
              <dt className="mt-1 font-display text-lg leading-none font-semibold" style={{ color }}>
                {term}
              </dt>
              <dd className="text-sm leading-snug text-ink-soft">{means}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ul aria-label="What each label looks like" className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-2xl bg-deck p-4 @xl:grid-cols-2">
        {SHAPES.map(({ label, fit, love, reach }) => (
          <li key={label} className="flex items-center gap-3">
            <Voiceprint fit={fit} love={love} reach={reach} bars={22} height={26} className="w-20 shrink-0" />
            <p className="text-sm leading-snug text-ink-soft">
              <span className="font-display font-semibold" style={{ color: LABEL_HUE[label] }}>
                {LABELS[label].name}.
              </span>{" "}
              {label === "sweet_spot" ? "High on all three. Rare, and Echo says so." : LABELS[label].means}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
