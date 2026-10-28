"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { yourGuestsPath } from "@/lib/paths";
import { usePickCount } from "@/lib/picks";

export function GuestsLink() {
  return (
    <Suspense fallback={<GuestsLinkBody here={false} />}>
      <CurrentGuestsLink />
    </Suspense>
  );
}

function CurrentGuestsLink() {
  return <GuestsLinkBody here={usePathname() === yourGuestsPath()} />;
}

function GuestsLinkBody({ here }: { here: boolean }) {
  const count = usePickCount();
  return (
    <Link
      href={yourGuestsPath()}
      aria-current={here ? "page" : undefined}
      className={`flex h-9 items-center gap-2 rounded-full px-2.5 text-sm transition-colors hover:bg-deck-hi hover:text-ink sm:px-3 ${
        here ? "bg-deck-hi text-ink" : "text-ink-soft"
      }`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="6" cy="5.5" r="2.5" />
          <path d="M1.75 13.5c.5-2.4 2.2-3.75 4.25-3.75s3.75 1.35 4.25 3.75" />
          <path d="M10.5 3.25a2.5 2.5 0 010 4.6M12.25 9.9c1 .6 1.7 1.8 2 3.6" />
        </g>
      </svg>
      <span className="sr-only sm:not-sr-only">Your guests</span>
      {count > 0 && (
        <span className="readout min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-xs text-[color:var(--on-brand)]">
          {count}
          <span className="sr-only"> picked</span>
        </span>
      )}
    </Link>
  );
}
