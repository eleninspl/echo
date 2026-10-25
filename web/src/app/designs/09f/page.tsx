import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

import "./design.css";
import { ECHO_RINGS, Rings, Strip, Swells } from "./edges";
import { Overlap } from "./overlap";
import { ShowSearch } from "./search";
import { LatestRun, RunShows } from "./shows";
import { styles } from "./styles";
import { INK, TONE, Voiceprint, type Part } from "./wave";

const poster = Bricolage_Grotesque({ subsets: ["latin"], axes: ["wdth", "opsz"], variable: "--font-v9f-poster" });
const wide = Unbounded({ subsets: ["latin"], variable: "--font-v9f-wide" });

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";
const EDGE_RINGS = "clamp(560px, 84vw, 1240px)";

export default function DesignNineF() {
  return (
    <div className={`${poster.variable} ${wide.variable} ${styles.root} flex min-h-screen flex-col`}>
      <Hero />
      <Scoring />
      <SweetSpot />
      <RunShows />
      <Footer />
    </div>
  );
}

function Wordmark({ size = "text-2xl" }: { size?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-9" />
      <span className={`${styles.wide} ${size} font-semibold tracking-[-0.04em]`}>echo</span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={`${FRAME} relative flex items-center justify-between gap-4 py-5`}>
      <Link href="/" aria-label="Echo, home" className="rounded-full">
        <Wordmark />
      </Link>
      <nav aria-label="On this page" className="flex items-center gap-2 text-base font-semibold">
        <a href="#how" className="hidden rounded-full px-4 py-2 underline-offset-4 hover:underline sm:inline-flex">
          How it scores
        </a>
        <a
          href="#find"
          className="rounded-full bg-(--v9f-black) px-5 py-2.5 text-(--v9f-ink) transition-colors hover:bg-(--v9f-plum-hi)"
        >
          Find your show
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="v9f-pitch" className={`${styles.field} overflow-hidden`}>
      <Rings half="top" surface="field" x="80%" size={EDGE_RINGS} />
      <Masthead />
      <div className={`${FRAME} relative pt-6 pb-44 sm:pt-8 lg:pb-36`}>
        <h1 id="v9f-pitch" className={`${styles.stack} ${styles.poster} uppercase`}>
          <span className="text-[20.7cqw]">Find the guest</span>{" "}
          <span className="text-[12.24cqw]">who carries your voice</span>{" "}
          <span className="mt-[0.06em] text-[21.64cqw]">
            to{" "}
            <span className={styles.knock}>
              <span className={styles.gradientText}>new ears.</span>
            </span>
          </span>
        </h1>
        <div className="mt-9 grid grid-cols-1 items-start gap-8 lg:mt-11 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-6">
          <p className="max-w-[34ch] pt-1 text-xl leading-snug font-semibold lg:col-start-1 lg:row-start-1 lg:text-[1.4rem]">
            Echo reads what your listeners love on Qloo. Then it finds guests they&apos;ll love, whose own fans will
            love your show back.
          </p>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <ShowSearch />
          </div>
          <div className="lg:col-start-1 lg:row-start-2">
            <LatestRun />
          </div>
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
    <section id="how" aria-labelledby="v9f-how" className="relative isolate scroll-mt-4 overflow-hidden">
      <Rings half="bottom" surface="dark" x="80%" size={EDGE_RINGS} />
      <div className={`${FRAME} pt-[calc(clamp(560px,84vw,1240px)*0.44+20px)] pb-[calc(clamp(200px,30vw,420px)/2+84px)] lg:pt-32 lg:pb-[calc(clamp(200px,30vw,420px)/2+120px)]`}>
        <div className="flex max-w-[860px] flex-col gap-6">
          <h2
            id="v9f-how"
            className={`${styles.poster} text-[clamp(3.4rem,9vw,8.5rem)] leading-[0.84] uppercase`}
          >
            <span className="block">How Echo scores</span> <span className="block text-(--v9f-love)">a guest</span>
          </h2>
          <p className="max-w-[46ch] text-xl leading-snug text-(--v9f-soft) sm:text-2xl">
            Your show has an audience. So does every guest. Echo measures how the two overlap in both directions, and
            how much of the guest&apos;s audience you don&apos;t reach yet.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-center gap-12 lg:mt-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="mx-auto w-full max-w-[560px] lg:mx-0">
            <Overlap />
          </div>
          <ol className="flex flex-col">
            {SCORES.map((score) => (
              <ScoreRow key={score.part} {...score} />
            ))}
          </ol>
        </div>

        <p className="mt-16 max-w-[34ch] text-xl leading-snug font-semibold text-(--v9f-ink) sm:text-2xl lg:mt-28">
          Every guest is a wave. Its three swells are its three scores.
        </p>
      </div>
      <Swells half="top" surface="dark" />
    </section>
  );
}

