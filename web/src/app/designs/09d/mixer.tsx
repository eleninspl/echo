"use client";

import { useState, type CSSProperties } from "react";

import type { Guest, Label } from "@/lib/echo";

import { useDeck } from "./deck";
import { styles } from "./styles";
import { LABEL_NAME, TONE, Voiceprint, type Part } from "./wave";

type Mix = Record<Part, number>;

const FALLBACK: Mix = { fit: 72, love: 58, reach: 52 };

const ORDER: Label[] = ["sweet_spot", "far", "long_shot", "safe", "balanced"];

const MEANING: Record<Label, string> = {
  sweet_spot:
    "High on all three at once. It's rare, usually 1 to 4 guests in 20, and Echo tells you how many it found.",
  far: "Brings new people who may not stay.",
  long_shot: "Their fans might come, but your audience is lukewarm about them.",
  safe: "Your audience will likely enjoy it, but it adds few new listeners.",
  balanced: "Decent on each, not top on any.",
};

const RULE: Record<Label, string> = {
  sweet_spot: "Fit 50 or more, love back and reach 33 or more.",
  far: "Reach 67 or more with love back under 33.",
  long_shot: "Fit under 33.",
  safe: "Reach under 33.",
  balanced: "None of the rules above.",
};

const SLIDERS: {
  part: Part;
  name: string;
  path: string;
  text: string;
  sweetFrom: number;
}[] = [
  {
    part: "fit",
    name: "Fit",
    path: "Your show to the guest",
    text: "Your listeners over-index on the guest, beyond what fame alone explains.",
    sweetFrom: 50,
  },
  {
    part: "love",
    name: "Love back",
    path: "The guest to your show",
    text: "The guest's fans over-index on your show, so the people they bring have a reason to stay.",
    sweetFrom: 33,
  },
  {
    part: "reach",
    name: "Reach",
    path: "Fans you don't have yet",
    text: "The guest's fans favour podcasts your audience doesn't: new ears.",
    sweetFrom: 33,
  },
];

function labelFor({ fit, love, reach }: Mix): Label {
  if (fit >= 50 && love >= 33 && reach >= 33) return "sweet_spot";
  if (reach >= 67 && love < 33) return "far";
  if (fit < 33) return "long_shot";
  if (reach < 33) return "safe";
  return "balanced";
}

function mixOf(guest: Guest): Mix {
  return {
    fit: Math.round(guest.scores.fit * 100),
    love: Math.round(guest.scores.love_back * 100),
    reach: Math.round((guest.scores.reach ?? 0) * 100),
  };
}

