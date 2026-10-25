export type Part = "fit" | "love" | "reach";

export const TONE: Record<Part, string> = { fit: "#ff9a52", love: "#ff5c93", reach: "#b48aff" };
export const MUTED = "#4b3752";

const CENTERS = [1 / 6, 1 / 2, 5 / 6];
const SPREAD = 0.14;

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

function partAt(position: number): Part {
  if (position < 1 / 3) return "fit";
  if (position < 2 / 3) return "love";
  return "reach";
}

export const round = (value: number) => Math.round(value * 100) / 100;

export type Bar = { position: number; part: Part; level: number; unscored: boolean };

export function voice(fit: number, loveBack: number, reach: number | null, bars: number, seed = 0): Bar[] {
  const levels = [fit, loveBack, reach ?? 0];
  return Array.from({ length: bars }, (_, index) => {
    const position = (index + 0.5) / bars;
    const part = partAt(position);
    const envelope = levels.reduce(
      (sum, level, at) => sum + level * Math.exp(-(((position - CENTERS[at]) / SPREAD) ** 2)),
      0,
    );
    const texture = 0.72 + 0.28 * grain(index + seed);
    return {
      position,
      part,
      level: Math.max(0.07, Math.min(1, envelope * texture)),
      unscored: reach === null && part === "reach",
    };
  });
}

type VoiceprintProps = {
  fit: number;
  loveBack: number;
  reach: number | null;
  bars?: number;
  width?: number;
  height?: number;
  focus?: Part;
  quiet?: boolean;
  className?: string;
};

export function Voiceprint({
  fit,
  loveBack,
  reach,
  bars = 27,
  width = 120,
  height = 40,
  focus,
  quiet = false,
  className = "",
}: VoiceprintProps) {
  const step = width / bars;
  const thickness = step * 0.46;
  const middle = height / 2;

  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} className={className} focusable="false">
      {voice(fit, loveBack, reach, bars).map((bar, index) => {
        const size = bar.unscored ? thickness : bar.level * (height - 2);
        const muted = quiet || bar.unscored || (focus !== undefined && bar.part !== focus);
        return (
          <rect
            key={index}
            x={round(index * step + (step - thickness) / 2)}
            y={round(middle - size / 2)}
            width={round(thickness)}
            height={round(size)}
            rx={round(thickness / 2)}
            fill={muted ? MUTED : toneAt(bar.position)}
          />
        );
      })}
    </svg>
  );
}
