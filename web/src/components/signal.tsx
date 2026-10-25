import { FRAME, LABEL_HUE, Voiceprint } from "./hud";
import { ScoreTerms } from "./score-terms";

// What each label's voiceprint looks like: illustrative shapes for the key, not any guest's scores.
const SHAPES = [
  {
    label: "sweet_spot",
    name: "Sweet spot",
    means: "High on all three.",
    fit: 0.85,
    love: 0.8,
    reach: 0.85,
  },
  { label: "safe", name: "Safe", means: "Loved both ways, few new listeners.", fit: 0.85, love: 0.85, reach: 0.08 },
  { label: "far", name: "Far", means: "New listeners who may not stay.", fit: 0.55, love: 0.12, reach: 0.9 },
  {
    label: "long_shot",
    name: "Long shot",
    means: "Their fans might come; yours aren't into them.",
    fit: 0.1,
    love: 0.75,
    reach: 0.6,
  },
] as const;

// How Echo scores a guest, a score at a time, then what each label's shape looks like: the key to the whole app.
export function ScoreKey() {
  return (
    <section aria-labelledby="how" className="flex flex-col gap-4 pb-20">
      <h2 id="how" className={`${FRAME} font-display text-2xl leading-tight font-semibold lg:h-10 lg:text-3xl`}>
        How Echo scores a guest
      </h2>
      <ScoreTerms />
      <div className={FRAME}>
        <ul
          aria-label="What each label looks like"
          className="mt-10 grid grid-cols-1 gap-x-8 gap-y-4 rounded-2xl bg-deck p-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          {SHAPES.map(({ label, name, means, fit, love, reach }) => (
            <li key={label} className="flex items-center gap-3">
              <Voiceprint fit={fit} love={love} reach={reach} bars={22} height={26} className="w-20 shrink-0" />
              <p className="text-sm leading-snug text-ink-soft">
                <span className="font-display font-semibold" style={{ color: LABEL_HUE[label] }}>
                  {name}.
                </span>{" "}
                {means}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
