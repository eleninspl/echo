"use client";

import Link from "next/link";
import { useEffect } from "react";

import { FRAME, hue } from "@/components/hud";
import { Logo } from "@/components/logo";

// Anything that breaks while a page draws: say so plainly, and offer to try again or start over.
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={`${FRAME} flex flex-1 flex-col justify-center gap-6 py-24`}>
      <title>Something went wrong · Echo</title>
      <Logo className="size-14 text-alert opacity-70" />
      <h1 className="max-w-[18ch] font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] font-semibold text-balance">
        This page lost its signal
      </h1>
      <p className="max-w-[48ch] text-lg text-ink-soft">
        Something went wrong while drawing it. Trying again usually helps; your picks are saved.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="btn btn-solid min-h-12 px-6 text-base"
          style={hue("var(--ink)")}
        >
          Try again
        </button>
        <Link href="/" className="btn min-h-12 px-6 text-base">
          Find your show
        </Link>
      </div>
    </div>
  );
}
