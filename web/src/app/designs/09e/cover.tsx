import Image from "next/image";

import type { Show } from "@/lib/echo";

import { styles } from "./styles";
import { TONE } from "./wave";

const FALLBACKS = [
  { tone: TONE.fit, origin: [0, 100] },
  { tone: TONE.love, origin: [100, 100] },
  { tone: TONE.reach, origin: [0, 0] },
  { tone: TONE.fit, origin: [100, 0] },
];

function pick(title: string) {
  let hash = 0;
  for (const letter of title) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return FALLBACKS[hash % FALLBACKS.length];
}

export function Cover({ show, size }: { show: Show; size: number }) {
  const radius = Math.round(size * 0.18);
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-[#2a1931] object-cover shadow-[0_0_0_1px_rgb(255_255_255/0.08)]"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  const { tone, origin } = pick(show.title);
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center overflow-hidden bg-[#2a1931] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" focusable="false">
        {[18, 34, 50, 66, 82, 98, 114, 130].map((ring, index) => (
          <circle
            key={ring}
            cx={origin[0]}
            cy={origin[1]}
            r={ring}
            fill="none"
            stroke={tone}
            strokeOpacity={0.55 - index * 0.06}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span
        className={`${styles.display} relative text-[#fbf1ea] italic`}
        style={{ fontSize: Math.round(size * 0.56), lineHeight: 1 }}
      >
        {show.title.trim().charAt(0)}
      </span>
    </span>
  );
}
