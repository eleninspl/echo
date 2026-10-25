import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

import "./design.css";
import { styles } from "./styles";
import { Overlap } from "./overlap";
import { Ripples, Strip } from "./ripples";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";
import { Bars, TONE, Voiceprint, type Part } from "./wave";

const display = Unbounded({ subsets: ["latin"], variable: "--font-e9-display" });
const body = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-e9-body" });

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";

export default function DesignNine() {
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
    <header className={`${FRAME} flex items-center justify-between gap-4 py-5`}>
      <Link href="/" aria-label="Echo, home" className="rounded-full">
        <Wordmark />
      </Link>
      <nav aria-label="On this page" className="flex items-center gap-1 text-sm font-semibold">
        <a
          href="#how"
          className="hidden rounded-full px-4 py-2 text-(--e9-soft) transition-colors hover:text-(--e9-ink) sm:inline-flex"
        >
          How it scores
        </a>
        <a
          href="#find"
          className="rounded-full px-4 py-2 text-(--e9-ink) ring-1 ring-(--e9-line) transition-shadow hover:ring-(--e9-fit)"
        >
          Find your show
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="e9-pitch" className="relative">
      <div
        className={`${FRAME} grid grid-cols-1 items-center gap-y-4 pt-6 pb-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-x-4 lg:pt-10 lg:pb-12`}
      >
        <div className="relative z-10 flex flex-col gap-7">
          <p className="inline-flex w-fit items-center gap-2.5 rounded-full bg-(--e9-plum) px-4 py-1.5 text-sm font-semibold text-(--e9-soft) ring-1 ring-(--e9-line)">
            <Bars className="text-(--e9-love)" />
            Guest finder for podcasts
          </p>
          <h1
            id="e9-pitch"
            className={`${styles.display} text-[clamp(2.3rem,5vw,4.4rem)] leading-[1.04] font-semibold tracking-[-0.045em] text-balance`}
          >
            Find the guest who carries your voice to <span className={styles.gradientText}>new ears.</span>
          </h1>
          <p className="max-w-[44ch] text-lg leading-relaxed text-(--e9-soft) sm:text-xl">
            Echo reads what your listeners love on Qloo. Then it finds guests they&apos;ll love, whose own fans will
            love your show back.
          </p>
          <ShowSearch />
        </div>
        <div className="relative mx-auto w-full max-w-[520px] lg:-mr-16 lg:max-w-none lg:translate-x-6">
          <Ripples />
        </div>
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
    <section id="how" aria-labelledby="e9-how" className="relative scroll-mt-4">
      <Strip />
      <div className={`${FRAME} py-20 lg:py-28`}>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col gap-6">
            <h2
              id="e9-how"
              className={`${styles.display} text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance`}
            >
              How Echo scores a guest
            </h2>
            <p className="max-w-[48ch] text-lg leading-relaxed text-(--e9-soft)">
              Your show has an audience. So does every guest. Echo measures how the two overlap in both directions,
              and how much of the guest&apos;s audience you don&apos;t reach yet.
            </p>
            <div className="mx-auto w-full max-w-[560px] lg:mx-0">
              <Overlap />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold tracking-wide text-(--e9-soft)">
              Each guest gets a wave. Its three swells are the three scores.
            </p>
            <ol className="flex flex-col gap-3">
              {SCORES.map((score) => (
                <ScoreCard key={score.part} {...score} />
              ))}
              <li
                className={`${styles.gradientEdge} flex flex-col gap-3 rounded-[28px] p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6`}
              >
                <Voiceprint
                  fit={0.9}
                  loveBack={0.9}
                  reach={0.9}
                  bars={30}
                  width={120}
                  height={48}
                  className="h-12 w-[104px] shrink-0 sm:w-[120px]"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className={`${styles.display} ${styles.gradientText} w-fit text-xl font-semibold`}>
                    Sweet spot
                  </h3>
                  <p className="text-(--e9-soft)">
                    High on all three at once. It&apos;s rare, usually 1 to 4 guests in 20, and Echo tells you how
                    many it found.
                  </p>
                </div>
              </li>
            </ol>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Shape fit={0.95} loveBack={0.88} reach={0.12} name="Safe">
                Loved both ways, but adds few new ears.
              </Shape>
              <Shape fit={0.6} loveBack={0.14} reach={0.95} name="Far">
                New ears that may not stay.
              </Shape>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ part, name, path, text }: { part: Part; name: string; path: string; text: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-[28px] bg-(--e9-plum) p-5 ring-1 ring-(--e9-line) sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <Voiceprint
        fit={0.9}
        loveBack={0.9}
        reach={0.9}
        focus={part}
        bars={30}
        width={120}
        height={48}
        className="h-12 w-[104px] shrink-0 sm:w-[120px]"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className={`${styles.display} text-xl font-semibold`} style={{ color: TONE[part] }}>
            {name}
          </span>
          <span className="text-sm text-(--e9-dim)">{path}</span>
        </h3>
        <p className="text-(--e9-soft)">{text}</p>
      </div>
    </li>
  );
}

function Shape({
  fit,
  loveBack,
  reach,
  name,
  children,
}: {
  fit: number;
  loveBack: number;
  reach: number;
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-dashed border-(--e9-line) px-4 py-3">
      <Voiceprint fit={fit} loveBack={loveBack} reach={reach} bars={22} width={76} height={34} className="h-8 w-[72px] shrink-0" />
      <p className="text-sm text-(--e9-soft)">
        <span className="font-semibold text-(--e9-ink)">{name}.</span> {children}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--e9-line)">
      <div className={`${FRAME} flex flex-col gap-8 pt-12 pb-8 lg:flex-row lg:items-end lg:justify-between`}>
        <Wordmark size="text-xl" />
        <div className="flex flex-col gap-1.5 text-(--e9-soft) lg:text-right">
          <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
      <p
        aria-hidden
        className={`${FRAME} ${styles.display} flex items-baseline gap-[0.25em] overflow-hidden pb-6 leading-none font-semibold tracking-[-0.05em] whitespace-nowrap select-none`}
      >
        <span className={`${styles.gradientText} text-[min(11vw,10rem)]`}>echo</span>
        <span className="text-[min(7vw,6.4rem)] text-(--e9-love) opacity-45">echo</span>
        <span className="text-[min(4.4vw,4rem)] text-(--e9-reach) opacity-30">echo</span>
        <span className="text-[min(2.8vw,2.6rem)] text-(--e9-reach) opacity-20">echo</span>
        <span className="text-[min(1.8vw,1.6rem)] text-(--e9-reach) opacity-12">echo</span>
      </p>
    </footer>
  );
}
