import Image from "next/image";

import type { Show } from "@/lib/echo";

import { styles } from "./styles";

const FALLBACKS = [
  { from: "#f9b25e", to: "#ef5d93", origin: [0, 100] },
  { from: "#f48a52", to: "#e2508c", origin: [100, 100] },
  { from: "#ef6a9a", to: "#9a6cf0", origin: [0, 0] },
  { from: "#fbc483", to: "#f0703a", origin: [100, 0] },
];

function pick(title: string) {
  let hash = 0;
  for (const letter of title) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return FALLBACKS[hash % FALLBACKS.length];
}

function initial(show: Show) {
  return show.title.trim().charAt(0).toUpperCase();
}

export function Cover({ show, size }: { show: Show; size: number }) {
  const radius = Math.round(size * 0.24);
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 bg-[#fbe5da] object-cover shadow-[0_0_0_1px_rgb(42_16_48/0.08)]"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  const { from, to, origin } = pick(show.title);
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${from}, ${to})`,
        borderRadius: radius,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full"
        focusable="false"
      >
        {[22, 44, 66, 88, 110, 132].map((ring) => (
          <circle
            key={ring}
            cx={origin[0]}
            cy={origin[1]}
            r={ring}
            fill="none"
            stroke="#fff8f4"
            strokeOpacity={0.4}
            strokeWidth={2}
          />
        ))}
      </svg>
      <span
        className={`${styles.display} relative font-semibold text-[#2a1030]`}
        style={{ fontSize: Math.round(size * 0.42), lineHeight: 1 }}
      >
        {initial(show)}
      </span>
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
        className="size-full rounded-full bg-[#fbe5da] object-cover"
      />
    );
  }
  const { from, to } = show
    ? pick(show.title)
    : { from: "#fbe5da", to: "#f5d5ca" };
  const id = `v9c-disc-${show ? show.id.replace(/[^a-z0-9]/gi, "") : "empty"}`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="block size-full"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx={50} cy={50} r={50} fill={`url(#${id})`} />
      {[14, 24, 34, 44].map((ring) => (
        <circle
          key={ring}
          cx={50}
          cy={50}
          r={ring}
          fill="none"
          stroke="#fff8f4"
          strokeOpacity={0.35}
          strokeWidth={0.8}
        />
      ))}
      {show && (
        <text
          x={50}
          y={50}
          dy="0.36em"
          textAnchor="middle"
          fontSize={40}
          fontWeight={600}
          fill="#2a1030"
          className={styles.display}
        >
          {initial(show)}
        </text>
      )}
    </svg>
  );
}
