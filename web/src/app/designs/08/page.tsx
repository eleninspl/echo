import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties } from "react";

import { Logo } from "@/components/logo";

import { ScoreBento } from "./bento";
import "./design.css";
import { styles } from "./styles";
import { ArrowRight, Eyebrow } from "./parts";
import { AppPreview } from "./preview";
import { RunsProvider } from "./runs";
import { ShowSearch } from "./search";
import { ShowsNavLink, ShowsRun } from "./shows";

const sans = Geist({ subsets: ["latin"], variable: "--font-d08-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-d08-mono" });

const FRAME = "mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8";

export default function LaunchPage() {
  return (
    <div className={`${sans.variable} ${mono.variable} ${styles.root} flex min-h-screen flex-col overflow-x-clip`}>
      <RunsProvider>
        <Header />
        <Hero />
        <HowItScores />
        <ShowsRun />
        <Closing />
        <Footer />
      </RunsProvider>
    </div>
  );
}

function Mark({ size = "size-8" }: { size?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[10px] text-white shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_4px_10px_-4px_rgb(91_61_245/0.6)] ${size} ${styles.sweetFill}`}
    >
      <Logo className="size-[62%]" />
    </span>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-(--line) bg-white/80 backdrop-blur-md">
      <div className={`${FRAME} flex h-16 items-center justify-between gap-4`}>
        <a href="#top" className="flex items-center gap-2.5 rounded-lg">
          <Mark />
          <span className="text-[19px] font-semibold tracking-[-0.035em] text-(--ink)">Echo</span>
          <span className="hidden border-l border-(--line-strong) pl-2.5 text-[13px] text-(--ink-3) md:inline">
            Guest finder for podcasts
          </span>
        </a>
        <nav aria-label="On this page" className="flex items-center gap-1 sm:gap-3">
          <a
            href="#how"
            className="hidden rounded-md px-2 py-1 text-[14px] text-(--ink-2) transition-colors hover:text-(--ink) sm:inline"
          >
            How it scores
          </a>
          <span className="hidden sm:inline">
            <ShowsNavLink />
          </span>
          <a
            href="#search"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-(--ink) px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-(--accent)"
          >
            Find your show
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" aria-labelledby="d08-title" className="relative isolate scroll-mt-20">
      <div aria-hidden className={`absolute inset-x-0 top-0 -z-10 h-[860px] ${styles.heroGrid}`} />
      <div
        className={`${FRAME} grid grid-cols-1 items-start gap-14 pt-12 pb-24 sm:pt-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14 lg:pt-12 lg:pb-40`}
      >
        <div className="flex flex-col gap-7 lg:pt-4">
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-(--line) bg-white py-1 pr-3 pl-1 text-[12.5px] text-(--ink-2) shadow-(--shadow-sm)">
            <span className="rounded-full bg-(--accent-soft) px-2 py-0.5 text-[11.5px] font-medium text-(--accent-deep)">
              Entry
            </span>
            Qloo Agentic Hackathon 2026
          </p>
          <h1
            id="d08-title"
            className="text-[clamp(2.6rem,5.2vw,4.4rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance text-(--ink)"
          >
            Find the guest who carries your voice to <span className={styles.gradientText}>new ears.</span>
          </h1>
          <p className="max-w-[46ch] text-[17px] leading-relaxed text-(--ink-2)">
            Echo reads what your listeners love on Qloo, then ranks guests three ways: your audience will love them,
            their fans will love your show back, and those fans are new to you.
          </p>
          <ShowSearch />
        </div>
        <AppPreview />
      </div>
    </section>
  );
}

function HowItScores() {
  return (
    <section id="how" aria-labelledby="d08-how" className="scroll-mt-16 border-t border-(--line) bg-(--bg-soft)">
      <div className={`${FRAME} flex flex-col gap-12 py-20 lg:py-28`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <Eyebrow>How Echo scores a guest</Eyebrow>
            <h2
              id="d08-how"
              className="text-[clamp(1.9rem,3.4vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-(--ink)"
            >
              Three scores for every guest. A sweet spot for the few.
            </h2>
          </div>
          <p className="max-w-[44ch] text-[15px] leading-relaxed text-(--ink-3)">
            Most booking asks one question: will my listeners like this guest? Echo asks two more. Will the
            guest&apos;s fans like the show, and are they new to it?
          </p>
        </div>
        <ScoreBento />
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section aria-labelledby="d08-closing" className={`${FRAME} pt-6 pb-20 lg:pb-24`}>
      <div className="relative isolate overflow-hidden rounded-[28px] border border-(--line) bg-white px-6 py-16 text-center shadow-(--shadow-md) sm:px-12 lg:py-20">
        <div aria-hidden className={`absolute inset-0 -z-10 ${styles.softAurora}`} />
        <svg
          aria-hidden
          viewBox="0 0 400 400"
          className="absolute top-1/2 left-1/2 -z-10 size-[44rem] -translate-x-1/2 -translate-y-1/2"
          fill="none"
        >
          {[0, 1, 2].map((ring) => (
            <circle
              key={ring}
              cx="200"
              cy="200"
              r="120"
              stroke="var(--accent)"
              strokeOpacity="0.35"
              strokeWidth="0.8"
              className={styles.ripple}
              style={{ "--i": ring } as CSSProperties}
            />
          ))}
        </svg>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
          <Mark size="size-12" />
          <h2
            id="d08-closing"
            className="text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-(--ink)"
          >
            Who should be on your show next?
          </h2>
          <p className="text-[16px] leading-relaxed text-(--ink-2)">
            Type your show&apos;s name, pick it from the list, and Echo ranks the guests your listeners will love who
            bring listeners of their own.
          </p>
          <a
            href="#search"
            className="mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-(--accent) px-5 text-[15px] font-medium text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_8px_20px_-8px_rgb(91_61_245/0.8)] transition-colors hover:bg-(--accent-deep)"
          >
            Find your show
            <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--line) bg-white">
      <div className={`${FRAME} flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between`}>
        <div className="flex items-center gap-3">
          <Mark size="size-7" />
          <span className="text-[16px] font-semibold tracking-[-0.03em] text-(--ink)">Echo</span>
          <span className="text-[13px] text-(--ink-3)">Built for the Qloo Agentic Hackathon 2026</span>
        </div>
        <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-(--ink-3) md:text-right">
          <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
    </footer>
  );
}
