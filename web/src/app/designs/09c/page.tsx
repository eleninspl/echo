import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { OverlapGlyph } from "./glyphs";
import { HeroRun } from "./hero-run";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";
import { styles } from "./styles";
import { Bars, INK, Strip, TONE, Voiceprint, type Part } from "./wave";

const display = Unbounded({
  subsets: ["latin"],
  variable: "--font-v9c-display",
});
const body = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-v9c-body",
});

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";

export default function DesignNineDaylight() {
  return (
    <div
      className={`${display.variable} ${body.variable} ${styles.root} flex min-h-screen flex-col`}
    >
      <Masthead />
      <Hero />
      <Strip />
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
      <span
        className={`${styles.display} ${size} font-semibold tracking-[-0.04em]`}
      >
        echo
      </span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={`${FRAME} flex items-center justify-between gap-4 py-5`}>
      <Link href="/" aria-label="Echo, home" className="rounded-full">
        <Wordmark />
      </Link>
      <nav
        aria-label="On this page"
        className="flex items-center gap-1 text-[0.95rem] font-semibold"
      >
        <a
          href="#how"
          className="hidden rounded-full px-4 py-2 text-(--v9c-soft) transition-colors hover:text-(--v9c-ink) sm:inline-flex"
        >
          How it scores
        </a>
        <a
          href="#find"
          className="rounded-full bg-(--v9c-ink) px-4 py-2 text-(--v9c-on-ink) transition-colors hover:bg-[#45204d]"
        >
          Find your show
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="v9c-pitch" className="relative">
      <div
        className={`${FRAME} grid grid-cols-1 items-center gap-y-8 pt-6 pb-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-x-14 lg:pt-4 lg:pb-6`}
      >
        <div className="relative z-10 flex flex-col gap-6">
          <p className="inline-flex w-fit items-center gap-2.5 rounded-full bg-(--v9c-paper) px-4 py-1.5 text-sm font-semibold text-(--v9c-soft) ring-1 ring-(--v9c-line)">
            <Bars className="text-(--v9c-love)" />
            Guest finder for podcasts
          </p>
          <h1
            id="v9c-pitch"
            className={`${styles.display} text-[clamp(2.25rem,4.15vw,3.75rem)] leading-[1.06] font-medium tracking-[-0.045em] text-balance`}
          >
            Find the guest who carries your voice to{" "}
            <span className={styles.gradientText}>new ears.</span>
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-(--v9c-soft) sm:text-xl">
            Echo reads what your listeners love on Qloo. Then it finds guests
            they&apos;ll love, whose own fans will love your show back.
          </p>
          <ShowSearch />
        </div>
        <HeroRun />
      </div>
    </section>
  );
}

const SCORES: { part: Part; name: string; path: string; text: string }[] = [
  {
    part: "fit",
    name: "Fit",
    path: "Your show to the guest",
    text: "Your listeners over-index on the guest, beyond what the guest's fame alone explains.",
  },
  {
    part: "love",
    name: "Love back",
    path: "The guest to your show",
    text: "The guest's fans over-index on your show, so the people they bring have a reason to stay.",
  },
  {
    part: "reach",
    name: "Reach",
    path: "Fans you don't have yet",
    text: "The guest's fans are new to you: the podcasts they favour are ones your audience doesn't.",
  },
];

function Scoring() {
  return (
    <section
      id="how"
      aria-labelledby="v9c-how"
      className="mb-16 scroll-mt-4 border-b border-(--v9c-line) bg-[linear-gradient(to_bottom,rgb(255_248_244/0),rgb(255_248_244/0.85)_14rem)]"
    >
      <div className={`${FRAME} pt-16 pb-20 lg:pt-20 lg:pb-28`}>
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <h2
            id="v9c-how"
            className={`${styles.display} text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08] font-medium tracking-[-0.035em] text-balance`}
          >
            How Echo scores a guest
          </h2>
          <p className="max-w-[52ch] text-lg leading-relaxed text-(--v9c-soft)">
            Your show has an audience, and so does every guest. Echo measures
            how{" "}
            <span className="font-semibold text-(--v9c-fit-ink)">
              your listeners
            </span>{" "}
            and{" "}
            <span className="font-semibold text-(--v9c-reach-ink)">
              the guest&apos;s fans
            </span>{" "}
            overlap, in both directions, and how much of the guest&apos;s
            audience you don&apos;t reach yet. Each guest becomes a wave with
            three swells.
          </p>
        </div>

        <figure className="mt-12 lg:mt-16">
          <Voiceprint
            fit={0.92}
            loveBack={0.8}
            reach={0.88}
            bars={84}
            width={1216}
            height={150}
            className="block h-auto w-full"
          />
          <figcaption className="sr-only">
            A guest&apos;s wave. Its first swell is fit, its middle swell love
            back, its last swell reach.
          </figcaption>
          <ol className="mt-8 grid grid-cols-1 gap-9 md:mt-0 md:grid-cols-3 md:gap-0">
            {SCORES.map((score) => (
              <ScoreColumn key={score.part} {...score} />
            ))}
          </ol>
        </figure>

        <SweetSpot />
      </div>
    </section>
  );
}

