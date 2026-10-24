import { FeaturedShows } from "@/components/featured";
import { FRAME } from "@/components/gallery";
import { ShowFinder } from "@/components/show-finder";
import { ScoreKey, SignalPath } from "@/components/signal";

export default function Home() {
  return (
    <div
      className={`${FRAME} grid flex-1 grid-cols-1 content-start items-start gap-6 pt-8 pb-12 sm:pt-12 md:grid-cols-12 md:gap-x-6 lg:gap-x-8`}
    >
      <div className="flex flex-col gap-6 md:col-span-6 md:pt-4">
        <h1 className="font-cond text-[clamp(2.5rem,5.2vw,4.5rem)] leading-[0.95] font-medium tracking-[-0.01em] text-balance">
          Find the guest who carries your voice to <span className="text-fit">new ears</span>
        </h1>
        <ShowFinder />
        <ScoreKey />
      </div>
      <div className="md:col-span-6">
        <SignalPath />
      </div>
      <div className="md:col-span-12">
        <FeaturedShows />
      </div>
    </div>
  );
}
