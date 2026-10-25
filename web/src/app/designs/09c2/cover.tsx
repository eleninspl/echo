import Image from "next/image";

import { Logo } from "@/components/logo";
import type { Show } from "@/lib/echo";

const FALLBACKS = [
  { ground: "#2a1030", letter: "#f8e6da", edge: "transparent" },
  { ground: "#f0d5c5", letter: "#2a1030", edge: "rgb(42 16 48 / 0.2)" },
  { ground: "#f8e6da", letter: "#2a1030", edge: "#2a1030" },
];

function pick(title: string) {
  let hash = 2166136261;
  for (const letter of title) {
    hash ^= letter.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return FALLBACKS[hash % FALLBACKS.length];
}

export function Cover({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-[#f0d5c5] object-cover"
        style={{
          width: size,
          height: size,
          boxShadow: "0 0 0 1px rgb(42 16 48 / 0.18)",
        }}
      />
    );
  }

  if (size >= 96) {
    const padding = Math.round(size * 0.09);
    return (
      <span
        aria-hidden
        className="flex shrink-0 flex-col justify-between bg-[#2a1030] text-[#f8e6da]"
        style={{ width: size, height: size, padding }}
      >
        <span
          className="w2-display line-clamp-3 block"
          style={{ fontSize: Math.round(size * 0.155), lineHeight: 1.04 }}
        >
          {show.title}
        </span>
        <span
          className="flex items-center border-t border-[#f8e6da]/40"
          style={{ paddingTop: Math.round(padding * 0.6) }}
        >
          <span
            className="block"
            style={{
              width: Math.round(size * 0.13),
              height: Math.round(size * 0.13),
            }}
          >
            <Logo className="size-full" />
          </span>
        </span>
      </span>
    );
  }

  const { ground, letter, edge } = pick(show.title);
  return (
    <span
      aria-hidden
      className="relative block shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background: ground,
        boxShadow: `inset 0 0 0 1px ${edge}`,
      }}
    >
      <span
        className="w2-display absolute"
        style={{
          color: letter,
          fontSize: Math.round(size * 0.86),
          lineHeight: 1,
          left: Math.round(size * 0.12),
          bottom: Math.round(size * -0.08),
        }}
      >
        {show.title.trim().charAt(0).toUpperCase()}
      </span>
    </span>
  );
}
