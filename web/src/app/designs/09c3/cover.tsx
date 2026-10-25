import Image from "next/image";

import type { Show } from "@/lib/echo";

const TONES = ["#f3d2c2", "#efcdd2", "#ead6ca", "#f3dcc4"];

function tone(title: string) {
  let hash = 0;
  for (const letter of title) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

function initial(show: Show) {
  return show.title.trim().charAt(0).toUpperCase();
}

export function Cover({ show, size }: { show: Show; size: number }) {
  const frame = { width: size, height: size, borderRadius: 3 };
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-(--w3-well) object-cover shadow-[inset_0_0_0_1px_rgb(42_16_48/0.08)]"
        style={frame}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="w3-serif flex shrink-0 items-center justify-center text-(--w3-ink) shadow-[inset_0_0_0_1px_rgb(42_16_48/0.08)]"
      style={{
        ...frame,
        background: tone(show.title),
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
    >
      {initial(show)}
    </span>
  );
}

export function CoverDisc({ show }: { show: Show | null }) {
  if (show?.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={240}
        height={240}
        unoptimized
        className="block size-full rounded-full bg-(--w3-well) object-cover"
      />
    );
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="block size-full"
      focusable="false"
    >
      <circle
        cx={50}
        cy={50}
        r={49.5}
        fill={show ? tone(show.title) : "#fbe6dc"}
        stroke="#2a1030"
        strokeOpacity={0.1}
      />
      {show && (
        <text
          x={50}
          y={50}
          dy="0.34em"
          textAnchor="middle"
          fontSize={36}
          fill="#2a1030"
          className="w3-serif"
        >
          {initial(show)}
        </text>
      )}
    </svg>
  );
}
