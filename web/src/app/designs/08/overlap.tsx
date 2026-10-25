"use client";

import { useState } from "react";

import { styles } from "./styles";

type Part = "all" | "fit" | "love" | "reach";

const PARTS: { key: Part; name: string; color: string; text: string }[] = [
  {
    key: "all",
    name: "Both audiences",
    color: "var(--ink)",
    text: "Your show's listeners and the guest's fans. Echo scores where the two meet, and where they don't.",
  },
  {
    key: "fit",
    name: "Fit",
    color: "var(--fit)",
    text: "Fit runs from your show to the guest: your listeners over-index on them, beyond what the guest's fame alone predicts.",
  },
  {
    key: "love",
    name: "Love back",
    color: "var(--love)",
    text: "Love back runs the other way: the guest's fans over-index on your show.",
  },
  {
    key: "reach",
    name: "Reach",
    color: "var(--reach)",
    text: "Reach is the part of the guest's audience you don't have yet: fans whose favourite podcasts your listeners don't follow.",
  },
];

const SHOW = { x: 232, y: 196 };
const GUEST = { x: 368, y: 196 };
const RADIUS = 132;

export function Overlap() {
  const [part, setPart] = useState<Part>("all");
  const active = PARTS.find((item) => item.key === part) ?? PARTS[0];
  const shown = (...keys: Part[]) => `${styles.part} ${part === "all" || keys.includes(part) ? "" : styles.dim}`;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-1 items-center justify-center">
      <svg viewBox="88 22 424 330" role="img" aria-labelledby="d08-overlap-title" className="h-auto w-full max-w-[34rem]">
        <title id="d08-overlap-title">
          Two overlapping audiences: fit runs from the show to the guest, love back from the guest to the show, and reach
          is the guest&apos;s audience the show doesn&apos;t have yet.
        </title>
        <defs>
          <pattern id="d08-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--reach)" strokeWidth="2.2" strokeOpacity="0.32" />
          </pattern>
          <clipPath id="d08-guest-clip">
            <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} />
          </clipPath>
          <mask id="d08-reach-mask">
            <rect width="600" height="392" fill="#fff" />
            <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="#000" />
          </mask>
          <linearGradient id="d08-node" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0b8ae6" />
            <stop offset="1" stopColor="#5b3df5" />
          </linearGradient>
          {[
            { id: "fit", color: "var(--fit)" },
            { id: "love", color: "var(--love)" },
          ].map((marker) => (
            <marker
              key={marker.id}
              id={`d08-arrow-${marker.id}`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M1 1.2 8.6 5 1 8.8Z" fill={marker.color} />
            </marker>
          ))}
        </defs>

        <g className={shown("fit")}>
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="#fbfbfd" stroke="var(--line-strong)" strokeWidth="1.5" />
        </g>
        <g className={shown("reach")}>
          <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="rgb(11 138 230 / 0.06)" mask="url(#d08-reach-mask)" />
          <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="url(#d08-hatch)" mask="url(#d08-reach-mask)" />
        </g>
        <g className={shown()}>
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="var(--accent-soft)" clipPath="url(#d08-guest-clip)" />
        </g>
        <g className={shown("love", "reach")}>
          <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
        </g>

        <g className={shown()} fontSize="14" fill="var(--accent-deep)" fontWeight="500" textAnchor="middle">
          <text x="300" y="190">Shared</text>
          <text x="300" y="208">taste</text>
        </g>

        <g className={shown("fit")}>
          <path
            d="M180 176 C 220 30, 380 30, 418 172"
            fill="none"
            stroke="var(--fit)"
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd="url(#d08-arrow-fit)"
          />
          <Pill x={300} y={66} text="Fit" color="var(--fit)" />
        </g>

        <g className={shown("love")}>
          <path
            d="M420 216 C 380 362, 220 362, 182 220"
            fill="none"
            stroke="var(--love)"
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd="url(#d08-arrow-love)"
          />
          <Pill x={300} y={326} text="Love back" color="var(--love)" />
        </g>

        <g className={shown("reach")}>
          <Pill x={448} y={124} text="Reach" color="var(--reach)" />
        </g>

        <g className={shown("fit")}>
          <rect x="110" y="176" width="116" height="40" rx="20" fill="url(#d08-node)" />
          <g transform="translate(131 196)" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
            <circle r="3.4" fill="#fff" stroke="none" />
            <path d="M-6.5 -6.5a9.2 9.2 0 0 0 0 13M6.5 -6.5a9.2 9.2 0 0 1 0 13" />
          </g>
          <text x="145" y="201" fontSize="14.5" fontWeight="600" fill="#fff">
            Your show
          </text>
        </g>

        <g className={shown("love", "reach")}>
          <rect x="384" y="176" width="98" height="40" rx="20" fill="#fff" stroke="var(--ink)" strokeWidth="1.5" />
          <circle cx="405" cy="191" r="4.4" fill="var(--ink)" />
          <path d="M396.6 205 a8.4 7.4 0 0 1 16.8 0Z" fill="var(--ink)" />
          <text x="420" y="201" fontSize="14.5" fontWeight="600" fill="var(--ink)">
            Guest
          </text>
        </g>

        <g fontSize="13.5" fill="var(--ink-3)">
          <text x="96" y="44" className={shown("fit")}>
            Your listeners
          </text>
          <text x="504" y="44" textAnchor="end" className={shown("love", "reach")}>
            The guest&apos;s fans
          </text>
        </g>
      </svg>
      </div>

      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Show one part" className="flex flex-wrap gap-1.5">
          {PARTS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={part === item.key}
              onClick={() => setPart(item.key)}
              className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                part === item.key
                  ? "border-(--ink) bg-(--ink) text-white"
                  : "border-(--line-strong) bg-white text-(--ink-2) hover:border-(--ink-3)"
              }`}
            >
              <span aria-hidden className="size-2 rounded-full" style={{ background: item.key === "all" ? "var(--sweet)" : item.color }} />
              {item.name}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="min-h-[3em] max-w-[60ch] text-[14px] leading-relaxed text-(--ink-2)">
          {active.text}
        </p>
      </div>
    </div>
  );
}

function Pill({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const width = text.length * 8.6 + 34;
  return (
    <g transform={`translate(${x - width / 2} ${y - 15})`}>
      <rect width={width} height="30" rx="15" fill="#fff" stroke={color} strokeWidth="1.5" />
      <circle cx="15" cy="15" r="4.2" fill={color} />
      <text x="26" y="20" fontSize="14.5" fontWeight="600" fill="var(--ink)">
        {text}
      </text>
    </g>
  );
}
