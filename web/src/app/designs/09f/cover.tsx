import Image from "next/image";

import type { Show } from "@/lib/echo";

import { styles } from "./styles";

const FALLBACKS = [
  { background: "linear-gradient(140deg, #ffbe5c, #ff5c93)", origin: [0, 100] },
  { background: "linear-gradient(140deg, #ff8a4c, #b48aff)", origin: [100, 100] },
  { background: "linear-gradient(140deg, #ff5c93, #8a5cf0)", origin: [0, 0] },
  { background: "linear-gradient(140deg, #b48aff, #ffbe5c)", origin: [100, 0] },
];

function pick(title: string) {
  let hash = 0;
  for (const letter of title) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return FALLBACKS[hash % FALLBACKS.length];
}

export function Cover({ show, size, onField = false }: { show: Show; size: number; onField?: boolean }) {
  const radius = Math.round(size * 0.2);
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-[#341e3b] object-cover shadow-[0_0_0_2px_rgb(23_10_21/0.9)]"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  const { background, origin } = pick(show.title);
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size, background: onField ? "#170a15" : background, borderRadius: radius }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" focusable="false">
        {[22, 44, 66, 88, 110, 132].map((ring, index) => (
          <circle
            key={ring}
            cx={origin[0]}
            cy={origin[1]}
            r={ring}
            fill="none"
            stroke={onField ? ["#ff9a52", "#ff5c93", "#b48aff"][index % 3] : "#170a15"}
            strokeOpacity={onField ? 0.75 : 0.24}
            strokeWidth={onField ? 3 : 2.5}
          />
        ))}
      </svg>
      <span
        className={`${styles.poster} relative uppercase ${onField ? "text-[#fff4ec]" : "text-[#170a15]"}`}
        style={{ fontSize: Math.round(size * 0.56), lineHeight: 1 }}
      >
        {show.title.trim().charAt(0)}
      </span>
    </span>
  );
}
