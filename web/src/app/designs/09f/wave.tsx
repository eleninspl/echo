import { styles } from "./styles";

export type Part = "fit" | "love" | "reach";

export const TONE: Record<Part, string> = { fit: "#ff9a52", love: "#ff5c93", reach: "#b48aff" };
export const INK = "#170a15";
export const CREAM = "#fff4ec";

const MUTED = "#55405b";
const CENTERS = [1 / 6, 1 / 2, 5 / 6];
const SPREAD = 0.13;

function channel(hex: string, at: number) {
  return parseInt(hex.slice(at, at + 2), 16);
}

function mix(from: string, to: string, amount: number) {
  const blend = (at: number) =>
    Math.round(channel(from, at) + (channel(to, at) - channel(from, at)) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

export function toneAt(position: number) {
  if (position <= CENTERS[0]) return TONE.fit;
  if (position <= CENTERS[1]) return mix(TONE.fit, TONE.love, (position - CENTERS[0]) * 3);
  if (position <= CENTERS[2]) return mix(TONE.love, TONE.reach, (position - CENTERS[1]) * 3);
  return TONE.reach;
}

export function grain(index: number) {
  const value = Math.sin(index * 12.9898 + 4.1) * 43758.5453;
  return value - Math.floor(value);
}

export function swell(position: number, levels: number[], index: number) {
  const envelope = levels.reduce(
    (sum, level, at) => sum + level * Math.exp(-(((position - CENTERS[at]) / SPREAD) ** 2)),
    0,
  );
  const texture = 0.66 + 0.34 * grain(index);
  return Math.max(0.08, Math.min(1, envelope * texture));
}

function partAt(position: number): Part {
  if (position < 1 / 3) return "fit";
  if (position < 2 / 3) return "love";
  return "reach";
}

const round = (value: number) => Math.round(value * 100) / 100;

type VoiceprintProps = {
  fit: number;
  loveBack: number;
  reach: number | null;
  bars?: number;
  width?: number;
  height?: number;
  focus?: Part;
  ink?: string;
  className?: string;
};

export function Voiceprint({
  fit,
  loveBack,
  reach,
  bars = 30,
  width = 120,
  height = 44,
  focus,
  ink,
  className = "",
}: VoiceprintProps) {
  const levels = [fit, loveBack, reach ?? 0];
  const step = width / bars;
  const thickness = step * 0.58;
  const middle = height / 2;

  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} className={className} focusable="false">
      {Array.from({ length: bars }, (_, index) => {
        const position = (index + 0.5) / bars;
        const part = partAt(position);
        const unscored = reach === null && part === "reach";
        const size = unscored ? thickness : swell(position, levels, index) * (height - 2);
        const muted = unscored || (focus !== undefined && part !== focus);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(middle - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={ink ?? (muted ? MUTED : toneAt(position))}
            fillOpacity={ink && muted ? 0.28 : 1}
          />
        );
      })}
    </svg>
  );
}

export function Bars({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`${styles.eq} ${className}`}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
