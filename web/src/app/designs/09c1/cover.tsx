import Image from "next/image";

import type { Show } from "@/lib/echo";

import { styles } from "./styles";

function initials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0]?.[0] ?? "").toUpperCase();
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
        className="shrink-0 bg-(--w1-well) object-cover outline outline-1 -outline-offset-1 outline-[rgb(42_16_48/0.1)]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${styles.wide} flex shrink-0 items-end bg-(--w1-ink) font-semibold text-(--w1-on-ink)`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.3),
        lineHeight: 1,
        padding: Math.round(size * 0.12),
        letterSpacing: "-0.02em",
      }}
    >
      {initials(show.title)}
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
        className="size-full rounded-full bg-(--w1-well) object-cover"
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
      <circle cx={50} cy={50} r={50} fill={show ? "#2a1030" : "#f6dfd3"} />
      {show && (
        <text
          x={50}
          y={50}
          dy="0.36em"
          textAnchor="middle"
          fontSize={30}
          fontWeight={600}
          fill="#fff0e8"
          className={styles.wide}
        >
          {initials(show.title)}
        </text>
      )}
    </svg>
  );
}
