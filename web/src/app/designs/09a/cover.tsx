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

export function Cover({ show, size }: { show: Show; size: number }) {
  const radius = Math.round(size * 0.24);
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-[#321e39] object-cover shadow-[0_0_0_1px_rgb(255_255_255/0.08)]"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  const { background, origin } = pick(show.title);
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size, background, borderRadius: radius }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" focusable="false">
        {[22, 44, 66, 88, 110, 132].map((ring) => (
          <circle
            key={ring}
            cx={origin[0]}
            cy={origin[1]}
            r={ring}
            fill="none"
            stroke="#2a0f1f"
            strokeOpacity={0.22}
            strokeWidth={2}
          />
        ))}
      </svg>
      <span
        className={`${styles.brand} relative font-semibold text-[#2a0f1f] uppercase`}
        style={{ fontSize: Math.round(size * 0.42), lineHeight: 1 }}
      >
        {show.title.trim().charAt(0)}
      </span>
    </span>
  );
}
