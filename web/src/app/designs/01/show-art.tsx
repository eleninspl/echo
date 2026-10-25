import Image from "next/image";

import type { Show } from "@/lib/echo";

import { styles } from "./styles";

const SKIPPED_WORDS = new Set(["the", "a", "an"]);
const CORNERS = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
] as const;

function seedOf(text: string): number {
  let value = 7;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function initialOf(title: string): string {
  const words = title.trim().split(/\s+/);
  const word =
    words.find((candidate) => !SKIPPED_WORDS.has(candidate.toLowerCase())) ??
    words[0] ??
    "";
  return word.charAt(0).toUpperCase();
}

export function ShowArt({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-(--paper-deep) object-cover shadow-[0_0_0_1px_rgb(26_23_20/0.25)]"
        style={{ width: size, height: size }}
      />
    );
  }

  const seed = seedOf(show.id + show.title);
  const [originX, originY] = CORNERS[seed % CORNERS.length];
  const rings = 3 + ((seed >> 3) % 3);

  return (
    <span
      aria-hidden
      className="relative block shrink-0 overflow-hidden bg-(--paper-deep) shadow-[inset_0_0_0_1px_var(--ink)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        {Array.from({ length: rings }, (_, ring) => (
          <circle
            key={ring}
            cx={originX}
            cy={originY}
            r={26 + ring * 21}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={0.3}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span
        className={`${styles.display} absolute inset-0 flex items-center justify-center pt-[6%] leading-none text-(--red) italic`}
        style={{ fontSize: size * 0.62 }}
      >
        {initialOf(show.title)}
      </span>
    </span>
  );
}
