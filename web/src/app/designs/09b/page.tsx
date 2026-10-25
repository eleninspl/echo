import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { Anatomy, type Reading } from "./anatomy";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";
import { styles } from "./styles";
import { GuestTrack } from "./track";
import { Segment, type Levels, type Paint } from "./wave";

const display = Unbounded({ subsets: ["latin"], variable: "--font-v9b-display" });
const body = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-v9b-body" });

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";
const WIDE = "mx-auto w-full max-w-[1560px] px-4 sm:px-8";

export default function DesignNineB() {
  return (
    <div className={`${display.variable} ${body.variable} ${styles.root} flex min-h-screen flex-col`}>
      <Masthead />
      <Hero />
      <Scoring />
      <RunShows />
      <Footer />
    </div>
  );
}

function Wordmark({ size = "text-2xl" }: { size?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className={`size-9 ${styles.gradientFill}`} />
      <span className={`${styles.display} ${size} font-semibold tracking-[-0.04em]`}>echo</span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={`${FRAME} flex items-center justify-between gap-4 py-4`}>
      <Link href="/" aria-label="Echo, home" className="rounded-full">
        <Wordmark />
      </Link>
      <nav aria-label="On this page" className="flex items-center gap-1 font-semibold">
        <a
          href="#how"
          className="hidden rounded-full px-4 py-2 text-(--v9b-soft) transition-colors hover:text-(--v9b-ink) sm:inline-flex"
        >
          How it scores
        </a>
        <a
          href="#find"
          className="rounded-full px-4 py-2 text-(--v9b-ink) ring-1 ring-(--v9b-line) transition-shadow hover:ring-(--v9b-fit)"
        >
          Find your show
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="v9b-pitch" className="relative">
      <div
        className={`${FRAME} grid grid-cols-1 gap-y-6 pt-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-x-16 lg:pt-8`}
      >
        <h1
          id="v9b-pitch"
          className={`${styles.display} text-[clamp(2.15rem,4vw,3.3rem)] leading-[1.06] font-semibold tracking-[-0.045em] text-balance lg:row-span-2`}
        >
          Find the guest who carries your voice to <span className={styles.gradientText}>new ears.</span>
        </h1>
        <p className="max-w-[46ch] text-lg leading-relaxed text-(--v9b-soft) lg:col-start-2 lg:pt-1">
          Echo reads what your listeners love on Qloo. Then it finds guests they&apos;ll love, whose own fans will
          love your show back.
        </p>
        <ShowSearch />
      </div>
      <div className={`${WIDE} pt-10 pb-16 lg:pt-10 lg:pb-24`}>
        <GuestTrack />
      </div>
    </section>
  );
}

const READINGS: Reading[] = [
  {
    part: "fit",
    path: "Your show to the guest",
    text: "Your listeners over-index on the guest, beyond what the guest's fame alone explains.",
  },
  {
    part: "love",
    path: "The guest to your show",
    text: "The guest's fans over-index on your show, so the people they bring have a reason to stay.",
  },
  {
    part: "reach",
    path: "Their fans, new to you",
    text: "The part of the guest's audience you don't have yet: the podcasts they favour are ones yours doesn't.",
  },
];

const SHAPES: { name: string; levels: Levels; paint: Paint; text: string }[] = [
  {
    name: "Sweet spot",
    levels: [0.86, 0.72, 0.7],
    paint: "sweet",
    text: "High on all three. Rare, usually 1 to 4 guests in 20, and Echo tells you how many it found.",
  },
  {
    name: "Safe",
    levels: [0.92, 0.84, 0.14],
    paint: "lit",
    text: "Your audience will enjoy it, but few new listeners come with them.",
  },
  {
    name: "Far",
    levels: [0.6, 0.18, 0.92],
    paint: "lit",
    text: "Brings new people who may not stay.",
  },
  {
    name: "Long shot",
    levels: [0.2, 0.62, 0.58],
    paint: "lit",
    text: "Their fans might come, but your audience is lukewarm.",
  },
];

function Scoring() {
  return (
    <section id="how" aria-labelledby="v9b-how" className="relative scroll-mt-4 border-t border-(--v9b-line)">
      <div className={`${FRAME} py-20 lg:py-28`}>
        <div className="mb-14 grid grid-cols-1 gap-6 lg:mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <h2
            id="v9b-how"
            className={`${styles.display} text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance`}
          >
            How Echo scores a guest
          </h2>
          <p className="max-w-[52ch] text-lg leading-relaxed text-(--v9b-soft)">
            Your show has an audience. So does every guest. Echo measures how the two overlap in both directions, and
            how much of the guest&apos;s audience is new to you. Each measure is one swell in the guest&apos;s stretch
            of the wave.
          </p>
        </div>

        <Anatomy readings={READINGS} />

        <div className="mt-20 flex flex-col gap-6 lg:mt-24">
          <h3 className={`${styles.display} text-xl font-semibold sm:text-2xl`}>Read the shape</h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SHAPES.map((shape) => (
              <li
                key={shape.name}
                className={`flex flex-col gap-4 rounded-[24px] p-5 ${
                  shape.paint === "sweet" ? styles.gradientEdge : "bg-(--v9b-plum) ring-1 ring-(--v9b-line)"
                }`}
              >
                <Segment
                  levels={shape.levels}
                  paint={shape.paint}
                  bars={21}
                  width={210}
                  height={76}
                  className="h-[68px] w-full max-w-[220px]"
                />
                <div className="flex flex-col gap-1.5">
                  <h4
                    className={`${styles.display} w-fit text-lg font-semibold ${
                      shape.paint === "sweet" ? styles.gradientText : ""
                    }`}
                  >
                    {shape.name}
                  </h4>
                  <p className="text-base leading-snug text-(--v9b-soft)">{shape.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--v9b-line)">
      <div className={`${FRAME} flex flex-col gap-8 pt-12 pb-8 lg:flex-row lg:items-end lg:justify-between`}>
        <Wordmark size="text-xl" />
        <div className="flex flex-col gap-1.5 text-(--v9b-soft) lg:text-right">
          <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
      <p
        aria-hidden
        className={`${FRAME} ${styles.display} flex items-baseline gap-[0.25em] overflow-hidden pb-6 leading-none font-semibold tracking-[-0.05em] whitespace-nowrap select-none`}
      >
        <span className={`${styles.gradientText} text-[min(11vw,10rem)]`}>echo</span>
        <span className="text-[min(7vw,6.4rem)] text-(--v9b-love) opacity-45">echo</span>
        <span className="text-[min(4.4vw,4rem)] text-(--v9b-reach) opacity-30">echo</span>
        <span className="text-[min(2.8vw,2.6rem)] text-(--v9b-reach) opacity-20">echo</span>
        <span className="text-[min(1.8vw,1.6rem)] text-(--v9b-reach) opacity-12">echo</span>
      </p>
    </footer>
  );
}
