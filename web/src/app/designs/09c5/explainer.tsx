import { Swatch } from "./marks";
import { SweetShare } from "./finding";
import { GROUND, INK, TONE } from "./palette";

const TEXT = { fit: "#a64d05", love: "#ad1a58", reach: "#5a30c0" };
const LEFT = { x: 210, y: 200 };
const RIGHT = { x: 350, y: 200 };
const RADIUS = 125;

export function Explainer() {
  return (
    <section id="how" aria-labelledby="w5-how" className="mx-auto w-full max-w-[1240px] scroll-mt-6 px-4 pt-24 sm:px-8 lg:px-10 lg:pt-32">
      <div className="max-w-[44rem]">
        <h2 id="w5-how" className="w5-serif text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.08] font-medium">
          How Echo scores a guest
        </h2>
        <p className="w5-serif mt-5 text-[1.22rem] leading-[1.55] text-(--w5-soft)">
          Your show has an audience. So does every guest. Echo measures how the two lean toward each other, in
          both directions, and how much of the guest&apos;s audience you don&apos;t have yet.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-8">
        <figure className="lg:col-span-6">
          <Diagram />
          <figcaption className="mt-2 border-t border-(--w5-line) pt-2.5 text-[0.82rem] text-(--w5-muted)">
            A diagram, not to scale. Every chart on this page is drawn from Echo&apos;s data.
          </figcaption>
        </figure>

        <dl className="lg:col-span-5 lg:col-start-8">
          <Entry term="Fit" part="fit">
            Your listeners lean toward the guest, more than the guest&apos;s fame alone explains. It runs from
            your show to the guest.
          </Entry>
          <Entry term="Love back" part="love">
            The guest&apos;s fans lean toward your show, so the people they bring have a reason to stay. It runs
            from the guest to your show.
          </Entry>
          <Entry term="Reach" part="reach">
            The guest&apos;s fans are new to you: the podcasts they like are ones your listeners don&apos;t.
          </Entry>
          <div className="border-t-2 border-(--w5-ink) py-4">
            <dt className="text-[1.02rem] font-bold">Sweet spot</dt>
            <dd className="w5-serif mt-1 text-[1.1rem] leading-[1.5] text-(--w5-soft)">
              High on all three at once: fit at least 50, love back and reach at least 33, each ranked against
              the other guests in the same run. It&apos;s rare, usually 1 to 4 guests in 20.
              <SweetShare />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Entry({
  term,
  part,
  children,
}: {
  term: string;
  part: "fit" | "love" | "reach";
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-(--w5-line-strong) py-4 first:border-t-2 first:border-(--w5-ink)">
      <dt className="text-[1.02rem] font-bold">
        <Swatch part={part} />
        {term}
      </dt>
      <dd className="w5-serif mt-1 text-[1.1rem] leading-[1.5] text-(--w5-soft)">{children}</dd>
    </div>
  );
}

function Diagram() {
  return (
    <svg
      viewBox="0 0 560 410"
      className="block h-auto w-full max-w-[560px]"
      role="img"
      aria-label="Two overlapping circles, your listeners and the guest's fans. Fit is an arrow from your listeners to the guest. Love back is an arrow from the guest's fans to your show. Reach is the part of the guest's fans outside your circle."
    >
      <defs>
        <pattern id="w5-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={TONE.reach} strokeWidth="1.6" strokeOpacity="0.6" />
        </pattern>
        <mask id="w5-outside-show">
          <rect width="560" height="410" fill="white" />
          <circle cx={LEFT.x} cy={LEFT.y} r={RADIUS} fill="black" />
        </mask>
        <clipPath id="w5-inside-show">
          <circle cx={LEFT.x} cy={LEFT.y} r={RADIUS} />
        </clipPath>
        <marker id="w5-head-fit" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 10 5 0 10z" fill={TONE.fit} />
        </marker>
        <marker id="w5-head-love" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 10 5 0 10z" fill={TONE.love} />
        </marker>
      </defs>

      <circle cx={RIGHT.x} cy={RIGHT.y} r={RADIUS} fill="url(#w5-hatch)" mask="url(#w5-outside-show)" />
      <circle cx={RIGHT.x} cy={RIGHT.y} r={RADIUS} fill={INK} fillOpacity={0.07} clipPath="url(#w5-inside-show)" />
      <circle cx={LEFT.x} cy={LEFT.y} r={RADIUS} fill="none" stroke={INK} strokeWidth={1.5} />
      <circle cx={RIGHT.x} cy={RIGHT.y} r={RADIUS} fill="none" stroke={INK} strokeWidth={1.5} />

      <path
        d="M 168 112 C 210 30, 350 30, 392 112"
        fill="none"
        stroke={TONE.fit}
        strokeWidth={3}
        markerEnd="url(#w5-head-fit)"
      />
      <path
        d="M 392 288 C 350 370, 210 370, 168 288"
        fill="none"
        stroke={TONE.love}
        strokeWidth={3}
        markerEnd="url(#w5-head-love)"
      />

      <text x={280} y={34} textAnchor="middle" fontSize={18} fontWeight={700} fill={TEXT.fit}>
        Fit
      </text>
      <text x={280} y={392} textAnchor="middle" fontSize={18} fontWeight={700} fill={TEXT.love}>
        Love back
      </text>

      <g stroke={GROUND} strokeWidth={6} paintOrder="stroke" strokeLinejoin="round">
        <text x={150} y={196} textAnchor="middle" fontSize={16} fontWeight={600} fill={INK}>
          Your
        </text>
        <text x={150} y={216} textAnchor="middle" fontSize={16} fontWeight={600} fill={INK}>
          listeners
        </text>
        <text x={404} y={182} textAnchor="middle" fontSize={18} fontWeight={700} fill={TEXT.reach}>
          Reach
        </text>
        <text x={404} y={206} textAnchor="middle" fontSize={14.5} fontWeight={600} fill={INK}>
          The guest&apos;s fans
        </text>
        <text x={404} y={224} textAnchor="middle" fontSize={14.5} fontWeight={600} fill={INK}>
          who are new to you
        </text>
      </g>
      <text x={280} y={205} textAnchor="middle" fontSize={13} fill={INK} fillOpacity={0.75}>
        Both
      </text>
    </svg>
  );
}
