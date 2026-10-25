import { styles } from "./styles";
import { PART_NAME, TONE, Voiceprint, type Part, type Wave } from "./wave";

const SCORES: { part: Part; path: string; text: string }[] = [
  {
    part: "fit",
    path: "Your show → the guest",
    text: "Your listeners over-index on the guest, beyond what the guest's fame alone explains.",
  },
  {
    part: "love",
    path: "The guest → your show",
    text: "The guest's fans over-index on your show, so the people they bring have a reason to stay.",
  },
  {
    part: "reach",
    path: "Fans you don't have yet",
    text: "The guest's fans are new to you: the podcasts they favour are ones your audience doesn't.",
  },
];

const SHAPES: { name: string; text: string; wave: Wave; sweet?: boolean }[] = [
  { name: "Sweet spot", text: "All three high.", wave: { fit: 0.86, love: 0.8, reach: 0.84 }, sweet: true },
  { name: "Safe", text: "Loved both ways, few new ears.", wave: { fit: 0.92, love: 0.86, reach: 0.14 } },
  { name: "Far", text: "New ears that may not stay.", wave: { fit: 0.58, love: 0.14, reach: 0.94 } },
];

export function Anatomy() {
  return (
    <section id="how" aria-labelledby="v9a-how" className="relative scroll-mt-4">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-20 sm:px-8 lg:py-28">
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <h2
            id="v9a-how"
            className={`${styles.headline} text-[clamp(2.6rem,5vw,4.25rem)] leading-[0.95] tracking-[-0.01em] text-balance`}
          >
            How Echo scores a guest
          </h2>
          <p className="max-w-[52ch] text-lg leading-relaxed text-(--v9a-soft) lg:justify-self-end">
            Your show has an audience, and so does every guest. Echo compares the two in both directions, then
            measures how much of the guest&apos;s audience you don&apos;t reach yet. Each guest gets a wave whose
            three swells are its three scores.
          </p>
        </div>

        <figure className="mt-12 rounded-[32px] bg-(--v9a-plum) p-5 ring-1 ring-(--v9a-line) sm:p-8 lg:p-10">
          <Voiceprint
            wave={{ fit: 0.88, love: 0.74, reach: 0.82 }}
            perSwell={21}
            width={1120}
            height={150}
            seed={5}
            className="hidden h-auto w-full lg:block"
          />
          <Voiceprint
            wave={{ fit: 0.88, love: 0.74, reach: 0.82 }}
            perSwell={9}
            width={320}
            height={72}
            seed={5}
            className="mb-8 h-auto w-full lg:hidden"
          />
          <ol className="grid grid-cols-1 gap-10 lg:mt-8 lg:grid-cols-3 lg:gap-8">
            {SCORES.map((score) => (
              <Score key={score.part} {...score} />
            ))}
          </ol>
          <figcaption className="sr-only">
            A guest&apos;s wave has three swells: fit, love back and reach. Each one is drawn in its own colour.
          </figcaption>
        </figure>

        <div
          className={`${styles.gradientEdge} mt-5 grid grid-cols-1 items-center gap-8 rounded-[32px] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:gap-12 lg:p-10`}
        >
          <div className="flex flex-col gap-3">
            <h3 className={`${styles.title} ${styles.gradientText} w-fit text-[2rem] leading-none`}>Sweet spot</h3>
            <p className="text-lg leading-relaxed text-(--v9a-soft)">
              High on all three at once. It&apos;s rare, usually 1 to 4 guests in 20, and Echo tells you how many
              it found.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            {SHAPES.map((shape) => (
              <li key={shape.name} className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3">
                <Voiceprint
                  wave={shape.wave}
                  perSwell={9}
                  width={180}
                  height={64}
                  className="h-auto w-[120px] shrink-0 sm:w-full"
                />
                <p className="text-base leading-snug text-pretty text-(--v9a-soft)">
                  <span
                    className={`block text-lg font-semibold ${shape.sweet ? `${styles.gradientText} w-fit` : "text-(--v9a-ink)"}`}
                  >
                    {shape.name}
                  </span>
                  {shape.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Score({ part, path, text }: { part: Part; path: string; text: string }) {
  const color = TONE[part];
  return (
    <li className="flex flex-col gap-5">
      <span aria-hidden className="hidden h-[3px] rounded-full lg:block" style={{ background: color }} />
      <Glyph part={part} />
      <div className="flex flex-col gap-2">
        <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`${styles.title} text-[1.75rem] leading-none`} style={{ color }}>
            {PART_NAME[part]}
          </span>
          <span className="text-base font-semibold text-(--v9a-ink)">{path}</span>
        </h3>
        <p className="max-w-[40ch] text-[17px] leading-relaxed text-pretty text-(--v9a-soft)">{text}</p>
      </div>
    </li>
  );
}

const SHOW = { x: 112, y: 70 };
const GUEST = { x: 172, y: 70 };
const RADIUS = 52;

function Glyph({ part }: { part: Part }) {
  const color = TONE[part];
  const head = `v9a-head-${part}`;
  const mask = `v9a-outside-${part}`;
  return (
    <svg aria-hidden viewBox="0 0 284 140" className="h-auto w-[250px] sm:w-[284px]" focusable="false">
      <defs>
        <marker id={head} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
          <path d="M0 0 10 5 0 10z" fill={color} />
        </marker>
        <mask id={mask}>
          <rect width="284" height="140" fill="white" />
          <circle cx={SHOW.x} cy={SHOW.y} r={RADIUS} fill="black" />
        </mask>
      </defs>

      {part === "reach" && (
        <circle cx={GUEST.x} cy={GUEST.y} r={RADIUS} fill={color} fillOpacity={0.4} mask={`url(#${mask})`} />
      )}
      <circle
        cx={SHOW.x}
        cy={SHOW.y}
        r={RADIUS}
        fill="#fff4ec"
        fillOpacity={0.04}
        stroke="#fff4ec"
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />
      <circle
        cx={GUEST.x}
        cy={GUEST.y}
        r={RADIUS}
        fill="none"
        stroke={part === "reach" ? color : "#fff4ec"}
        strokeOpacity={part === "reach" ? 1 : 0.5}
        strokeWidth={part === "reach" ? 2 : 1.5}
      />

      {part === "fit" && (
        <path
          d={`M ${SHOW.x} ${SHOW.y - 8} C ${SHOW.x + 4} 6, ${GUEST.x - 4} 6, ${GUEST.x} ${GUEST.y - 12}`}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd={`url(#${head})`}
        />
      )}
      {part === "love" && (
        <path
          d={`M ${GUEST.x} ${GUEST.y + 8} C ${GUEST.x - 4} 134, ${SHOW.x + 4} 134, ${SHOW.x} ${SHOW.y + 12}`}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd={`url(#${head})`}
        />
      )}

      <circle cx={SHOW.x} cy={SHOW.y} r={5} fill="#fff4ec" />
      <circle cx={GUEST.x} cy={GUEST.y} r={5} fill="#fff4ec" />
      <g fontSize={15} fontWeight={600} fill="#fff4ec">
        <text x={SHOW.x - RADIUS - 8} y={SHOW.y + 5} textAnchor="end">
          You
        </text>
        <text x={GUEST.x + RADIUS + 8} y={GUEST.y + 5} textAnchor="start">
          Guest
        </text>
      </g>
    </svg>
  );
}
