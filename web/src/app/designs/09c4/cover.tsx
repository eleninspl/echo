import Image from "next/image";

import type { Show } from "@/lib/echo";

import { GROUND, INK } from "./palette";

const RING_TONE = "#553759";

function initial(show: Show) {
  return show.title.trim().charAt(0).toUpperCase() || "?";
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
        className="shrink-0 bg-(--w4-well) object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="block shrink-0"
      style={{ width: size, height: size }}
      focusable="false"
    >
      <rect width={100} height={100} fill={INK} />
      <circle
        cx={100}
        cy={0}
        r={34}
        fill="none"
        stroke={RING_TONE}
        strokeWidth={16.5}
      />
      <text
        x={10}
        y={90}
        fontSize={56}
        fontWeight={600}
        fill={GROUND}
        className="w4-narrow"
      >
        {initial(show)}
      </text>
    </svg>
  );
}
