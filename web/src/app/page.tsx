import { FeaturedShows } from "@/components/featured";
import { FRAME } from "@/components/hud";
import { ShowFinder } from "@/components/show-finder";
import { ScoreKey, SignalPath } from "@/components/signal";

export default function Home() {
  return (
    <div className={`${FRAME} flex flex-1 flex-col gap-10 pt-8 pb-14 sm:pt-14`}>
      <div className="grid grid-cols-1 items-center gap-x-10 gap-y-8 md:grid-cols-12">
        <div className="flex flex-col gap-7 md:col-span-6">
          <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.02em] text-balance">
            Find the guest who carries your voice to <span className="text-fit">new ears</span>
          </h1>
          <p className="max-w-[52ch] text-lg text-ink-soft">
            Echo maps what your listeners love, then finds guests they&apos;ll love whose own fans will love your show
            back.
          </p>
          <ShowFinder />
          <ScoreKey />
        </div>
        <div className="md:col-span-6">
          <SignalPath />
        </div>
      </div>
      <FeaturedShows />
    </div>
  );
}
