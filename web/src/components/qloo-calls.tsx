import type { QlooCall } from "@/lib/echo";

const time = (call: QlooCall) => (call.cached ? "Cached" : `${call.duration_ms} ms`);

// Every Qloo call the analysis made, for anyone who wants to see the data behind it.
export function QlooCalls({ calls }: { calls: QlooCall[] }) {
  if (!calls.length) return null;
  const fresh = calls.filter((call) => !call.cached);
  return (
    <section aria-labelledby="qloo" className="border-t-2 border-ink">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <h2 id="qloo" className="font-display text-5xl leading-none font-extrabold uppercase">
          What Qloo saw
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          This analysis made {calls.length} {calls.length === 1 ? "call" : "calls"} to Qloo:{" "}
          {fresh.length} fresh and {calls.length - fresh.length} answered from the cache. Many run at once, so their times
          overlap. Each one
          describes an audience as a group; no personal data goes to Qloo.
        </p>
        <details className="group mt-6">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 border-2 border-ink px-3 py-1.5 text-sm font-semibold hover:bg-ink hover:text-stock [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show every call</span>
            <span className="hidden group-open:inline">Hide the calls</span>
            <svg aria-hidden viewBox="0 0 12 12" className="size-3 transition-transform group-open:rotate-180">
              <path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </summary>
          <div className="mt-6">
            <table className="w-full border-t-2 border-ink text-left text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    <span className="sr-only">Number</span>
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Call
                  </th>
                  <th scope="col" className="hidden py-2 pr-4 text-right font-semibold sm:table-cell">
                    Status
                  </th>
                  <th scope="col" className="hidden py-2 text-right font-semibold sm:table-cell">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call, index) => (
                  <tr key={index} className="border-b border-rule align-top">
                    <td className="py-2 pr-4 tabular-nums text-ink-soft">{index + 1}</td>
                    <td className="py-2 pr-4">
                      <p className="font-semibold">{call.path}</p>
                      <p className="text-xs text-ink-soft sm:hidden">
                        {call.status} · {time(call)}
                      </p>
                      <dl className="mt-1 grid gap-x-3 font-mono text-xs text-ink-soft sm:grid-cols-[auto_1fr]">
                        {Object.entries(call.params).map(([key, value]) => (
                          <div key={key} className="contents">
                            <dt>{key}</dt>
                            <dd className="break-all text-ink">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                    <td className="hidden py-2 pr-4 text-right tabular-nums sm:table-cell">{call.status}</td>
                    <td className="hidden py-2 text-right tabular-nums whitespace-nowrap sm:table-cell">{time(call)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
