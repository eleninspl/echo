import type { CSSProperties, ReactNode } from "react";

import type { Label } from "@/lib/echo";

import { styles } from "./styles";

export const INK = "#2b2522";
export const PAPER = "#fffdf8";

export const TONES = {
  lilac: { base: "#dcd2f5", tint: "#eee9fb", deep: "#5b47b0" },
  peach: { base: "#f8be9c", tint: "#ffe8da", deep: "#b4471f" },
  rose: { base: "#f4afc0", tint: "#fde4ea", deep: "#b0365a" },
  mint: { base: "#a9ddbc", tint: "#dff3e6", deep: "#276e45" },
  butter: { base: "#f6d56b", tint: "#fcf0c2", deep: "#7a5c00" },
} as const;

export type Tone = keyof typeof TONES;

export const LABEL_TONE: Record<Label, Tone> = {
  sweet_spot: "butter",
  safe: "peach",
  far: "mint",
  long_shot: "rose",
  balanced: "lilac",
};

const HAND: CSSProperties = {
  fontFamily: "var(--font-echo-hand), ui-rounded, sans-serif",
  fontVariationSettings: '"INFM" 70, "BNCE" 35',
};

const DISPLAY: CSSProperties = {
  fontFamily: "var(--font-echo-display), ui-sans-serif, sans-serif",
};

export function toneFor(text: string): Tone {
  const order: Tone[] = ["peach", "mint", "lilac", "rose", "butter"];
  let sum = 0;
  for (const char of text) sum = (sum * 31 + char.charCodeAt(0)) % 9973;
  return order[sum % order.length];
}

