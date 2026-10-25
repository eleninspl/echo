import { Archivo, Mynerve, Newsreader } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { OverlapDiagram } from "./diagram";
import { HeroRun } from "./hero-run";
import { RunShows } from "./runs";
import { INK } from "./scores";
import { ShowSearch } from "./search";

const serif = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-w6-serif",
});
const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-w6-sans",
});
const hand = Mynerve({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-w6-hand",
});

const FRAME = "mx-auto w-full max-w-[1200px] px-4 sm:px-8 xl:px-0";

export default function DesignNineSix() {
  return (
    <div
      className={`${serif.variable} ${sans.variable} ${hand.variable} w6-root flex min-h-screen flex-col`}
    >
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

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <Logo className={small ? "size-5" : "size-7"} />
      <span
        className={`w6-serif leading-none font-semibold tracking-[-0.01em] ${small ? "text-[1.25rem]" : "text-[1.75rem]"}`}
      >
        Echo
      </span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={FRAME}>
      <div className="flex items-center justify-between gap-6 border-b border-(--w6-rule-strong) py-5">
        <Link href="/" aria-label="Echo, home">
          <Wordmark />
        </Link>
        <nav aria-label="On this page">
          <ul className="flex gap-6 text-[0.9375rem] font-medium sm:gap-8">
            <li className="hidden sm:block">
              <a href="#w6-how" className="w6-link">
                How a guest is scored
              </a>
            </li>
            <li>
              <a href="#w6-runs" className="w6-link">
                Shows Echo has run
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="w6-pitch" className={FRAME}>
      <div className="grid grid-cols-1 gap-y-14 pt-12 pb-20 lg:grid-cols-12 lg:gap-x-6 lg:pt-16 lg:pb-24">
        <div className="lg:col-span-7">
          <h1
            id="w6-pitch"
            className="w6-serif text-[clamp(2.6rem,5.4vw,4.75rem)] leading-[1.01] font-[450] tracking-[-0.024em]"
          >
            Find the guest who carries your voice to <em>new ears.</em>
          </h1>
          <p className="w6-serif mt-7 max-w-[42ch] text-[1.25rem] leading-[1.5] text-(--w6-soft) sm:text-[1.3125rem]">
            Echo reads what your listeners love on Qloo, then ranks the guests
            they&apos;d love to hear, and whose own fans would love your show
            back.
          </p>
          <div className="mt-10 max-w-[560px]">
            <ShowSearch />
          </div>
        </div>
        <div className="lg:col-span-5 lg:-mt-6">
          <HeroRun />
        </div>
      </div>
    </section>
  );
}

const TERMS = [
  {
    term: "Fit",
    color: INK.fit,
    text: "Your listeners like this guest more than the guest's fame alone would explain.",
  },
  {
    term: "Love back",
    color: INK.love,
    text: "The guest's fans like your show more than most people do, so the listeners they bring have a reason to stay.",
  },
  {
    term: "Reach",
    color: INK.reach,
    text: "How much of the guest's audience doesn't listen to you yet. These are the new ears.",
  },
  {
    term: "Sweet spot",
    color: "var(--w6-ink)",
    text: "High on all three at once. It's rare, usually 1 to 4 guests in 20, and Echo says how many it found.",
  },
];

function Scoring() {
  return (
    <section
      id="w6-how"
      aria-labelledby="w6-how-title"
      className={`${FRAME} scroll-mt-6`}
    >
      <div className="grid grid-cols-1 gap-y-10 border-t-[1.5px] border-(--w6-ink) pt-14 pb-24 lg:grid-cols-12 lg:gap-x-6 lg:pt-20">
        <div className="lg:col-span-6">
          <h2
            id="w6-how-title"
            className="w6-serif text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] font-medium tracking-[-0.018em]"
          >
            How Echo scores a guest
          </h2>
          <p className="w6-serif mt-4 max-w-[44ch] text-[1.1875rem] leading-relaxed text-(--w6-soft)">
            Every guest has an audience too. Echo compares it with yours in both
            directions, then measures how much of it you don&apos;t reach yet.
          </p>
          <OverlapDiagram className="mt-10 block h-auto w-full max-w-[540px]" />
        </div>
        <div className="lg:col-span-5 lg:col-start-8 lg:pt-3">
          <dl className="border-t border-(--w6-rule-strong)">
            {TERMS.map(({ term, color, text }) => (
              <div
                key={term}
                className="grid grid-cols-1 gap-1 border-b border-(--w6-rule) py-5 sm:grid-cols-[116px_minmax(0,1fr)] sm:gap-5"
              >
                <dt
                  className="text-[1.0625rem] leading-snug font-semibold"
                  style={{ color }}
                >
                  {term}
                </dt>
                <dd className="w6-serif text-[1.125rem] leading-[1.5] text-(--w6-soft)">
                  {text}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-(--w6-soft)">
            Echo also tells you when a guest is{" "}
            <span className="font-semibold text-(--w6-ink)">Safe</span>, loved
            both ways but adding few new ears, or{" "}
            <span className="font-semibold text-(--w6-ink)">Far</span>, new ears
            that may not stay.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={`${FRAME} mt-auto`}>
      <div className="grid grid-cols-1 gap-6 border-t border-(--w6-rule-strong) pt-8 pb-12 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <Wordmark small />
        </div>
        <div className="flex flex-col gap-1 text-[0.9375rem] leading-relaxed text-(--w6-soft) lg:col-span-7 lg:col-start-6">
          <p>
            Echo reads Qloo&apos;s taste data. Results describe audiences as
            groups, never one listener.
          </p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
    </footer>
  );
}
