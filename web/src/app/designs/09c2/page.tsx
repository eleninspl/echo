import {
  Archivo,
  Libre_Caslon_Display,
  Libre_Caslon_Text,
} from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

import { RunCredits } from "./credits";
import "./design.css";
import { HeroRun, InInk } from "./hero-run";
import type { Part } from "./inks";
import { OverlapFigure } from "./overlap";
import { ShowSearch } from "./search";
import { RunShows } from "./shows";

const display = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-w2-display",
});
const text = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-w2-text",
});
const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-w2-sans",
});

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";

export default function DesignLinerNotes() {
  return (
    <div
      className={`${display.variable} ${text.variable} ${sans.variable} w2-root flex min-h-screen flex-col`}
    >
      <Masthead />
      <main>
        <Hero />
        <Scoring />
        <RunShows frame={FRAME} />
      </main>
      <Colophon />
    </div>
  );
}

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className={small ? "size-6" : "size-7"} />
      <span
        className={`w2-display leading-none ${small ? "text-[1.6rem]" : "text-[2.1rem]"}`}
      >
        Echo
      </span>
    </span>
  );
}

function Masthead() {
  return (
    <header className={FRAME}>
      <div className="flex items-center justify-between gap-6 border-b border-(--w2-ink) py-4">
        <Link href="/" aria-label="Echo, home">
          <Wordmark />
        </Link>
        <nav
          aria-label="On this page"
          className="w2-sans flex items-center gap-6 text-[0.95rem]"
        >
          <a href="#how" className="w2-link-quiet hidden sm:inline">
            How it scores
          </a>
          <a href="#shows" className="w2-link-quiet hidden sm:inline">
            Shows Echo has run
          </a>
          <a href="#find" className="w2-link font-semibold">
            Search for your show
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="w2-pitch" className={FRAME}>
      <div className="grid grid-cols-1 gap-y-14 pt-10 pb-20 lg:grid-cols-12 lg:gap-x-6 lg:pt-14 lg:pb-24">
        <div className="flex flex-col lg:col-span-7">
          <h1
            id="w2-pitch"
            className="w2-display text-[clamp(2.9rem,6.3vw,5.6rem)] leading-[0.95] tracking-[-0.012em]"
          >
            Find the guest who carries your voice to{" "}
            <span className="w2-italic tracking-[-0.03em]">new ears.</span>
          </h1>
          <p className="mt-8 max-w-[33em] text-[1.18rem] leading-[1.55] text-(--w2-soft) sm:text-[1.3rem]">
            Echo reads what your listeners over-index on in Qloo&apos;s taste
            data, then ranks guests they&apos;ll love whose own fans will love
            your show back. The best of them bring people who don&apos;t listen
            yet.
          </p>
          <div className="mt-10 max-w-[36rem]">
            <ShowSearch />
          </div>
          <Footnote id="w2-note-search" mark="1" className="mt-3 max-w-[36rem]">
            Echo searches the podcasts Qloo knows, and only when you press
            Search or Enter. Each search is a call to Qloo.
          </Footnote>
        </div>
        <div className="lg:col-span-5 lg:pt-1">
          <HeroRun />
        </div>
      </div>
    </section>
  );
}

function Footnote({
  id,
  mark,
  className = "",
  ruled = true,
  children,
}: {
  id: string;
  mark: string;
  className?: string;
  ruled?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      className={`grid scroll-mt-10 grid-cols-[1.1rem_minmax(0,1fr)] text-[0.92rem] leading-relaxed text-(--w2-soft) ${ruled ? "border-t border-(--w2-rule) pt-3" : ""} ${className}`}
    >
      <span className="w2-figures">{mark}</span>
      <span>{children}</span>
    </p>
  );
}