function bubblePath(x: number, y: number, w: number, h: number, r: number, tailAt: number, tip: [number, number]) {
  const right = x + w;
  const bottom = y + h;
  return [
    `M${x + r} ${y}`,
    `H${right - r}`,
    `Q${right} ${y} ${right} ${y + r}`,
    `V${bottom - r}`,
    `Q${right} ${bottom} ${right - r} ${bottom}`,
    `H${tailAt + 13}`,
    `L${tip[0]} ${tip[1]}`,
    `L${tailAt - 13} ${bottom}`,
    `H${x + r}`,
    `Q${x} ${bottom} ${x} ${bottom - r}`,
    `V${y + r}`,
    `Q${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

function Face({ x, y, scale = 1, cheeks = true }: { x: number; y: number; scale?: number; cheeks?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {cheeks && (
        <>
          <circle cx={-22} cy={9} r={6.5} fill={TONES.rose.base} opacity={0.85} />
          <circle cx={22} cy={9} r={6.5} fill={TONES.rose.base} opacity={0.85} />
        </>
      )}
      <circle cx={-12} cy={-3} r={4.6} fill={INK} />
      <circle cx={12} cy={-3} r={4.6} fill={INK} />
      <path d="M-10 9 Q0 19 10 9" fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
    </g>
  );
}

export function HeartShape({ x, y, size = 20, fill, className }: { x: number; y: number; size?: number; fill: string; className?: string }) {
  const k = size / 20;
  return (
    <g className={className}>
      <path
        transform={`translate(${x - size / 2} ${y - size / 2}) scale(${k})`}
        d="M10 18 C3 12.5 0.5 9 2.6 5.2 C4.6 1.8 8.6 2.2 10 5.4 C11.4 2.2 15.4 1.8 17.4 5.2 C19.5 9 17 12.5 10 18 Z"
        fill={fill}
        stroke={INK}
        strokeWidth={1.8 / k}
        strokeLinejoin="round"
      />
    </g>
  );
}

function SparklePath({ x, y, size, fill }: { x: number; y: number; size: number; fill: string }) {
  const s = size / 2;
  const n = s * 0.22;
  return (
    <path
      d={`M${x} ${y - s} C${x + n} ${y - n} ${x + n} ${y - n} ${x + s} ${y} C${x + n} ${y + n} ${x + n} ${y + n} ${x} ${y + s} C${x - n} ${y + n} ${x - n} ${y + n} ${x - s} ${y} C${x - n} ${y - n} ${x - n} ${y - n} ${x} ${y - s} Z`}
      fill={fill}
      stroke={INK}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  );
}

export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 236" className={className} aria-hidden>
      <path
        d="M176 70 C224 6 296 6 344 70"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      <HeartShape x={222} y={38} size={22} fill={TONES.rose.base} className={styles.float} />
      <HeartShape x={300} y={36} size={18} fill={TONES.peach.base} className={styles.floatLate} />

      <path d={bubblePath(30, 58, 150, 100, 34, 148, [186, 186])} fill={TONES.peach.base} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M46 92 C46 34 164 34 164 92" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <rect x={34} y={84} width={20} height={34} rx={9} fill={TONES.lilac.deep} stroke={INK} strokeWidth={3} />
      <rect x={156} y={84} width={20} height={34} rx={9} fill={TONES.lilac.deep} stroke={INK} strokeWidth={3} />
      <Face x={105} y={110} />

      <circle cx={474} cy={56} r={19} fill="#8fcfa8" stroke={INK} strokeWidth={3} />
      <circle cx={467} cy={53} r={2.6} fill={INK} />
      <circle cx={481} cy={53} r={2.6} fill={INK} />
      <circle cx={500} cy={84} r={15} fill={TONES.butter.base} stroke={INK} strokeWidth={3} />
      <circle cx={495} cy={82} r={2.2} fill={INK} />
      <circle cx={505} cy={82} r={2.2} fill={INK} />
      <path d={bubblePath(340, 58, 150, 100, 34, 372, [334, 186])} fill={TONES.mint.base} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <Face x={415} y={110} />

      <g className={styles.waveLeft}>
        <path d="M228 182 Q206 170 206 146" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <circle cx={206} cy={142} r={6} fill={TONES.butter.base} stroke={INK} strokeWidth={3} />
      </g>
      <g className={styles.wave}>
        <path d="M292 182 Q314 170 314 146" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <circle cx={314} cy={142} r={6} fill={TONES.butter.base} stroke={INK} strokeWidth={3} />
      </g>
      <circle cx={260} cy={182} r={38} fill={TONES.butter.base} stroke={INK} strokeWidth={3} />
      <Face x={260} y={182} scale={0.86} />
      <SparklePath x={260} y={124} size={22} fill={PAPER} />

      <g style={HAND} fontSize={17} fill={INK} textAnchor="middle">
        <text x={92} y={212} transform="rotate(-4 92 212)">your audience</text>
        <text x={432} y={212} transform="rotate(3 432 212)">their audience</text>
        <text x={260} y={78} fontSize={15} opacity={0.8}>
          the guest
        </text>
      </g>
    </svg>
  );
}

function Pill({ x, y, width, fill, children }: { x: number; y: number; width: number; fill: string; children: ReactNode }) {
  return (
    <g>
      <rect x={x - width / 2} y={y - 21} width={width} height={42} rx={21} fill={fill} stroke={INK} strokeWidth={2.6} />
      <text x={x} y={y + 8.5} textAnchor="middle" fontSize={24} fontWeight={700} fill={INK} style={DISPLAY}>
        {children}
      </text>
    </g>
  );
}

function Listener({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-15 25 C-15 11 15 11 15 25" fill={PAPER} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={0} cy={0} r={10} fill={PAPER} stroke={INK} strokeWidth={2.6} />
      <circle cx={-3.5} cy={-1} r={1.6} fill={INK} />
      <circle cx={3.5} cy={-1} r={1.6} fill={INK} />
    </g>
  );
}

export function ScoreDiagram({ className = "" }: { className?: string }) {
  const show = { x: 230, y: 250 };
  const fans = { x: 400, y: 250 };
  const r = 148;
  return (
    <svg viewBox="0 0 700 500" role="img" aria-labelledby="d10-diagram-title d10-diagram-desc" className={className}>
      <title id="d10-diagram-title">Two audiences and one guest</title>
      <desc id="d10-diagram-desc">
        Your audience and the guest&apos;s fans overlap. Fit runs from your show to the guest. Love back runs from
        the guest to your show. Reach is the part of the guest&apos;s fans your show doesn&apos;t have yet.
      </desc>
      <defs>
        <clipPath id="d10-show-circle">
          <circle cx={show.x} cy={show.y} r={r} />
        </clipPath>
        <pattern id="d10-shared" width="13" height="13" patternUnits="userSpaceOnUse">
          <circle cx="6.5" cy="6.5" r="1.7" fill={INK} opacity="0.3" />
        </pattern>
        <marker id="d10-head-fit" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
          <path d="M1 1.5 L10.5 6 L1 10.5 Z" fill={TONES.peach.deep} stroke={TONES.peach.deep} strokeLinejoin="round" />
        </marker>
        <marker id="d10-head-love" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
          <path d="M1 1.5 L10.5 6 L1 10.5 Z" fill={TONES.rose.deep} stroke={TONES.rose.deep} strokeLinejoin="round" />
        </marker>
      </defs>

      <circle cx={show.x} cy={show.y} r={r} fill={TONES.lilac.tint} />
      <circle cx={fans.x} cy={fans.y} r={r} fill={TONES.mint.base} />
      <g clipPath="url(#d10-show-circle)">
        <circle cx={fans.x} cy={fans.y} r={r} fill="#e6e6e4" />
        <circle cx={fans.x} cy={fans.y} r={r} fill="url(#d10-shared)" />
      </g>
      <circle cx={show.x} cy={show.y} r={r} fill="none" stroke={INK} strokeWidth={3} />
      <circle cx={fans.x} cy={fans.y} r={r} fill="none" stroke={INK} strokeWidth={3} />

      <g style={HAND} fill={INK} textAnchor="middle" fontSize={23}>
        <text x={315} y={243}>shared</text>
        <text x={315} y={269}>tastes</text>
      </g>

      <g transform="translate(150 246)">
        <rect x={-17} y={-46} width={34} height={60} rx={17} fill={TONES.peach.base} stroke={INK} strokeWidth={3} />
        <path d="M-8 -28 H8 M-8 -17 H8 M-8 -6 H8" stroke={INK} strokeWidth={2.2} strokeLinecap="round" opacity={0.55} />
        <path d="M-28 -6 C-28 30 28 30 28 -6" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <path d="M0 22 V40 M-15 40 H15" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </g>

      <Listener x={468} y={148} />
      <Listener x={522} y={196} />
      <Listener x={512} y={318} />
      <Listener x={448} y={346} />

      <circle cx={470} cy={250} r={36} fill={TONES.butter.base} stroke={INK} strokeWidth={3} />
      <Face x={470} y={250} scale={0.78} />
      <SparklePath x={500} y={212} size={26} fill={TONES.butter.base} />

      <path
        d="M168 194 C226 48 398 48 446 214"
        fill="none"
        stroke={TONES.peach.deep}
        strokeWidth={4.5}
        strokeLinecap="round"
        markerEnd="url(#d10-head-fit)"
      />
      <path
        d="M448 288 C400 446 230 446 170 304"
        fill="none"
        stroke={TONES.rose.deep}
        strokeWidth={4.5}
        strokeLinecap="round"
        markerEnd="url(#d10-head-love)"
      />

      <Pill x={312} y={86} width={78} fill={TONES.peach.base}>
        fit
      </Pill>
      <Pill x={315} y={410} width={140} fill={TONES.rose.base}>
        love back
      </Pill>

      <path d="M546 268 C566 276 578 276 592 270" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="1 7" />
      <Pill x={640} y={262} width={100} fill={TONES.mint.base}>
        reach
      </Pill>
      <text x={640} y={314} textAnchor="middle" fontSize={23} fill={INK} style={HAND}>
        new ears
      </text>

      <Pill x={606} y={70} width={150} fill={TONES.butter.base}>
        sweet spot
      </Pill>
      <text x={606} y={122} textAnchor="middle" fontSize={23} fill={INK} style={HAND}>
        all three high
      </text>
      <path d="M598 136 C590 176 556 196 520 204" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="1 7" />

      <g style={HAND} fill={INK} fontSize={25}>
        <text x={30} y={86} transform="rotate(-6 30 86)">your audience</text>
        <text x={470} y={452} transform="rotate(4 470 452)">the guest&apos;s fans</text>
      </g>
    </svg>
  );
}

export function StepIcon({ kind }: { kind: "find" | "meet" | "invite" }) {
  if (kind === "find") {
    return (
      <svg viewBox="0 0 56 56" className="size-12" aria-hidden>
        <path d="M34 36 L46 48" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <circle cx={25} cy={25} r={15} fill={PAPER} stroke={INK} strokeWidth={3} />
        <path d={bubblePath(16, 17, 18, 13, 5, 21, [18, 34])} fill={TONES.lilac.base} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "meet") {
    return (
      <svg viewBox="0 0 56 56" className="size-12" aria-hidden>
        <circle cx={20} cy={31} r={13} fill={TONES.butter.base} stroke={INK} strokeWidth={3} />
        <circle cx={38} cy={25} r={12} fill={PAPER} stroke={INK} strokeWidth={3} />
        <circle cx={16} cy={29} r={1.9} fill={INK} />
        <circle cx={24} cy={29} r={1.9} fill={INK} />
        <path d="M16 35 Q20 39 24 35" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <circle cx={34.5} cy={23.5} r={1.8} fill={INK} />
        <circle cx={41.5} cy={23.5} r={1.8} fill={INK} />
        <path d="M34.5 29 Q38 32 41.5 29" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <SparklePath x={45} y={9} size={12} fill={PAPER} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 56" className="size-12" aria-hidden>
      <rect x={7} y={17} width={38} height={27} rx={5} fill={PAPER} stroke={INK} strokeWidth={3} />
      <path d="M9 20 L26 33 L43 20" fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <HeartShape x={45} y={14} size={17} fill={TONES.rose.base} />
    </svg>
  );
}

export function Sparkle({ className = "", fill = TONES.butter.base }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <SparklePath x={20} y={20} size={34} fill={fill} />
    </svg>
  );
}

export function Heart({ className = "", fill = TONES.rose.base }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <HeartShape x={12} y={12} size={20} fill={fill} />
    </svg>
  );
}

export function Squiggle({ className = "", color = INK }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 120 24" className={className} aria-hidden fill="none">
      <path
        d="M4 14 C14 2 22 2 28 12 C34 22 42 22 50 12 C58 2 66 2 72 12 C78 22 86 22 94 12 C100 4 108 4 116 10"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="relative isolate inline-block whitespace-nowrap">
      <svg
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        className="absolute -inset-x-[0.12em] top-[0.42em] -z-10 h-[0.62em] w-[calc(100%+0.24em)]"
        aria-hidden
      >
        <path d="M6 24 C46 12 120 8 194 16 L192 32 C130 26 60 30 8 36 Z" fill={TONES.butter.base} />
      </svg>
      {children}
    </span>
  );
}

export function ShowArt({ title, seed, size }: { title: string; seed: string; size: number }) {
  const tone = TONES[toneFor(seed)];
  const initial = title.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="relative block shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: tone.tint, borderRadius: size * 0.26, boxShadow: `inset 0 0 0 1.5px ${INK}22` }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <path d="M72 18 A16 16 0 0 1 86 34" fill="none" stroke={tone.deep} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
        <path d="M74 6 A30 30 0 0 1 96 30" fill="none" stroke={tone.deep} strokeWidth={5} strokeLinecap="round" opacity={0.4} />
        <path d={bubblePath(12, 24, 66, 52, 20, 34, [22, 92])} fill={tone.base} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <text x={45} y={63} textAnchor="middle" fontSize={36} fontWeight={800} fill={INK} style={DISPLAY}>
          {initial}
        </text>
      </svg>
    </span>
  );
}

export function GuestFace({ label, size = 30 }: { label: Label; size?: number }) {
  const tone = TONES[LABEL_TONE[label]];
  const sweet = label === "sweet_spot";
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 40 40" className="size-full overflow-visible">
        <circle cx={20} cy={20} r={17.5} fill={tone.base} stroke={INK} strokeWidth={2.4} />
        <circle cx={14.5} cy={18} r={2.3} fill={INK} />
        <circle cx={25.5} cy={18} r={2.3} fill={INK} />
        <path d="M14.5 25 Q20 30 25.5 25" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        {sweet && <SparklePath x={34} y={6} size={15} fill={PAPER} />}
      </svg>
    </span>
  );
}
