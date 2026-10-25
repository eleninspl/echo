import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { DeckProvider } from "./deck";
import { Lineup } from "./lineup";
import { Mixer } from "./mixer";
import { Overlap } from "./overlap";
import { Player } from "./player";
import { ShowSearch } from "./search";
import { styles } from "./styles";

const display = Unbounded({
  subsets: ["latin"],
  variable: "--font-v9d-display",
});
const body = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-v9d-body",
});

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";

export default function DesignNineD() {
  return (
    <div className={`${display.variable} ${body.variable} ${styles.root} flex min-h-screen flex-col`}>
      <Masthead />
      <DeckProvider>
        <Hero />
        <Lineup />
        <Scoring />
      </DeckProvider>
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
          className="hidden rounded-full px-4 py-2 text-(--v9d-soft) transition-colors hover:text-(--v9d-ink) sm:inline-flex"
        >
          How it scores
        </a>
        <a
          href="#find"
          className="rounded-full px-4 py-2 text-(--v9d-ink) ring-1 ring-(--v9d-line) transition-shadow hover:ring-(--v9d-fit)"
        >
          Load your show
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="v9d-pitch" className="relative">
      <div
        className={`${FRAME} grid grid-cols-1 items-start gap-x-14 gap-y-12 pt-6 pb-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-12 lg:pb-24`}
      >
        <div className="relative z-10 flex flex-col gap-7 lg:pt-10">
          <p className="inline-flex w-fit items-center gap-2.5 rounded-full bg-(--v9d-plum) px-4 py-1.5 text-sm font-semibold text-(--v9d-soft) ring-1 ring-(--v9d-line)">
            <Logo className={`size-4 ${styles.gradientFill}`} />
            Guest finder for podcasts
          </p>
          <h1
            id="v9d-pitch"
            className={`${styles.headline} text-[clamp(3rem,4.9vw,4.4rem)] leading-[0.94] text-balance`}
          >
            Find the guest who carries your voice to <span className={styles.gradientText}>new ears.</span>
          </h1>
          <p className="max-w-[40ch] text-lg leading-relaxed text-(--v9d-soft) sm:text-xl">
            Echo reads what your listeners love on Qloo. Then it finds guests they&apos;ll love, whose own fans will
            love your show back.
          </p>
          <ShowSearch />
        </div>
        <div className="relative min-w-0">
          <Player />
        </div>
      </div>
    </section>
  );
}

function Scoring() {
  return (
    <section id="how" aria-labelledby="v9d-how" className="relative scroll-mt-4">
      <div className={`${FRAME} py-20 lg:py-28`}>
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div className="flex flex-col gap-6 lg:sticky lg:top-8">
            <p className="text-xs font-bold tracking-[0.18em] text-(--v9d-soft) uppercase">The three scores</p>
            <h2
              id="v9d-how"
              className={`${styles.headline} text-[clamp(2.4rem,4.6vw,4rem)] leading-[0.95] text-balance`}
            >
              How Echo scores a guest
            </h2>
            <p className="max-w-[46ch] text-lg leading-relaxed text-(--v9d-soft)">
              Your show has an audience. So does every guest. Echo measures how the two overlap in both directions, and
              how much of the guest&apos;s audience you don&apos;t reach yet.
            </p>
            <div className="mx-auto w-full max-w-[520px] lg:mx-0">
              <Overlap />
            </div>
          </div>
          <Mixer />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--v9d-line)">
      <div className={`${FRAME} flex flex-col gap-8 pt-12 pb-8 lg:flex-row lg:items-end lg:justify-between`}>
        <Wordmark size="text-xl" />
        <div className="flex flex-col gap-1.5 text-(--v9d-soft) lg:text-right">
          <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
      <p
        aria-hidden
        className={`${FRAME} ${styles.display} flex items-baseline gap-[0.25em] overflow-hidden pb-6 leading-none font-semibold tracking-[-0.05em] whitespace-nowrap select-none`}
      >
        <span className={`${styles.gradientText} text-[min(11vw,10rem)]`}>echo</span>
        <span className="text-[min(7vw,6.4rem)] text-(--v9d-love) opacity-45">echo</span>
        <span className="text-[min(4.4vw,4rem)] text-(--v9d-reach) opacity-30">echo</span>
        <span className="text-[min(2.8vw,2.6rem)] text-(--v9d-reach) opacity-20">echo</span>
        <span className="text-[min(1.8vw,1.6rem)] text-(--v9d-reach) opacity-12">echo</span>
      </p>
    </footer>
  );
}
