import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { Anatomy } from "./anatomy";
import { Rings, Strip } from "./ripples";
import { RunsProvider } from "./runs";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";
import { Spotlight } from "./spotlight";
import { styles } from "./styles";
import { Bars } from "./wave";

const brand = Unbounded({ subsets: ["latin"], variable: "--font-v9a-brand" });
const body = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], variable: "--font-v9a-body" });

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";

export default function DesignNineA() {
  return (
    <RunsProvider>
      <div className={`${brand.variable} ${body.variable} ${styles.root} flex min-h-screen flex-col`}>
        <Masthead />
        <Hero />
        <Anatomy />
        <RunShows />
        <Footer />
      </div>
    </RunsProvider>
  );
}

function Wordmark({ size = "text-2xl" }: { size?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className={`size-9 ${styles.gradientFill}`} />
      <span className={`${styles.brand} ${size} font-semibold tracking-[-0.04em]`}>echo</span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={`${FRAME} relative z-20 flex items-center justify-between gap-4 py-5`}>
      <Link href="/" aria-label="Echo, home" className="rounded-full">
        <Wordmark />
      </Link>
      <nav aria-label="On this page" className="flex items-center gap-1 text-base font-semibold">
        <a
          href="#how"
          className="hidden rounded-full px-4 py-2 text-(--v9a-soft) transition-colors hover:text-(--v9a-ink) sm:inline-flex"
        >
          How it scores
        </a>
        <a
          href="#find"
          className="rounded-full px-4 py-2 text-(--v9a-ink) ring-1 ring-(--v9a-line) transition-shadow hover:ring-(--v9a-fit)"
        >
          Find your show
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="v9a-pitch" className="relative">
      <div
        className={`${FRAME} grid grid-cols-1 items-center gap-y-14 pt-8 pb-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-x-16 lg:pt-10 lg:pb-14`}
      >
        <div className="relative z-10 flex flex-col gap-7">
          <p className="inline-flex w-fit items-center gap-2.5 rounded-full bg-(--v9a-plum) px-4 py-1.5 text-[15px] font-semibold text-(--v9a-soft) ring-1 ring-(--v9a-line)">
            <Bars className="text-(--v9a-love)" />
            Guest finder for podcasts
          </p>
          <h1
            id="v9a-pitch"
            className={`${styles.headline} text-[clamp(3rem,6.6vw,5.9rem)] leading-[0.92] tracking-[-0.015em] text-balance`}
          >
            <span className="lg:block">Find the guest who </span>
            <span className="lg:block">carries your voice </span>
            <span className="lg:block">
              to <span className={styles.gradientText}>new&nbsp;ears.</span>
            </span>
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-(--v9a-soft) sm:text-xl">
            Echo reads what your listeners love on Qloo, then finds guests they&apos;ll love whose own fans will love
            your show back.
          </p>
          <ShowSearch />
        </div>
        <div className="relative">
          <Rings className="pointer-events-none absolute top-1/2 left-1/2 -z-10 w-[170%] max-w-none -translate-x-1/2 -translate-y-1/2" />
          <Spotlight />
        </div>
      </div>
      <Strip />
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--v9a-line)">
      <div className={`${FRAME} flex flex-col gap-8 pt-12 pb-8 lg:flex-row lg:items-end lg:justify-between`}>
        <Wordmark size="text-xl" />
        <div className="flex flex-col gap-1.5 text-[17px] text-(--v9a-soft) lg:text-right">
          <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
      <p
        aria-hidden
        className={`${FRAME} ${styles.brand} flex items-baseline gap-[0.25em] overflow-hidden pb-6 leading-none font-semibold tracking-[-0.05em] whitespace-nowrap select-none`}
      >
        <span className={`${styles.gradientText} text-[min(11vw,10rem)]`}>echo</span>
        <span className="text-[min(7vw,6.4rem)] text-(--v9a-love) opacity-45">echo</span>
        <span className="text-[min(4.4vw,4rem)] text-(--v9a-reach) opacity-30">echo</span>
        <span className="text-[min(2.8vw,2.6rem)] text-(--v9a-reach) opacity-20">echo</span>
        <span className="text-[min(1.8vw,1.6rem)] text-(--v9a-reach) opacity-12">echo</span>
      </p>
    </footer>
  );
}
