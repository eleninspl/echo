import Image from "next/image";

import type { Guest, Show } from "@/lib/echo";

import { INK, LABEL_TONE, ShowArt, TONES } from "./drawings";

export function Cover({ show, size }: { show: Show; size: number }) {
  if (!show.image_url) return <ShowArt title={show.title} seed={show.id} size={size} />;
  return (
    <Image
      src={show.image_url}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: size * 0.26, boxShadow: `0 0 0 1.5px ${INK}22` }}
    />
  );
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "?"
  );
}

export function GuestAvatar({ guest, size }: { guest: Guest; size: number }) {
  if (guest.image_url) {
    return (
      <Image
        src={guest.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, boxShadow: `0 0 0 2px ${INK}` }}
      />
    );
  }
  const tone = TONES[LABEL_TONE[guest.label]];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: tone.base,
        boxShadow: `inset 0 0 0 2px ${INK}`,
        fontSize: size * 0.36,
        fontFamily: "var(--font-echo-display), sans-serif",
      }}
    >
      {initials(guest.name)}
    </span>
  );
}
