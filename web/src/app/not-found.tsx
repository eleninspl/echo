import type { Metadata } from "next";
import Link from "next/link";

import { Backdrop } from "@/components/backdrop";
import { FRAME } from "@/components/hud";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Not found" };

// A page Echo doesn't have: a quiet echo that returns nothing, and the way home.
export default function NotFound() {
  return (
    <Backdrop className="flex flex-1">
      <div className={`${FRAME} flex flex-1 flex-col justify-center gap-6 py-24`}>
        <Logo className="size-14 text-brand opacity-60" />
        <p className="tag text-ink-dim">404</p>
        <h1 className="max-w-[16ch] font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] font-semibold text-balance">
          Nothing echoes back from here
        </h1>
        <p className="max-w-[48ch] text-lg text-ink-soft">
          This page doesn&apos;t exist. An old link to an analysis may have expired; run the show again.
        </p>
        <Link href="/" className="btn btn-brand min-h-12 self-start px-6 text-base">
          Find your show
        </Link>
      </div>
    </Backdrop>
  );
}
