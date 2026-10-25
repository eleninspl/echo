import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { Horizon } from "./horizon";
import { Overlap } from "./overlap";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";
import { styles } from "./styles";
import { TONE, Voiceprint, type Part } from "./wave";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-v9e-display",
});
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-v9e-body" });

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-10";

export default function DesignNineE() {
  return (
    <div className={`${display.variable} ${body.variable} ${styles.root} flex min-h-screen flex-col`}>
      <Masthead />
      <main className="flex flex-col">
        <Hero />
        <Scoring />
        <RunShows />
      </main>
      <Footer />
    </div>
  );
}

function Wordmark({ size = "text-[1.875rem]" }: { size?: string }) {
  return (
    <span className="flex items-center gap-3">
      <Logo className={`size-7 ${styles.gradientFill}`} />
      <span className={`${styles.display} ${size} leading-none`}>Echo</span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={`${FRAME} flex items-center justify-between gap-4 py-6 sm:py-8`}>
      <Link href="/" aria-label="Echo, home" className="rounded-full">
        <Wordmark />
      </Link>
      <nav aria-label="On this page" className="flex items-center gap-2 text-[0.9375rem] font-medium">
        <a
          href="#how"
          className="hidden rounded-full px-4 py-2 text-(--v9e-soft) transition-colors hover:text-(--v9e-ink) sm:inline-flex"
        >
          How it scores
        </a>
        <a
          href="#find"
          className="rounded-full px-5 py-2.5 text-(--v9e-ink) ring-1 ring-(--v9e-line-hi) transition-colors hover:bg-(--v9e-ink) hover:text-(--v9e-on-ink)"
        >
          Find your show
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="v9e-pitch" className={`${FRAME} pt-14 pb-24 sm:pt-20 lg:pt-16 lg:pb-32`}>
      <h1
        id="v9e-pitch"
        className={`${styles.display} text-[clamp(3.25rem,7.8vw,7.5rem)] leading-[0.96] tracking-[-0.015em] text-balance`}
      >
        Find the guest who carries your voice to{" "}
        <em className={`${styles.gradientText} pr-[0.08em]`}>new ears.</em>
      </h1>
      <div className="mt-12 grid grid-cols-1 gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-x-10">
        <p className="max-w-[34ch] text-xl leading-[1.55] text-(--v9e-soft) sm:text-[1.4rem] lg:col-span-5 lg:pt-9">
          Echo reads what your listeners love on Qloo. Then it finds guests they&apos;ll love, whose own fans will
          love your show back.
        </p>
        <div className="lg:col-span-6 lg:col-start-7">
          <ShowSearch />
        </div>
      </div>
      <div className="mt-20 lg:mt-20">
        <Horizon />
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
    <section id="how" aria-labelledby="v9e-how" className="scroll-mt-6 border-t border-(--v9e-line)">
      <div className={`${FRAME} py-28 lg:py-40`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          <h2
            id="v9e-how"
            className={`${styles.display} text-[clamp(2.75rem,5.4vw,4.75rem)] leading-[0.98] tracking-[-0.01em] lg:col-span-7`}
          >
            How Echo scores a guest
          </h2>
          <p className="max-w-[40ch] text-xl leading-relaxed text-(--v9e-soft) lg:col-span-5">
            Your show has an audience. So does every guest. Echo measures how the two overlap, in both directions,
            and how much of the guest&apos;s audience you don&apos;t reach yet.
          </p>
        </div>

        <figure className="mx-auto mt-20 w-full max-w-[880px] lg:mt-28">
          <Overlap />
        </figure>

        <ol className="mt-20 grid grid-cols-1 gap-14 border-t border-(--v9e-line) pt-14 md:grid-cols-3 md:gap-10 lg:mt-28">
          {SCORES.map((score) => (
            <ScoreItem key={score.part} {...score} />
          ))}
        </ol>

        <div className="mt-20 grid grid-cols-1 gap-8 border-t border-(--v9e-line) pt-14 lg:mt-24 lg:grid-cols-12 lg:gap-x-10">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Voiceprint fit={0.92} loveBack={0.9} reach={0.88} bars={31} width={176} height={56} className="h-14 w-44" />
            <h3 className={`${styles.display} ${styles.gradientText} w-fit pr-[0.08em] text-6xl leading-none italic sm:text-7xl`}>
              Sweet spot
            </h3>
          </div>
          <div className="flex flex-col gap-5 lg:col-span-6 lg:col-start-7 lg:pt-4">
            <p className="text-2xl leading-snug text-(--v9e-ink)">
              High on all three at once. It&apos;s rare, usually 1 to 4 guests in 20, and Echo tells you how many it
              found.
            </p>
            <p className="text-lg leading-relaxed text-(--v9e-dim)">
              Each guest is drawn as a wave whose three swells are its three scores. Loved both ways but few new ears
              is Safe. New ears that may not stay is Far.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreItem({ part, name, path, text }: { part: Part; name: string; path: string; text: string }) {
  return (
    <li className="flex flex-col gap-5">
      <Voiceprint fit={0.9} loveBack={0.9} reach={0.9} focus={part} bars={27} width={120} height={40} className="h-10 w-[120px]" />
      <h3 className="flex flex-col gap-2">
        <span className={`${styles.display} text-5xl leading-none`} style={{ color: TONE[part] }}>
          {name}
        </span>
        <span className={styles.overline}>{path}</span>
      </h3>
      <p className="max-w-[34ch] text-lg leading-relaxed text-(--v9e-soft)">{text}</p>
    </li>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--v9e-line)">
      <div className={`${FRAME} flex flex-col gap-8 pt-14 pb-10 lg:flex-row lg:items-end lg:justify-between`}>
        <Wordmark size="text-2xl" />
        <div className="flex flex-col gap-1.5 text-base text-(--v9e-soft) lg:text-right">
          <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
      <p
        aria-hidden
        className={`${FRAME} ${styles.display} flex items-baseline gap-[0.18em] overflow-hidden pb-4 leading-[1.05] whitespace-nowrap italic select-none`}
      >
        <span className={`${styles.gradientText} pr-[0.06em] text-[min(15vw,13rem)]`}>echo</span>
        <span className="text-[min(9.5vw,8.4rem)] text-(--v9e-ink) opacity-25">echo</span>
        <span className="text-[min(6vw,5.3rem)] text-(--v9e-ink) opacity-15">echo</span>
        <span className="text-[min(3.8vw,3.3rem)] text-(--v9e-ink) opacity-10">echo</span>
        <span className="text-[min(2.4vw,2.1rem)] text-(--v9e-ink) opacity-[0.06]">echo</span>
      </p>
    </footer>
  );
}
