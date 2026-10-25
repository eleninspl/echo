import { Libre_Franklin, Newsreader } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { Explainer } from "./explainer";
import { RunFinding } from "./finding";
import { RunLead, RunOverview } from "./overview";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-w5-serif",
});

const sans = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-w5-sans",
});

const FRAME = "mx-auto w-full max-w-[1240px] px-4 sm:px-8 lg:px-10";

export default function DesignDataStory() {
  return (
    <div className={`${serif.variable} ${sans.variable} w5-root flex min-h-screen flex-col`}>
      <Masthead />
      <main className="flex flex-col">
        <Hero />
        <Explainer />
        <RunFinding />
        <RunShows />
      </main>
      <Footer />
    </div>
  );
}

function Masthead() {
  return (
    <header className={FRAME}>
      <div className="flex items-center justify-between gap-6 border-b border-(--w5-line-strong) py-4">
        <Link href="/" aria-label="Echo, home" className="flex items-center gap-2.5">
          <Logo className="size-7 text-(--w5-ink)" />
          <span className="w5-serif text-[1.65rem] leading-none font-semibold tracking-[-0.01em]">Echo</span>
        </Link>
        <nav aria-label="On this page" className="flex items-center gap-6 text-[0.95rem] font-medium">
          <a href="#how" className="hidden underline-offset-4 hover:underline sm:inline">
            How scoring works
          </a>
          <a href="#runs" className="hidden underline-offset-4 hover:underline md:inline">
            Shows Echo has run
          </a>
          <a href="#search" className="font-semibold underline decoration-1 underline-offset-4 hover:decoration-2">
            Search your show
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="w5-pitch" className={`${FRAME} pt-10 lg:pt-14`}>
      <h1
        id="w5-pitch"
        className="w5-serif max-w-[15em] text-[clamp(2.55rem,5.6vw,5.1rem)] leading-[1.02] font-medium tracking-[-0.022em] text-balance"
      >
        Find the guest who carries your voice to new ears.
      </h1>
      <div className="mt-8 grid grid-cols-1 gap-y-14 lg:mt-12 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-4">
          <p className="w5-serif text-[1.3rem] leading-[1.45] text-(--w5-soft)">
            Echo reads what your listeners love on Qloo. Then it looks for guests they&apos;ll love, whose own
            fans will love your show back.
          </p>
          <RunLead />
          <div className="mt-8">
            <ShowSearch />
          </div>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <RunOverview />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={`${FRAME} mt-auto pt-24`}>
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 border-t-2 border-(--w5-ink) pt-6 pb-14 lg:grid-cols-12">
        <div className="flex items-start gap-2.5 lg:col-span-3">
          <Logo className="size-6 text-(--w5-ink)" />
          <span className="w5-serif text-[1.35rem] leading-none font-semibold">Echo</span>
        </div>
        <div className="lg:col-span-5">
          <h2 className="text-[0.95rem] font-bold">About the numbers</h2>
          <div className="mt-2 flex flex-col gap-2 text-[0.9rem] leading-[1.5] text-(--w5-soft)">
            <p>
              Every score is a percentile within one run. A fit of 50 means half of the other guests Echo found
              for that show score lower.
            </p>
            <p>In runs of eight or more guests, fit is corrected for fame.</p>
            <p>
              Reach is left blank when too few of the guest&apos;s fans&apos; podcasts can be compared with yours.
              That guest needs 50 on both fit and love back to be a sweet spot.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-[0.9rem] leading-[1.5] lg:col-span-4">
          <h2 className="text-[0.95rem] font-bold">What Echo does with it</h2>
          <p className="text-(--w5-soft)">
            Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.
          </p>
          <p className="text-(--w5-soft)">Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
    </footer>
  );
}