export function Mixer() {
  const deck = useDeck();
  const [own, setOwn] = useState<Mix | null>(null);
  const [exampleRef, setExampleRef] = useState<string | null>(null);

  const examples = new Map<Label, Guest>();
  for (const guest of deck.guests ?? []) {
    if (guest.scores.reach !== null && !examples.has(guest.label)) examples.set(guest.label, guest);
  }
  const fallbackExample = examples.get("sweet_spot") ?? null;
  const example =
    own !== null ? null : (exampleRef && deck.guests?.find((guest) => guest.ref === exampleRef)) || fallbackExample;
  const mix = own ?? (example ? mixOf(example) : FALLBACK);
  const label = labelFor(mix);
  const showTitle = deck.current?.show.title;

  function move(part: Part, value: number) {
    setOwn({ ...mix, [part]: value });
  }

  function loadExample(guest: Guest) {
    setOwn(null);
    setExampleRef(guest.ref);
  }

  return (
    <div className={`${styles.player} flex flex-col gap-7 rounded-[36px] p-5 sm:p-8`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-xs font-bold tracking-[0.18em] text-(--v9d-soft) uppercase">Try the three scores</h3>
          <p aria-live="polite" className="text-sm text-(--v9d-soft)">
            {example && showTitle ? (
              <>
                Showing <span className="font-semibold text-(--v9d-ink)">{example.name}</span> from {showTitle}
              </>
            ) : own ? (
              "Your own mix"
            ) : (
              "Move a slider to try a mix"
            )}
          </p>
        </div>
        <Voiceprint
          fit={mix.fit / 100}
          loveBack={mix.love / 100}
          reach={mix.reach / 100}
          bars={66}
          width={660}
          height={92}
          className="h-[72px] w-full sm:h-[92px]"
        />
      </div>

      <div className="flex flex-col gap-6">
        {SLIDERS.map((slider) => (
          <Slider
            key={slider.part}
            {...slider}
            value={mix[slider.part]}
            onChange={(value) => move(slider.part, value)}
          />
        ))}
      </div>

      <p className="text-sm text-(--v9d-soft)">
        Scores run 0 to 100: where a guest ranks among all the guests Echo found for the show.
      </p>

      <div className="flex flex-col gap-4 border-t border-(--v9d-line) pt-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-(--v9d-soft)">Echo labels this guest</p>
          <p
            aria-live="polite"
            className={`${styles.headline} w-fit text-[2.5rem] leading-none ${label === "sweet_spot" ? styles.gradientText : ""}`}
          >
            {LABEL_NAME[label]}
          </p>
        </div>
        <p className="max-w-[52ch] text-lg text-(--v9d-ink)">{MEANING[label]}</p>
        <ul aria-label="Echo's labels, first rule that matches wins" className="flex flex-wrap gap-2">
          {ORDER.map((item) => {
            const guest = examples.get(item);
            const lit = item === label;
            const chip = `inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              lit
                ? item === "sweet_spot"
                  ? `${styles.gradientFill} text-(--v9d-on-hue)`
                  : "bg-(--v9d-ink) text-(--v9d-on-hue)"
                : "text-(--v9d-soft) ring-1 ring-(--v9d-line)"
            }`;
            return (
              <li key={item}>
                {guest ? (
                  <button
                    type="button"
                    onClick={() => loadExample(guest)}
                    aria-label={`${LABEL_NAME[item]}: load ${guest.name} from ${showTitle}`}
                    className={`${chip} ${lit ? "" : "hover:text-(--v9d-ink) hover:ring-(--v9d-dim)"}`}
                  >
                    {LABEL_NAME[item]}
                  </button>
                ) : (
                  <span className={chip}>{LABEL_NAME[item]}</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-(--v9d-dim)">
          <span className="text-(--v9d-soft)">{LABEL_NAME[label]}:</span> {RULE[label]} Echo checks the labels in this
          order and the first match wins.
          {examples.size > 0 && " Pick one to load a real guest of that kind."}
        </p>
      </div>
    </div>
  );
}

function Slider({
  part,
  name,
  path,
  text,
  sweetFrom,
  value,
  onChange,
}: {
  part: Part;
  name: string;
  path: string;
  text: string;
  sweetFrom: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = `v9d-slider-${part}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span className={`${styles.display} text-lg font-semibold`} style={{ color: TONE[part] }}>
            {name}
          </span>
          <span className="text-sm text-(--v9d-soft)">{path}</span>
        </label>
        <output htmlFor={id} className={`${styles.display} text-2xl leading-none font-semibold tabular-nums`}>
          {value}
        </output>
      </div>
      <div className="flex flex-col gap-1">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-describedby={`${id}-text`}
          className={styles.slider}
          style={
            {
              "--tone": TONE[part],
              "--level": `${value}%`,
              "--zone": `${sweetFrom}%`,
            } as CSSProperties
          }
        />
        <span aria-hidden className="relative h-4">
          <span
            className="absolute top-0 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-(--v9d-soft)"
            style={{
              left: `calc(12px + (100% - 24px) * ${sweetFrom / 100} - 1px)`,
            }}
          >
            <span className="h-3.5 w-0.5 rounded-full" style={{ background: TONE[part] }} />
            Sweet spot from {sweetFrom}
          </span>
        </span>
      </div>
      <p id={`${id}-text`} className="text-(--v9d-soft)">
        {text}
      </p>
    </div>
  );
}
