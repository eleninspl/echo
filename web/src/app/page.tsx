import { Backdrop } from "@/components/backdrop";
import { FeaturedShows } from "@/components/featured";
import { FRAME } from "@/components/hud";
import { ShowFinder } from "@/components/show-finder";
import { ScoreKey } from "@/components/signal";

export default function Home() {
  return (
    <>
      <Backdrop>
        <div
          className={`${FRAME} flex flex-col justify-center pt-10 pb-14 lg:h-[calc(100dvh-13rem)] lg:min-h-fit lg:py-[3vh]`}
        >
          <div className="flex flex-col gap-6 lg:gap-[3.2vh]">
            <h1 className="font-display text-[length:clamp(2.75rem,min(6.4vw,11.5vh),7.25rem)] leading-[0.95] font-semibold tracking-[-0.02em] text-balance">
              Find the guest who carries your voice to <span className="text-accent">new ears</span>
            </h1>
            <p className="max-w-[56ch] text-lg text-ink-soft">
              Echo maps what your listeners love, then finds guests they&apos;ll love whose own fans will love your show
              back.
            </p>
            <div className="flex max-w-2xl flex-col gap-4">
              <ShowFinder />
              <FeaturedShows />
            </div>
          </div>
        </div>
      </Backdrop>
      <ScoreKey />
    </>
  );
}