const NOTES: { part: Part | null; term: string; text: ReactNode }[] = [
  {
    part: "fit",
    term: "Fit",
    text: (
      <>
        From your show to the guest. Your listeners over-index
        <a href="#w2-note-index" aria-label="Note 2" className="w2-mark">
          2
        </a>{" "}
        on the guest, beyond what the guest&apos;s fame alone explains.
      </>
    ),
  },
  {
    part: "love",
    term: "Love back",
    text: "From the guest to your show. The guest's fans over-index on your show, so the people they bring have a reason to stay.",
  },
  {
    part: "reach",
    term: "Reach",
    text: "The guest's fans you don't have yet. The podcasts they favour are ones your listeners don't.",
  },
  {
    part: null,
    term: "Sweet spot",
    text: "High on all three at once. Reach and love back pull against each other, so it's rare: usually 1 to 4 guests in 20. Echo tells you how many it found, even when it's none.",
  },
];

function Scoring() {
  return (
    <section
      id="how"
      aria-labelledby="w2-how"
      className={`${FRAME} scroll-mt-6`}
    >
      <div className="grid grid-cols-1 gap-y-10 border-t-2 border-(--w2-ink) pt-8 lg:grid-cols-12 lg:gap-x-6 lg:pt-10">
        <div className="lg:col-span-3">
          <h2
            id="w2-how"
            className="w2-display text-[clamp(2.4rem,4.2vw,3.5rem)] leading-[1.02] tracking-[-0.01em]"
          >
            How Echo scores a guest
          </h2>
          <p className="mt-5 max-w-[34ch] text-[1.08rem] leading-[1.55] text-(--w2-soft) italic">
            Your show has an audience, and so does every guest. Echo compares
            the two in both directions, then asks how much of the guest&apos;s
            audience you don&apos;t reach yet.
          </p>
        </div>
        <div className="lg:col-span-9 lg:pt-2">
          <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-9 lg:gap-x-6">
            <figure className="lg:col-span-5">
              <div className="mx-auto max-w-[540px] lg:mx-0">
                <OverlapFigure />
              </div>
              <figcaption className="mt-5 grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-t border-(--w2-rule) pt-4 text-[1rem] leading-[1.55] text-(--w2-soft)">
                <span className="w2-sans pt-[0.2rem] text-[0.8rem] font-semibold text-(--w2-ink)">
                  Fig. 2
                </span>
                <span>
                  Two audiences and what they share.{" "}
                  <InInk part="fit">Fit</InInk> and{" "}
                  <InInk part="love">love back</InInk> are read across the
                  overlap, one in each direction.{" "}
                  <InInk part="reach">Reach</InInk> is the hatched part: the
                  guest&apos;s fans your show doesn&apos;t have.
                </span>
              </figcaption>
            </figure>

            <div className="lg:col-span-4">
              <dl className="border-t-2 border-(--w2-ink)">
                {NOTES.map((note) => (
                  <div
                    key={note.term}
                    className="border-b border-(--w2-rule) py-4"
                  >
                    <dt
                      className="w2-sans text-[1rem] font-semibold"
                      style={
                        note.part
                          ? { color: `var(--w2-${note.part})` }
                          : undefined
                      }
                    >
                      {note.term}
                    </dt>
                    <dd className="mt-1 text-[1.08rem] leading-[1.55]">
                      {note.text}
                    </dd>
                  </div>
                ))}
              </dl>
              <Footnote
                id="w2-note-index"
                mark="2"
                ruled={false}
                className="mt-4"
              >
                Over-index: the share is higher among your listeners than in
                Qloo&apos;s data as a whole. Fit is also corrected for fame, so
                a guest doesn&apos;t rank high only for being famous.
              </Footnote>
            </div>
          </div>
        </div>
        <RunCredits />
      </div>
    </section>
  );
}

function Colophon() {
  return (
    <footer className={`${FRAME} mt-auto`}>
      <div className="grid grid-cols-1 gap-y-6 border-t-2 border-(--w2-ink) pt-8 pb-12 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <Wordmark small />
        </div>
        <div className="text-[1.05rem] leading-relaxed lg:col-span-5">
          <p>
            Echo reads Qloo&apos;s taste data. Results describe audiences as
            groups, never one listener.
          </p>
          <p className="mt-2">
            Echo sends nothing. Invitations are yours to send.
          </p>
        </div>
        <p className="text-[0.92rem] leading-relaxed text-(--w2-soft) italic lg:col-span-3">
          Set in Libre Caslon and Archivo. Made for the Qloo Agentic Hackathon,
          2026.
        </p>
      </div>
    </footer>
  );
}
