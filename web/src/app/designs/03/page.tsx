import { Doto, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";

import { s } from "./styles";
import { EngineLamp } from "./engine";
import { Finder } from "./finder";
import { MeterBridge } from "./meters";
import { Screws } from "./parts";
import { Presets } from "./presets";
import { Scoring } from "./scoring";

const sans = Instrument_Sans({ variable: "--f03-sans", subsets: ["latin"], axes: ["wdth"] });
const mono = JetBrains_Mono({ variable: "--f03-mono", subsets: ["latin"] });
const dot = Doto({ variable: "--f03-dot", subsets: ["latin"], axes: ["ROND"] });

const RULE = [
  { name: "Fit", zone: 50 },
  { name: "Love back", zone: 33 },
  { name: "Reach", zone: 33 },
];

const NAV = [
  { href: "#find", name: "Find" },
  { href: "#scoring", name: "Scoring" },
  { href: "#presets", name: "Shows run" },
];

export default function DesignThree() {
  return (
    <div className={`${sans.variable} ${mono.variable} ${dot.variable} ${s.root} min-h-screen`}>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-2 py-2 sm:gap-4 sm:px-5 sm:py-5">
        <Header />
        <main className="flex flex-col gap-2 sm:gap-4">
          <Hero />
          <section
            id="scoring"
            aria-labelledby="scoring-03-title"
            className={`${s.plate} relative scroll-mt-4 rounded-[24px] px-3 pt-10 pb-10 sm:px-10`}
          >
            <Screws />
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-3">
                <p className={`${s.label} text-[0.75rem] text-(--print-soft)`}>02 · Scoring</p>
                <h2
                  id="scoring-03-title"
                  className="text-[clamp(1.875rem,3.4vw,2.75rem)] leading-none font-semibold tracking-[-0.025em]"
                >
                  How Echo scores a guest
                </h2>
              </div>
              <p className="max-w-md text-[0.9375rem] text-(--print-soft)">
                Each score is a percentile among the guests Echo scores for your show. Turn the selector to light up
                one part.
              </p>
            </div>
            <Scoring />
          </section>
          <Presets />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className={`${s.plate} relative flex h-16 items-center justify-between gap-4 rounded-[18px] px-4 sm:px-6`}>
      <Link href="/" className="flex items-center gap-3 rounded-[6px]">
        <span className="flex size-9 items-center justify-center rounded-[9px] bg-(--print) text-(--orange)">
          <Logo className="size-6" />
        </span>
        <span className="text-[1.375rem] leading-none font-semibold tracking-[-0.02em]">Echo</span>
        <span aria-hidden className="hidden h-6 w-px bg-(--seam) sm:block" />
        <span className={`${s.label} hidden text-[0.6875rem] text-(--print-soft) sm:block`}>Guest finder</span>
      </Link>
      <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`${s.label} rounded-[7px] px-3 py-2 text-[0.75rem] text-(--print-soft) hover:bg-(--plate-hi) hover:text-(--print)`}
          >
            {item.name}
          </a>
        ))}
      </nav>
      <EngineLamp />
    </header>
  );
}

function Hero() {
  return (
    <section
      id="find"
      aria-labelledby="hero-03-title"
      className={`${s.plate} relative scroll-mt-4 rounded-[24px] px-3 pt-10 pb-8 sm:px-10 lg:pt-14 lg:pb-12`}
    >
      <Screws />
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-7 lg:col-span-7">
          <p className={`${s.label} flex items-center gap-2 text-[0.75rem] text-(--print-soft)`}>
            <span>01 · Find</span>
            <span aria-hidden className="text-(--seam)">/</span>
            <span>For podcast hosts and producers</span>
          </p>
          <h1
            id="hero-03-title"
            className="text-[clamp(2.625rem,6vw,5.375rem)] leading-[0.94] font-semibold tracking-[-0.04em] text-balance"
          >
            Find the guest who carries your voice to{" "}
            <span className={`${s.tape} rounded-[0.12em] px-[0.12em]`}>new ears.</span>
          </h1>
          <p className="max-w-[54ch] text-lg leading-relaxed text-(--print-soft) sm:text-xl">
            Type your show&apos;s name. Echo maps your audience&apos;s taste on Qloo and ranks guests your listeners
            over-index on, whose own fans are new to you and likely to enjoy the show.
          </p>
          <Finder />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5 lg:self-stretch">
          <MeterBridge />
          <div className="flex min-h-28 items-stretch gap-4 lg:max-h-60 lg:flex-1">
            <div aria-hidden className={`${s.grille} flex-1 rounded-[16px] border border-(--seam)`} />
            <div className="flex w-44 flex-col justify-between gap-3 rounded-[16px] border border-(--seam) p-3.5 sm:w-52">
              <span className="flex flex-col gap-2">
                <span className={`${s.label} text-[0.625rem] text-(--print-soft)`}>Sweet spot rule</span>
                <span className="text-sm leading-snug">All three needles in the orange zone.</span>
              </span>
              <span className={`${s.mono} flex flex-col gap-1 text-[0.6875rem]`}>
                {RULE.map((rule) => (
                  <span key={rule.name} className="flex items-center justify-between gap-2 border-t border-(--seam) pt-1">
                    <span>{rule.name}</span>
                    <span className="rounded-[3px] bg-(--orange) px-1 text-(--print)">{rule.zone}+</span>
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={`${s.plate} relative rounded-[18px] px-3 py-3 sm:px-5 sm:py-5`}>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[12px] border border-(--seam) bg-(--seam) md:grid-cols-[auto_1fr_1fr]">
        <div className="flex items-center gap-3 bg-(--plate) px-4 py-4">
          <Logo className="size-6" />
          <span className="text-lg leading-none font-semibold">Echo</span>
          <span className={`${s.label} text-[0.625rem] text-(--print-soft)`}>Guest finder</span>
        </div>
        <p className="flex items-center bg-(--plate) px-4 py-4 text-sm text-(--print-soft)">
          Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.
        </p>
        <p className="flex items-center bg-(--plate) px-4 py-4 text-sm text-(--print-soft)">
          Echo sends nothing. Invitations are yours to send.
        </p>
      </div>
      <p className={`${s.label} mt-3 px-1 text-[0.625rem] text-(--print-soft)`}>
        Made for the Qloo Agentic Hackathon 2026
      </p>
    </footer>
  );
}
