import Image from "next/image";

import type { Show } from "@/lib/echo";

// A show's artwork, or its initial when Qloo has no image.
export function ShowCover({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-rule object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center border border-current font-display font-extrabold uppercase"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {show.title.trim().charAt(0)}
    </span>
  );
}
