import Image from "next/image";

import type { Show } from "@/lib/echo";

import { styles } from "./styles";

const FALLBACKS = [
  { background: "linear-gradient(140deg, #ffbe5c, #ff5c93)", origin: [0, 100] },
  {
    background: "linear-gradient(140deg, #ff8a4c, #b48aff)",
    origin: [100, 100],
  },
  { background: "linear-gradient(140deg, #ff5c93, #8a5cf0)", origin: [0, 0] },
  { background: "linear-gradient(140deg, #b48aff, #ffbe5c)", origin: [100, 0] },
];

export function coverStyle(title: string) {
  let hash = 0;
  for (const letter of title) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return FALLBACKS[hash % FALLBACKS.length];
}

export function Cover({ show, className, titled = false }: { show: Show; className: string; titled?: boolean }) {
  if (show.image_url) {
    return (
      <span
        className={`relative block shrink-0 overflow-hidden rounded-[22%] bg-[#321e39] shadow-[0_0_0_1px_rgb(255_255_255/0.08)] ${className}`}
      >
        <Image src={show.image_url} alt="" fill unoptimized sizes="200px" className="object-cover" />
      </span>
    );
  }
  const { background, origin } = coverStyle(show.title);
  return (
    <span
      aria-hidden
      className={`relative block shrink-0 overflow-hidden rounded-[22%] [container-type:inline-size] ${className}`}
      style={{ background }}
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
            strokeOpacity={0.2}
            strokeWidth={2}
          />
        ))}
      </svg>
      <span
        className={`${styles.display} absolute inset-0 flex items-center justify-center font-semibold text-[#2a0f1f] uppercase`}
        style={{ fontSize: "44cqw", lineHeight: 1 }}
      >
        {show.title.trim().charAt(0)}
      </span>
      {titled && (
        <span
          className={`${styles.display} absolute inset-x-[9%] bottom-[8%] truncate font-semibold tracking-[-0.02em] text-[#2a0f1f]`}
          style={{ fontSize: "8.5cqw", lineHeight: 1.1 }}
        >
          {show.title}
        </span>
      )}
    </span>
  );
}