function ScoreRow({ part, name, path, text }: { part: Part; name: string; path: string; text: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 border-t-2 border-(--v9f-line) py-6 last:border-b-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-7">
      <Voiceprint
        fit={0.92}
        loveBack={0.92}
        reach={0.92}
        focus={part}
        bars={26}
        width={120}
        height={64}
        className="col-start-2 row-start-1 h-12 w-[92px] self-center sm:col-start-1 sm:row-span-2 sm:mt-1 sm:h-16 sm:w-[120px] sm:self-start"
      />
      <h3 className="col-start-1 row-start-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:col-start-2">
        <span className={`${styles.poster} text-5xl leading-[0.9] uppercase sm:text-6xl`} style={{ color: TONE[part] }}>
          {name}
        </span>
        <span className={`${styles.wide} text-xs font-semibold tracking-[0.12em] text-(--v9f-soft) uppercase`}>
          {path}
        </span>
      </h3>
      <p className="col-span-2 max-w-[44ch] text-lg leading-snug text-(--v9f-soft) sm:col-span-1 sm:col-start-2">
        {text}
      </p>
    </li>
  );
}

function SweetSpot() {
  return (
    <section aria-labelledby="v9f-sweet" className={`${styles.field} ${styles.fieldTurn} overflow-hidden`}>
      <Swells half="bottom" surface="field" />
      <Rings half="top" surface="field" {...ECHO_RINGS} />
      <div
        className={`${FRAME} relative pt-[calc(clamp(200px,30vw,420px)/2+56px)] pb-[calc(clamp(360px,52vw,800px)*0.44+40px)] lg:pb-28`}
      >
        <h2 id="v9f-sweet" className={`${styles.stack} ${styles.poster} uppercase`}>
          <span className="text-[25.05cqw]">Sweet spot.</span>
        </h2>
        <div className="mt-8 flex max-w-[620px] flex-col gap-12 lg:mt-10">
          <p className="text-2xl leading-snug font-semibold sm:text-[1.9rem]">
            High on all three at once. It&apos;s rare, usually 1 to 4 guests in 20, and Echo tells you how many it
            found.
          </p>
          <div className="flex flex-col gap-4">
            <p className={`${styles.wide} text-xs font-semibold tracking-[0.14em] uppercase`}>Close, but not quite</p>
            <Shape fit={0.95} loveBack={0.88} reach={0.12} name="Safe">
              Loved both ways, but adds few new ears.
            </Shape>
            <Shape fit={0.6} loveBack={0.14} reach={0.95} name="Far">
              New ears that may not stay.
            </Shape>
          </div>
        </div>
      </div>
    </section>
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
    <div className="flex items-center gap-5 border-t-2 border-(--v9f-black) pt-4">
      <Voiceprint
        fit={fit}
        loveBack={loveBack}
        reach={reach}
        bars={26}
        width={120}
        height={56}
        ink={INK}
        className="h-12 w-[104px] shrink-0"
      />
      <p className="text-lg leading-snug font-medium">
        <span className={`${styles.poster} mr-2 text-3xl leading-none uppercase`}>{name}</span>
        {children}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className={`${styles.field} mt-auto overflow-hidden`}>
      <Strip half="bottom" surface="field" />
      <div className={`${FRAME} relative flex flex-col gap-8 pt-[calc(clamp(120px,14vw,200px)/2+56px)] pb-6 lg:flex-row lg:items-end lg:justify-between`}>
        <Wordmark size="text-2xl" />
        <div className="flex flex-col gap-1.5 text-lg font-semibold lg:text-right">
          <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
      <p
        aria-hidden
        className={`${FRAME} ${styles.poster} relative flex items-baseline gap-[0.18em] overflow-hidden pb-4 leading-[0.8] whitespace-nowrap uppercase select-none`}
      >
        <span className="text-[min(19vw,17rem)]">echo</span>
        <span className="text-[min(12vw,10.6rem)] opacity-60">echo</span>
        <span className="text-[min(7.6vw,6.8rem)] opacity-40">echo</span>
        <span className="text-[min(4.8vw,4.3rem)] opacity-25">echo</span>
        <span className="text-[min(3vw,2.7rem)] opacity-15">echo</span>
      </p>
    </footer>
  );
}
