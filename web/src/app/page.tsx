import { Backdrop } from "@/components/backdrop";
import { FeaturedShows } from "@/components/featured";
import { FRAME } from "@/components/hud";
import { RESULTS_SLOT, ShowFinder } from "@/components/show-finder";
import { ScoreKey } from "@/components/signal";

export default function Home() {
  return (
    <>
      <Backdrop>
        <div
          className={`${FRAME} flex flex-col justify-center pt-10 pb-14 lg:h-[calc(100dvh-11.5rem)] lg:min-h-fit lg:py-[3vh] xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:gap-12`}
        >
          <div className="flex flex-col gap-6 lg:gap-[3.2vh] xl:self-center">
            <h1 className="font-display text-[length:clamp(2.75rem,min(6.4vw,11.5vh),7.25rem)] leading-[0.95] xl:text-[length:clamp(2.75rem,min(4.6vw,11.5vh),5.25rem)] font-semibold tracking-[-0.02em] text-balance">
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
          <div id={RESULTS_SLOT} className="hidden xl:block xl:self-center" />
        </div>
      </Backdrop>
      <ScoreKey />
    </>
  );
}
