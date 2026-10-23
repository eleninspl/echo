import { FeaturedShows } from "@/components/featured";
import { FRAME } from "@/components/gallery";
import { ShowFinder } from "@/components/show-finder";
import { ScoreKey, SignalPath } from "@/components/signal";

export default function Home() {
  return (
    <div
      className={`${FRAME} grid flex-1 grid-cols-1 content-start items-start gap-6 pt-8 pb-12 sm:pt-12 lg:grid-cols-12 lg:gap-x-8`}
    >
      <div className="flex flex-col gap-6 lg:col-span-6 lg:pt-4">
        <h1 className="font-cond text-[clamp(2.5rem,5.2vw,4.5rem)] leading-[0.95] font-medium tracking-[-0.01em] text-balance">
          Find the guest who carries your voice to <span className="text-fit">new ears</span>
        </h1>
        <ShowFinder />
        <ScoreKey />
      </div>
      <div className="lg:col-span-6">
        <SignalPath />
      </div>
      <div className="lg:col-span-12">
        <FeaturedShows />
      </div>
    </div>
  );
}
