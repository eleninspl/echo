import Link from "next/link";

const DESIGNS = [
  { id: "01", name: "The Feature Spread", direction: "Editorial magazine" },
  { id: "02", name: "Raster Red", direction: "Swiss grid" },
  { id: "03", name: "Field Unit", direction: "Audio hardware" },
  { id: "04", name: "Overprint Zine", direction: "Risograph" },
  { id: "05", name: "Sticker Sheet", direction: "Neo-brutalist" },
  { id: "06", name: "The Booking Desk", direction: "Talent booker's desk" },
  { id: "07", name: "Guest Atlas", direction: "Star atlas" },
  { id: "08", name: "Daylight Launch", direction: "Light product site" },
  { id: "09", name: "Warm Waveform", direction: "Waveforms and echoes" },
  { id: "10", name: "Warm Introductions", direction: "Warm and friendly" },
  { id: "09a", name: "Waveform, Finished", direction: "09, refined" },
  { id: "09b", name: "Data Waveform", direction: "09, the wave is the data" },
  { id: "09c", name: "Daylight", direction: "09, light" },
  { id: "09d", name: "Echo Player", direction: "09, a podcast player" },
  { id: "09e", name: "Quiet Studio", direction: "09, quiet and premium" },
  { id: "09f", name: "Gradient Poster", direction: "09, loud" },
  { id: "09c1", name: "Daylight, Edited", direction: "09c, edited" },
  { id: "09c2", name: "Liner Notes", direction: "09c, record sleeve" },
  { id: "09c3", name: "Daylight, the Tool", direction: "09c, product first" },
  { id: "09c4", name: "Mark Made of Data", direction: "09c, identity system" },
  { id: "09c5", name: "The Run, Charted", direction: "09c, data story" },
  { id: "09c6", name: "Marked-up Printout", direction: "09c, producer's notes" },
];

export default function Designs() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Home page directions</h1>
        <p className="text-ink-soft">
          Ten takes on the home page, six variations on 09, then six on 09c, each a working page against the engine. <Link href="/" className="underline">Today&apos;s home page</Link> is the comparison.
        </p>
      </div>
      <ol className="flex flex-col border-t border-steel">
        {DESIGNS.map(({ id, name, direction }) => (
          <li key={id} className="border-b border-steel">
            <Link href={`/designs/${id}`} className="flex items-baseline gap-4 px-1 py-3 hover:bg-deck-hi">
              <span className="font-mono text-sm text-ink-dim">{id}</span>
              <span className="text-lg font-semibold">{name}</span>
              <span className="ml-auto text-sm text-ink-soft">{direction}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