function ScoreColumn({
  part,
  name,
  path,
  text,
}: {
  part: Part;
  name: string;
  path: string;
  text: string;
}) {
  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-4 md:flex md:flex-col md:items-center md:px-5 md:text-center">
      <span
        aria-hidden
        className="hidden h-10 w-px md:block"
        style={{ background: TONE[part] }}
      />
      <span
        aria-hidden
        className="mb-3 hidden size-2 rounded-full md:block"
        style={{ background: TONE[part] }}
      />
      <OverlapGlyph
        part={part}
        className="h-auto w-[88px] md:mt-1 md:w-[168px]"
      />
      <div className="flex flex-col md:items-center">
        <h3
          className={`${styles.display} text-[1.4rem] leading-tight font-medium tracking-[-0.02em] md:mt-3 md:text-[1.7rem]`}
          style={{ color: INK[part] }}
        >
          {name}
        </h3>
        <p className="mt-1 text-sm font-semibold tracking-wide text-(--v9c-dim) uppercase">
          {path}
        </p>
        <p className="mt-2 max-w-[32ch] text-[1.05rem] leading-relaxed text-(--v9c-soft) md:mt-3">
          {text}
        </p>
      </div>
    </li>
  );
}

const SHAPES = [
  {
    name: "Safe",
    fit: 0.95,
    loveBack: 0.88,
    reach: 0.12,
    text: "Loved both ways, but adds few new ears.",
  },
  {
    name: "Far",
    fit: 0.6,
    loveBack: 0.14,
    reach: 0.95,
    text: "New ears that may not stay.",
  },
];

function SweetSpot() {
  return (
    <div
      className={`${styles.gradientEdge} mt-16 grid grid-cols-1 overflow-hidden rounded-[32px] lg:mt-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]`}
    >
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        <Voiceprint
          fit={0.9}
          loveBack={0.9}
          reach={0.9}
          bars={34}
          width={180}
          height={76}
          className="h-[76px] w-[180px] shrink-0"
        />
        <div className="flex flex-col gap-2">
          <h3
            className={`${styles.display} ${styles.gradientText} w-fit text-[1.7rem] leading-tight font-medium tracking-[-0.02em]`}
          >
            Sweet spot
          </h3>
          <p className="max-w-[44ch] text-[1.05rem] leading-relaxed text-(--v9c-soft)">
            High on all three at once. It&apos;s rare, usually 1 to 4 guests in
            20, and Echo tells you how many it found.
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 border-t border-(--v9c-line) bg-(--v9c-ground)/60 sm:grid-cols-2 lg:grid-cols-1 lg:border-t-0 lg:border-l">
        {SHAPES.map((shape, index) => (
          <li
            key={shape.name}
            className={`flex items-center gap-5 px-6 py-5 sm:px-8 ${index ? "border-t border-(--v9c-line) sm:border-t-0 sm:border-l lg:border-t lg:border-l-0" : ""}`}
          >
            <Voiceprint
              fit={shape.fit}
              loveBack={shape.loveBack}
              reach={shape.reach}
              bars={24}
              width={96}
              height={42}
              className="h-[42px] w-[96px] shrink-0"
            />
            <p className="text-[1.05rem] leading-snug text-(--v9c-soft)">
              <span className="font-semibold text-(--v9c-ink)">
                {shape.name}.
              </span>{" "}
              {shape.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--v9c-line)">
      <div
        className={`${FRAME} flex flex-col gap-8 pt-12 pb-8 lg:flex-row lg:items-end lg:justify-between`}
      >
        <Wordmark size="text-xl" />
        <div className="flex flex-col gap-1.5 text-(--v9c-soft) lg:text-right">
          <p>
            Echo reads Qloo&apos;s taste data. Results describe audiences as
            groups, never one listener.
          </p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
      <p
        aria-hidden
        className={`${FRAME} ${styles.display} flex items-baseline gap-[0.25em] overflow-hidden pb-6 leading-none font-semibold tracking-[-0.05em] whitespace-nowrap select-none`}
      >
        <span className={`${styles.gradientText} text-[min(11vw,10rem)]`}>
          echo
        </span>
        <span className="text-[min(7vw,6.4rem)] text-(--v9c-love) opacity-45">
          echo
        </span>
        <span className="text-[min(4.4vw,4rem)] text-(--v9c-reach) opacity-30">
          echo
        </span>
        <span className="text-[min(2.8vw,2.6rem)] text-(--v9c-reach) opacity-20">
          echo
        </span>
        <span className="text-[min(1.8vw,1.6rem)] text-(--v9c-reach) opacity-12">
          echo
        </span>
      </p>
    </footer>
  );
}
