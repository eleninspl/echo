import Image from "next/image";

import type { Show } from "@/lib/echo";

const TINTS = ["#f6e0d4", "#f2dccf", "#f4e3d9"];

function tint(title: string) {
  let hash = 0;
  for (const letter of title) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
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
        className="shrink-0 rounded-[2px] bg-(--w6-well) object-cover outline-1 -outline-offset-1 outline-[rgb(42_16_48/0.12)]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-end overflow-hidden rounded-[2px] border border-(--w6-rule-strong)"
      style={{ width: size, height: size, background: tint(show.title) }}
    >
      <span
        className="w6-serif absolute leading-none text-(--w6-ink) italic"
        style={{
          fontSize: Math.round(size * 0.72),
          left: Math.round(size * 0.14),
          bottom: Math.round(-size * 0.1),
        }}
      >
        {show.title.trim().charAt(0).toUpperCase()}
      </span>
    </span>
  );
}
