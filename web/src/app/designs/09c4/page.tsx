import { Radio_Canada } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { LabelRows } from "./examples";
import { HeroRun } from "./hero-run";
import { OverlapFigure } from "./overlap";
import { PARTS, SCORE, SCORE_NAME, type Part } from "./palette";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";

const radioCanada = Radio_Canada({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  variable: "--font-w4",
});

export default function DesignNineCFour() {
  return (
    <div
      className={`${radioCanada.variable} w4-root flex min-h-screen flex-col`}
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

function Lockup() {
  return (
    <span className="inline-flex items-baseline leading-none">
      <Logo className="mr-[0.06em] size-[1.6em] translate-y-[0.44em]" />
      <span className="font-medium tracking-[-0.02em]">echo</span>
    </span>
  );
}

function Masthead() {
  return (
    <header className="w4-frame">
      <div className="flex items-baseline justify-between gap-6 border-b border-(--w4-ink) pt-3 pb-5">
        <Link href="/" aria-label="Echo, home" className="text-[1.875rem]">
          <Lockup />
        </Link>
        <nav aria-label="On this page" className="flex items-center gap-7">
          <a
            href="#w4-how"
            className="hidden underline-offset-[6px] hover:underline sm:inline"
          >
            How Echo scores
          </a>
          <a
            href="#w4-runs"
            className="underline-offset-[6px] hover:underline"
          >
            Shows Echo has run
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="w4-pitch" className="w4-frame">
      <div className="grid grid-cols-1 gap-y-14 pt-10 pb-6 lg:grid-cols-12 lg:gap-x-6 lg:pt-14">
        <div className="flex flex-col lg:col-span-7">
          <h1
            id="w4-pitch"
            className="w4-narrow text-[clamp(3rem,6vw,5.5rem)] leading-[0.92] font-semibold tracking-[-0.012em] text-balance"
          >
            Find the guest who carries your voice to new ears.
          </h1>
          <p className="mt-8 max-w-[38ch] text-[1.25rem] leading-normal text-(--w4-soft)">
            Type your show&apos;s name. Echo reads what your listeners love on
            Qloo, then ranks guests they&apos;ll love whose own fans will love
            your show back.
          </p>
          <div className="mt-10 max-w-[600px]">
            <ShowSearch />
          </div>
        </div>
        <div className="lg:col-span-5 lg:-mt-4">
          <HeroRun />
        </div>
      </div>
    </section>
  );
}

const DEFINITIONS: { part: Part; way: string; text: string }[] = [
  {
    part: "fit",
    way: "Your show to the guest",
    text: "Your listeners over-index on the guest, beyond what the guest's fame alone explains.",
  },
  {
    part: "love",
    way: "The guest to your show",
    text: "The guest's fans over-index on your show, so the people they bring have a reason to stay.",
  },
  {
    part: "reach",
    way: "Fans you don't have yet",
    text: "The guest's fans are new to you: the podcasts they favour aren't the ones your listeners do.",
  },
];

function Scoring() {
  return (
    <section
      id="w4-how"
      aria-labelledby="w4-how-title"
      className="w4-frame scroll-mt-6 pt-20 lg:pt-28"
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 border-t-2 border-(--w4-ink) pt-6 lg:grid-cols-12 lg:gap-y-10">
        <div className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-6">
          <h2
            id="w4-how-title"
            className="w4-narrow text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[0.95] font-semibold text-balance"
          >
            How Echo scores a guest
          </h2>
          <p className="max-w-[40ch] text-(--w4-soft)">
            Your show has an audience, and so does every guest. Echo measures
            how the two overlap in each direction, and how much of the
            guest&apos;s audience you don&apos;t reach yet. Each score runs
            from 0 to 100.
          </p>
          <dl className="order-last flex flex-col border-t border-(--w4-rule) lg:order-none lg:mt-2">
            {PARTS.map((part) => {
              const entry = DEFINITIONS.find((item) => item.part === part)!;
              return (
                <div
                  key={part}
                  className="flex flex-col gap-1 border-b border-(--w4-rule) py-4"
                >
                  <dt className="flex items-baseline justify-between gap-4">
                    <span
                      className="w4-narrow text-[1.5rem] leading-none font-semibold"
                      style={{ color: SCORE[part] }}
                    >
                      {SCORE_NAME[part]}
                    </span>
                    <span className="text-sm text-(--w4-dim) italic">
                      {entry.way}
                    </span>
                  </dt>
                  <dd className="leading-snug text-(--w4-soft)">
                    {entry.text}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
        <figure className="flex flex-col justify-center lg:col-span-8 lg:pl-6">
          <OverlapFigure className="block h-auto w-full" />
        </figure>
      </div>
      <div className="mt-20">
        <LabelRows />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="w4-frame mt-auto pt-20">
      <div className="grid grid-cols-1 gap-6 border-t-2 border-(--w4-ink) pt-8 pb-12 lg:grid-cols-12 lg:gap-x-6">
        <div className="text-[1.5rem] lg:col-span-4">
          <Lockup />
        </div>
        <div className="flex flex-col gap-1 text-(--w4-soft) lg:col-span-6 lg:col-start-5">
          <p>
            Echo reads Qloo&apos;s taste data. Results describe audiences as
            groups, never one listener.
          </p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
        <p className="text-sm text-(--w4-dim) lg:col-span-2 lg:text-right">
          Set in Radio Canada
        </p>
      </div>
    </footer>
  );
}
