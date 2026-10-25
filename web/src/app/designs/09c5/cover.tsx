import Image from "next/image";

import type { Show } from "@/lib/echo";

export function Cover({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-(--w5-shade) object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="w5-serif flex shrink-0 items-center justify-center bg-(--w5-ink) font-medium text-(--w5-ground)"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.52), lineHeight: 1 }}
    >
      {show.title.trim().charAt(0).toUpperCase()}
    </span>
  );
}
