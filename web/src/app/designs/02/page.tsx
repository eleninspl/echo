import { Inter_Tight } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import styles from "./classes";
import "./design.css";
import { EchoFigure, Glyph, OverlapFigure, type GlyphKind } from "./figures";
import { DISPLAY, FRAME, GRID } from "./grid";
import { SectionHead } from "./parts";
import { Finder } from "./search";
import { RunShows } from "./shows";

const interTight = Inter_Tight({ variable: "--font-swiss", subsets: ["latin"] });

const TERMS: { kind: GlyphKind; number: string; term: string; means: string }[] = [
  {
    kind: "fit",
    number: "01",
    term: "Fit",
    means: "Your listeners over-index on the guest, beyond what the guest's fame alone predicts. It runs from your show to the guest.",
  },
  {
    kind: "love_back",
    number: "02",
    term: "Love back",
    means: "The guest's fans over-index on your show. It runs the other way, from the guest back to you.",
  },
  {
    kind: "reach",
    number: "03",
    term: "Reach",
    means: "How new the guest's fans are to your show: the red your black circle doesn't cover.",
  },
  {
    kind: "sweet_spot",
    number: "04",
    term: "Sweet spot",
    means: "High on all three. It is rare, about 1 to 4 guests in 20, and Echo tells you when it finds one.",
  },
];

export default function SwissHome() {
  return (
    <div className={`${interTight.variable} ${styles.root} relative isolate flex min-h-screen flex-col overflow-x-clip`}>
      <Raster />

      <header className={`${FRAME} pt-5 md:pt-7`}>
        <div className={`${GRID} items-start border-b-2 border-(--ink) pb-4`}>
          <Link href="/designs/02" className="col-span-2 flex items-center gap-2.5 self-center md:col-span-3">
            <Logo className="size-8" />
            <span className="text-[26px] leading-none font-bold tracking-[-0.04em]">Echo</span>
          </Link>
          <p className="col-span-2 self-center text-right text-[13px] leading-[1.3] md:col-span-3 md:text-left">
            Guest finder
            <br />
            for podcast hosts
          </p>
          <p className="hidden text-[13px] leading-[1.3] md:col-span-3 md:block">
            Built on Qloo&apos;s
            <br />
            taste data
          </p>
          <nav aria-label="On this page" className="hidden md:col-span-3 md:block">
            <ul className="text-[13px] leading-[1.3]">
              <li>
                <a href="#d02-search" className="hover:text-(--red)">
                  <span className="mr-2 font-bold text-(--red)">01</span>Find your show
                </a>
              </li>
              <li>
                <a href="#d02-scoring" className="hover:text-(--red)">
                  <span className="mr-2 font-bold text-(--red)">02</span>How Echo scores
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section aria-labelledby="d02-title" className={`${FRAME} pt-12 pb-28 md:pt-16 md:pb-40`}>
          <div className={GRID}>
            <h1
              id="d02-title"
              className={`${DISPLAY} col-span-full text-[clamp(3.25rem,8.6vw,7.75rem)] leading-[0.88] md:col-span-11 lg:col-start-1 lg:row-start-1`}
            >
              Find the guest who carries your voice to <span className="text-(--red)">new ears.</span>
            </h1>
            <Finder figure={<EchoFigure />} />
          </div>
        </section>

        <section id="d02-scoring" aria-labelledby="d02-scoring-title" className={`${FRAME} pb-28 md:pb-40`}>
          <SectionHead
            number="02"
            id="d02-scoring-title"
            title="How Echo scores a guest"
            note="Two audiences overlap. Echo measures each one's pull on the other, and what's left over."
          />
          <div className={`${GRID} mt-12 gap-y-14 md:mt-16`}>
            <figure className="col-span-full md:col-span-7 lg:col-span-7">
              <OverlapFigure />
            </figure>
            <dl className="col-span-full flex flex-col md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
              {TERMS.map(({ kind, number, term, means }) => (
                <div key={kind} className="grid grid-cols-[3rem_1fr] gap-x-5 border-t border-(--ink) py-5 last:border-b">
                  <Glyph kind={kind} />
                  <div>
                    <dt className="flex items-baseline gap-3 text-[22px] leading-tight font-bold tracking-[-0.02em]">
                      <span className={`text-[15px] ${kind === "sweet_spot" ? "text-(--red)" : ""}`}>{number}</span>
                      {term}
                    </dt>
                    <dd className="mt-1.5 text-[16px] leading-snug">{means}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <RunShows />
      </main>

      <footer className={`${styles.inverse} bg-(--ink) text-(--paper)`}>
        <div className={`${FRAME} pt-12 pb-10 md:pt-16`}>
          <div className={`${GRID} gap-y-8`}>
            <div className="col-span-full flex items-center gap-2.5 md:col-span-3 md:items-start">
              <Logo className="size-8" />
              <span className="text-[26px] leading-none font-bold tracking-[-0.04em]">Echo</span>
            </div>
            <p className={`${DISPLAY} col-span-full text-[clamp(1.5rem,2.2vw,2rem)] leading-[1.08] tracking-[-0.03em] md:col-span-4 md:col-start-5`}>
              Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.
            </p>
            <p className={`${DISPLAY} col-span-full text-[clamp(1.5rem,2.2vw,2rem)] leading-[1.08] tracking-[-0.03em] md:col-span-4 md:col-start-9`}>
              Echo sends nothing. <span className="text-(--red)">Invitations are yours to send.</span>
            </p>
          </div>
          <div className={`${GRID} mt-16 border-t border-white/25 pt-4 text-[13px]`}>
            <p className="col-span-2 md:col-span-4">Qloo Agentic Hackathon 2026</p>
            <p className="col-span-2 text-right md:col-span-4 md:col-start-9">Find the guest who carries your voice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Raster() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className={`${FRAME} h-full`}>
        <div className={`${GRID} h-full`}>
          {Array.from({ length: 12 }, (_, column) => (
            <span key={column} className={`h-full border-x border-(--rule) ${column >= 4 ? "hidden md:block" : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
