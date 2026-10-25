import { FeaturedShows } from "@/components/featured";
import { FRAME } from "@/components/hud";
import { Ripples } from "@/components/ripples";
import { ShowFinder } from "@/components/show-finder";
import { ScoreKey } from "@/components/signal";

export default function Home() {
  return (
    <>
      <section
        className={`${FRAME} grid grid-cols-1 items-center gap-10 pt-8 pb-12 lg:min-h-[calc(100dvh-8.75rem)] lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-x-6 lg:py-[3vh]`}
      >
        <div className="relative z-10 flex flex-col gap-6 lg:gap-[3.2vh]">
          <h1 className="font-display text-[length:clamp(2.75rem,min(5.6vw,10vh),6.5rem)] leading-[0.95] font-semibold tracking-[-0.02em] text-balance">
            Find the guest who carries your voice to <span className="text-accent">new ears</span>
          </h1>
          <p className="max-w-[48ch] text-lg text-ink-soft xl:text-xl">
            Echo maps what your listeners love, then finds guests they&apos;ll love whose own fans will love your show
            back.
          </p>
          <div className="flex flex-col gap-4">
            <ShowFinder />
            <FeaturedShows />
          </div>
        </div>
        <Ripples className="mx-auto w-full max-w-[34rem] lg:max-w-[min(100%,calc(100dvh-11rem))]" />
      </section>
      <ScoreKey />
    </>
  );
}
