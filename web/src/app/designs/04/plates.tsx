import type { ReactNode } from "react";

import { styles } from "./styles";
import { INK } from "./ink";

const SHOW = { x: 92, y: 90 };
const GUEST = { x: 150, y: 90 };
const R = 58;

const blend = { mixBlendMode: "multiply" } as const;

function SolidCircle({ at, ink }: { at: { x: number; y: number }; ink: string }) {
  return (
    <g filter="url(#d04-ink)" style={blend}>
      <circle cx={at.x} cy={at.y} r={R} fill={ink} />
    </g>
  );
}

function ScreenedCircle({ at, pattern, ink }: { at: { x: number; y: number }; pattern: string; ink: string }) {
  return (
    <g style={blend}>
      <circle cx={at.x} cy={at.y} r={R} fill={`url(#${pattern})`} />
      <circle cx={at.x + 1.5} cy={at.y - 1} r={R} fill="none" stroke={ink} strokeWidth="1.6" />
    </g>
  );
}

const SHOW_TO_GUEST = "M70 66 C 92 14, 150 8, 172 52";
const GUEST_TO_SHOW = "M172 116 C 150 170, 92 172, 72 118";

function Arrow({ d, width = 3.2 }: { d: string; width?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={INK.overprint}
      strokeWidth={width}
      strokeLinecap="round"
      markerEnd="url(#d04-arrowhead)"
    />
  );
}

function FitDrawing() {
  return (
    <>
      <ScreenedCircle at={GUEST} pattern="d04-dots-blue" ink={INK.blue} />
      <SolidCircle at={SHOW} ink={INK.pink} />
      <Arrow d={SHOW_TO_GUEST} />
    </>
  );
}

function LoveBackDrawing() {
  return (
    <>
      <ScreenedCircle at={SHOW} pattern="d04-dots-pink" ink={INK.pink} />
      <SolidCircle at={GUEST} ink={INK.blue} />
      <Arrow d={GUEST_TO_SHOW} />
    </>
  );
}

function ReachDrawing() {
  return (
    <>
      <defs>
        <mask id="d04-reach-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="180">
          <rect width="240" height="180" fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={R + 3} fill="black" />
        </mask>
      </defs>
      <g mask="url(#d04-reach-mask)">
        <SolidCircle at={GUEST} ink={INK.blue} />
      </g>
      <circle
        cx={SHOW.x}
        cy={SHOW.y}
        r={R}
        fill="none"
        stroke={INK.pink}
        strokeWidth="2.4"
        strokeDasharray="1 6"
        strokeLinecap="round"
        style={blend}
      />
      <g fill={INK.paper}>
        <circle cx="186" cy="68" r="3" />
        <circle cx="196" cy="92" r="3" />
        <circle cx="184" cy="116" r="3" />
      </g>
    </>
  );
}

function SweetSpotDrawing() {
  return (
    <>
      <SolidCircle at={SHOW} ink={INK.pink} />
      <SolidCircle at={GUEST} ink={INK.blue} />
      <Arrow d={SHOW_TO_GUEST} width={2.4} />
      <Arrow d={GUEST_TO_SHOW} width={2.4} />
      <path
        d="M121 72 L124.5 84 L137 85.5 L127 93 L130.5 105 L121 98 L111.5 105 L115 93 L105 85.5 L117.5 84 Z"
        fill={INK.paper}
      />
    </>
  );
}

type PlateInfo = { key: string; tag: string; title: string; body: ReactNode; drawing: ReactNode; stamp?: string };

const PLATES: PlateInfo[] = [
  {
    key: "fit",
    tag: "show → guest",
    title: "Fit",
    body: "Your listeners like this guest more than the guest's fame alone explains.",
    drawing: <FitDrawing />,
  },
  {
    key: "love-back",
    tag: "guest → show",
    title: "Love back",
    body: "The guest's fans like your show too, so the new listeners have a reason to stay.",
    drawing: <LoveBackDrawing />,
  },
  {
    key: "reach",
    tag: "new ears",
    title: "Reach",
    body: "The guest's fans who don't listen to you yet. High fit with low reach is safe, but adds nobody.",
    drawing: <ReachDrawing />,
  },
  {
    key: "sweet-spot",
    tag: "all three",
    title: "Sweet spot",
    body: "High on fit, love back and reach at once. It's rare, and Echo says so.",
    drawing: <SweetSpotDrawing />,
    stamp: "1 to 4 guests in 20",
  },
];

export function Plates() {
  return (
    <ol className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-4">
      {PLATES.map((plate) => (
        <li
          key={plate.key}
          className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] items-start gap-x-4 gap-y-4 sm:flex sm:flex-col"
        >
          <div className="relative pt-2 sm:pt-0">
            <svg viewBox="0 0 240 180" className="w-full max-w-[300px] overflow-visible" aria-hidden focusable="false">
              {plate.drawing}
            </svg>
            {plate.stamp && (
              <span className={`${styles.mono} ${styles.stamp} mt-3 sm:absolute sm:top-1 sm:-right-2 sm:mt-0`}>{plate.stamp}</span>
            )}
          </div>
          <div className="flex flex-col gap-2 border-t-2 border-dashed border-(--blue) pt-3 sm:pt-4">
            <span className={`${styles.mono} text-sm font-bold tracking-wide text-(--blue) uppercase`}>{plate.tag}</span>
            <h3 className={`${styles.display} text-[2.1rem] leading-[0.9] text-(--overprint) uppercase sm:text-[2.6rem]`}>{plate.title}</h3>
            <p className="max-w-[34ch] text-[0.98rem] leading-snug text-(--blue) sm:text-[1.05rem]">{plate.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
