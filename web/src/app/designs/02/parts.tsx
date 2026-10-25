import Image from "next/image";
import type { ReactNode } from "react";

import type { Show } from "@/lib/echo";

import { DISPLAY, GRID } from "./grid";

export function SectionHead({ number, id, title, note }: { number: string; id: string; title: string; note?: ReactNode }) {
  return (
    <div className={`${GRID} gap-y-3 border-t-2 border-(--ink) pt-5`}>
      <p aria-hidden className={`${DISPLAY} col-span-1 text-[clamp(2.25rem,5.4vw,5.25rem)] leading-[0.92] text-(--red) md:col-span-2`}>
        {number}
      </p>
      <h2 id={id} className={`${DISPLAY} col-span-3 text-[clamp(2.25rem,5.4vw,5.25rem)] leading-[0.92] text-balance md:col-span-7`}>
        {title}
      </h2>
      {note && (
        <div className="col-span-3 col-start-2 text-[15px] leading-snug md:col-span-3 md:col-start-10 md:pt-3">{note}</div>
      )}
    </div>
  );
}

export function Cover({ show, className = "" }: { show: Show; className?: string }) {
  if (show.image_url) {
    return (
      <span className={`relative block aspect-square overflow-hidden bg-(--ink) ${className}`}>
        <Image src={show.image_url} alt="" fill unoptimized sizes="(min-width: 768px) 25vw, 40vw" className="object-cover" />
      </span>
    );
  }
  const initial = show.title.trim().charAt(0).toUpperCase() || "E";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`block aspect-square bg-(--ink) ${className}`}>
      <circle cx="80" cy="20" r="9" fill="var(--red)" />
      <text x="7" y="93" fontSize="96" fontWeight="700" letterSpacing="-4" fill="var(--paper)">
        {initial}
      </text>
    </svg>
  );
}
