import { Archivo, Newsreader } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { AudienceDiagram } from "./glyphs";
import { HeroRun } from "./hero-run";
import { ScoreFigure, SweetSpot } from "./scoring";
import { ShowSearch } from "./search";
import { RunShows, ShowsLink } from "./shows";
import { FRAME, styles } from "./styles";

const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-w1-sans",
});
const serif = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-w1-serif",
});

export default function DesignDaylightEdited() {
  return (
    <div
      className={`${sans.variable} ${serif.variable} ${styles.root} flex min-h-screen flex-col`}
    >
      <Masthead />
      <Hero />
      <Scoring />
      <RunShows />
      <Footer />
    </div>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-7" />
      <span
        className={`${styles.wide} text-[1.375rem] leading-none font-semibold tracking-[-0.02em]`}
      >
        Echo
      </span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={FRAME}>
      <div className="flex items-center justify-between gap-6 border-b border-(--w1-line) py-5">
        <Link href="/" aria-label="Echo, home">
          <Wordmark />
        </Link>
        <nav
          aria-label="On this page"
          className="flex items-center gap-7 text-[0.95rem] font-medium text-(--w1-soft)"
        >
          <a
            href="#how"
            className="decoration-1 underline-offset-4 hover:text-(--w1-ink) hover:underline"
          >
            How scoring works
          </a>
          <ShowsLink />
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      aria-labelledby="w1-pitch"
      className={`${FRAME} grid grid-cols-1 gap-x-6 gap-y-16 pt-12 pb-24 lg:grid-cols-12 lg:pt-20 lg:pb-32`}
    >
      <div className="lg:col-span-7 lg:pr-10">
        <h1
          id="w1-pitch"
          className={`${styles.wide} max-w-[14ch] text-[clamp(2.5rem,5vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance`}
        >
          Find the guest who carries your voice to new ears.
        </h1>
        <p
          className={`${styles.serif} mt-7 max-w-[38ch] text-[1.3125rem] leading-[1.45] text-(--w1-soft)`}
        >
          Echo reads your listeners’ taste on Qloo and ranks the guests
          they’d like, whose own fans would like your show back.
        </p>
        <div className="mt-12 max-w-[560px]">
          <ShowSearch />
        </div>
      </div>
      <div className="lg:col-span-5">
        <HeroRun />
      </div>
    </section>
  );
}

function Scoring() {
  return (
    <section
      id="how"
      aria-labelledby="w1-how"
      className="scroll-mt-6 border-y border-(--w1-line) bg-(--w1-paper)"
    >
      <div
        className={`${FRAME} grid grid-cols-1 gap-x-6 gap-y-12 py-20 lg:grid-cols-12 lg:py-28`}
      >
        <div className="lg:col-span-3">
          <h2
            id="w1-how"
            className={`${styles.wide} text-[clamp(1.875rem,2.6vw,2.25rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance`}
          >
            How Echo scores a guest
          </h2>
          <p
            className={`${styles.serif} mt-4 max-w-[34ch] text-[1.125rem] leading-[1.5] text-(--w1-soft)`}
          >
            Your show has an audience, and so does every guest. Echo compares
            the two in both directions, then checks how much of the
            guest’s audience you don’t reach yet.
          </p>
          <AudienceDiagram className="mt-10 h-auto w-full max-w-[258px]" />
        </div>
        <div className="min-w-0 lg:col-span-9">
          <ScoreFigure />
          <SweetSpot />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={`${FRAME} mt-auto pt-20`}>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 border-t-[1.5px] border-(--w1-ink) pt-6 pb-12 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <Wordmark />
        </div>
        <div
          className={`${styles.serif} text-[1.0625rem] leading-[1.5] text-(--w1-soft) lg:col-span-6`}
        >
          <p>
            Echo reads Qloo’s taste data. Results describe audiences as
            groups, never one listener.
          </p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
        <p className="text-[0.9rem] text-(--w1-dim) lg:col-span-3 lg:text-right">
          Made for the Qloo Agentic Hackathon 2026
        </p>
      </div>
    </footer>
  );
}
