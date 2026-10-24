import Image from "next/image";

import type { Show } from "@/lib/echo";

// A show's artwork, or its initial on a dark screen when Qloo has no image.
export function ShowCover({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-[2px] bg-well object-cover shadow-[0_0_0_1px_var(--steel)]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="screen flex shrink-0 items-center justify-center rounded-[2px] font-display font-medium text-ink-soft uppercase shadow-[0_0_0_1px_var(--steel)]"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {show.title.trim().charAt(0)}
    </span>
  );
}
