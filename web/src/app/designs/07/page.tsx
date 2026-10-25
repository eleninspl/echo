import { Cormorant_Garamond, Cormorant_SC, Jost } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

import { EMBER, Eyebrow, GOLD, Rule, SectionHead, SERIF, SILVER, SMALL_CAPS, Starfield, starPath, css } from "./atlas";
import { ChartedShows } from "./charted";
import { HeroChart, Plate, type PlateKind } from "./charts";
import { ShowSearch } from "./search";
import "./design.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-atlas-serif",
});

const smallCaps = Cormorant_SC({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-atlas-sc" });

const sans = Jost({ subsets: ["latin"], variable: "--font-atlas-sans" });

const WRAP = "mx-auto w-full max-w-[1240px] px-4 sm:px-8";

const PLATES: { kind: PlateKind; numeral: string; name: string; sign: ReactNode; text: string }[] = [
  {
    kind: "fit",
    numeral: "I",
    name: "Fit",
    sign: <LineSign color={SILVER} />,
    text: "Your listeners over-index on the guest, beyond what the guest's fame alone would predict.",
  },
  {
    kind: "love",
    numeral: "II",
    name: "Love back",
    sign: <LineSign color={GOLD} dashed />,
    text: "The guest's fans over-index on your show. The pull runs back the other way.",
  },
  {
    kind: "reach",
    numeral: "III",
    name: "Reach",
    sign: <HatchSign />,
    text: "How many of the guest's fans are new to your show. These are the new ears.",
  },
  {
    kind: "sweet",
    numeral: "IV",
    name: "Sweet spot",
    sign: <BrightSign />,
    text: "High on all three at once. It is rare, 1 to 4 guests in 20, and Echo tells you so.",
  },
];

export default function ConstellationsHome() {
  return (
    <div
      id="top"
      className={`${serif.variable} ${smallCaps.variable} ${sans.variable} ${css.sky} relative isolate flex min-h-screen flex-col overflow-x-clip font-(family-name:--font-atlas-sans) text-(--atlas-mist)`}
    >
      <Starfield seed="echo-atlas-07" count={420} />

      <header className="relative">
        <div className={`${WRAP} flex h-20 items-center justify-between gap-6`}>
          <Link href="/" className="group flex items-center gap-3">
            <Logo className="size-8 text-(--atlas-gold)" />
            <span className={`${SMALL_CAPS} text-[1.6rem] leading-none font-semibold tracking-[0.18em] text-(--atlas-parchment)`}>
              Echo
            </span>
            <span
              className={`${SERIF} hidden border-l border-(--atlas-line-strong) pl-3 text-lg text-(--atlas-mist) italic sm:inline`}
            >
              a guest atlas for podcasts
            </span>
          </Link>
          <nav aria-label="On this page">
            <ul className={`${SMALL_CAPS} flex items-center gap-6 text-[1.05rem] font-semibold tracking-[0.16em] lowercase`}>
              <li className="hidden md:block">
                <a href="#find" className="text-(--atlas-mist) hover:text-(--atlas-parchment)">
                  Find your show
                </a>
              </li>
              <li>
                <a href="#signs" className="text-(--atlas-gold) hover:text-(--atlas-parchment)">
                  How it scores
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <Rule className={WRAP} />
      </header>

      <div className="relative flex flex-1 flex-col gap-28 pb-24 sm:gap-36">
        <section
          id="find"
          aria-labelledby="hero-title"
          className={`${WRAP} grid scroll-mt-8 grid-cols-1 items-start gap-x-14 gap-y-12 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:pt-20`}
        >
          <div className="flex flex-col gap-8">
            <Eyebrow>For podcast hosts and producers</Eyebrow>
            <h1
              id="hero-title"
              className={`${SERIF} -mt-2 text-[clamp(2.9rem,6vw,5.4rem)] leading-[0.98] font-light tracking-[-0.01em] text-balance text-(--atlas-parchment)`}
            >
              Find the guest who carries your voice to <em className="font-normal text-(--atlas-ember)">new ears</em>.
            </h1>
            <p className="max-w-[50ch] text-[1.1rem] leading-relaxed text-(--atlas-mist)">
              Echo charts what your listeners love across music, film, books and brands, from Qloo&apos;s taste
              data. Then it finds guests your audience will love, whose own fans will love your show back.
            </p>
            <ShowSearch />
          </div>

          <figure className="flex flex-col items-center gap-4 lg:sticky lg:top-8">
            <div className="w-full max-w-[540px]">
              <HeroChart />
            </div>
            <figcaption className="max-w-[44ch] text-center text-sm leading-relaxed text-(--atlas-dim)">
              <span className={`${SMALL_CAPS} mr-2 tracking-[0.18em] text-(--atlas-gold) lowercase`}>Fig. 1</span>
              Your listeners and a guest&apos;s listeners, drawn as two constellations. The right guest is the bright
              star that belongs to both.
            </figcaption>
          </figure>
        </section>

        <section id="signs" aria-labelledby="signs-title" className={`${WRAP} flex scroll-mt-8 flex-col gap-10`}>
          <SectionHead id="signs-title" eyebrow="The signs on every chart" title="How Echo scores a guest">
            Echo puts your listeners and a guest&apos;s listeners on the same sky, then reads three things from where
            they meet. Every number comes from Qloo and describes audiences as groups.
          </SectionHead>
          <ol className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {PLATES.map((plate) => (
              <li
                key={plate.kind}
                className={`${css.frame} grid grid-cols-1 items-center sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`}
              >
                <div className="border-b border-(--atlas-line) p-3 sm:self-stretch sm:border-r sm:border-b-0 sm:p-4">
                  <div className="flex h-full items-center">
                    <Plate kind={plate.kind} />
                  </div>
                </div>
                <div className="flex flex-col gap-3 px-5 py-5 sm:px-6 sm:py-7">
                  <div className="flex items-center gap-3">
                    <span className={`${SMALL_CAPS} text-sm tracking-[0.2em] text-(--atlas-dim) lowercase`}>
                      Tab. {plate.numeral}
                    </span>
                    {plate.sign}
                  </div>
                  <h3
                    className={`${SERIF} text-[2rem] leading-none font-normal ${
                      plate.kind === "sweet" ? "text-(--atlas-ember)" : "text-(--atlas-parchment)"
                    }`}
                  >
                    {plate.name}
                  </h3>
                  <p className="text-[0.975rem] leading-relaxed text-(--atlas-mist)">{plate.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className={WRAP}>
          <ChartedShows />
        </div>
      </div>

      <footer className="relative">
        <Rule className={WRAP} />
        <div className={`${WRAP} grid grid-cols-1 gap-6 py-10 text-sm leading-relaxed md:grid-cols-[auto_1fr_1fr] md:gap-12`}>
          <div className="flex items-center gap-3">
            <Logo className="size-6 text-(--atlas-gold)" />
            <span className={`${SMALL_CAPS} text-xl font-semibold tracking-[0.18em] text-(--atlas-parchment)`}>Echo</span>
          </div>
          <p className="text-(--atlas-mist)">
            Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.
          </p>
          <p className="text-(--atlas-mist)">Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </footer>
    </div>
  );
}

function LineSign({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 44 12" className="h-3 w-11">
      <path d="M1,6 H40" stroke={color} strokeWidth="1.4" strokeDasharray={dashed ? "4 3" : undefined} />
      <path d="M35,2 L41,6 L35,10" fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function HatchSign() {
  return (
    <svg aria-hidden viewBox="0 0 44 12" className="h-3 w-11">
      <rect x="0.5" y="0.5" width="43" height="11" fill="none" stroke={GOLD} strokeOpacity="0.6" />
      {Array.from({ length: 9 }, (_, index) => (
        <line key={index} x1={index * 5 + 1} y1="11.5" x2={index * 5 + 6} y2="0.5" stroke={GOLD} strokeOpacity="0.8" />
      ))}
    </svg>
  );
}

function BrightSign() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5">
      <circle cx="10" cy="10" r="9" fill={EMBER} opacity="0.18" />
      <path d={starPath(10, 10, 8)} fill={EMBER} />
    </svg>
  );
}
