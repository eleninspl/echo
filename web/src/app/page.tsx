import { FeaturedShows } from "@/components/featured";
import { ShowFinder } from "@/components/show-finder";

const TERMS = [
  { term: "Fit", means: "Your listeners over-index on them, beyond what their fame predicts." },
  { term: "Love back", means: "Their fans over-index on your show." },
  { term: "Reach", means: "Their fans are new to you." },
];

export default function Home() {
  return (
    <>
      <div className="bg-field text-on-field">
        <div className="grid-lines mx-auto grid w-full max-w-7xl gap-x-8 gap-y-12 px-4 pt-14 pb-16 sm:px-8 sm:pt-20 md:grid-cols-12 md:pb-24">
          <div className="flex flex-col gap-10 md:col-span-8">
            <h1 className="font-display text-[clamp(3.25rem,9vw,6rem)] leading-[0.88] font-extrabold tracking-tight text-balance uppercase">
              Find the guest who carries your voice to new ears
            </h1>
            <ShowFinder />
          </div>
          <aside aria-labelledby="terms" className="md:col-span-4 md:pt-2">
            <h2 id="terms" className="text-sm font-semibold tracking-wide uppercase">
              Echo scores every guest three ways
            </h2>
            <dl className="mt-4 flex flex-col border-t-2 border-on-field">
              {TERMS.map(({ term, means }) => (
                <div key={term} className="border-b border-field-rule py-4">
                  <dt className="font-display text-4xl leading-none font-extrabold uppercase">{term}</dt>
                  <dd className="mt-1.5 text-on-field-soft">{means}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-on-field-soft">
              A sweet spot is high on all three. It&apos;s rare, and Echo says so.
            </p>
          </aside>
        </div>
      </div>
      <FeaturedShows />
    </>
  );
}
