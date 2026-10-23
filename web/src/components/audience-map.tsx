import type { MapRow } from "@/lib/echo";
import { category } from "@/lib/format";

export function AudienceMap({ rows }: { rows: MapRow[] }) {
  const filled = rows.filter((row) => row.items.length > 0);
  if (!filled.length) return null;
  return (
    <section aria-labelledby="map" className="border-t-2 border-ink">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <h2 id="map" className="font-display text-5xl leading-none font-extrabold uppercase">
          What your listeners over-index on
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Your audience as a group, across categories, strongest first. The guests above come from the same data.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {filled.map((row) => (
            <div key={row.category}>
              <h3 className="border-b-2 border-ink pb-1 font-display text-2xl leading-none font-extrabold uppercase">
                {category(row.category)}
              </h3>
              <ol className="mt-2 flex flex-col">
                {row.items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="border-b border-rule py-1.5 text-sm">
                    {item.name}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
