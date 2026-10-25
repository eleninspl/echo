import { Bricolage_Grotesque, Figtree, Shantell_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

import "./design.css";
import { styles } from "./styles";
import { Heart, HeroScene, Highlight, ScoreDiagram, Sparkle, Squiggle, StepIcon, TONES, type Tone } from "./drawings";
import { ShowChat } from "./search";
import { ShowsEchoHasRun } from "./shows";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-echo-display", axes: ["opsz", "wdth"] });
const body = Figtree({ subsets: ["latin"], variable: "--font-echo-body" });
const hand = Shantell_Sans({ subsets: ["latin"], variable: "--font-echo-hand", axes: ["INFM", "BNCE"] });

const WRAP = "mx-auto w-full max-w-[1200px] px-4 sm:px-8";

export default function WarmIntroductions() {
  return (
    <div className={`${display.variable} ${body.variable} ${hand.variable} ${styles.page} flex min-h-screen flex-col`}>
      <Header />
      <Hero />
      <ShowsEchoHasRun />
      <Scoring />
      <Closer />
      <Footer />
    </div>
  );
}

function Wordmark({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`grid -rotate-6 place-items-center rounded-[14px] bg-(--ink) text-(--butter) ${size === "md" ? "size-10" : "size-8"}`}
      >
        <Logo className={size === "md" ? "size-6" : "size-5"} />
      </span>
      <span
        className={`${styles.display} leading-none font-extrabold tracking-[-0.04em] ${size === "md" ? "text-[1.85rem]" : "text-2xl"}`}
      >
        echo
      </span>
    </span>
  );
}

function Header() {
  return (
    <header className={`${WRAP} flex h-20 items-center justify-between gap-4`}>
      <a href="#top" aria-label="Echo, back to the top" className="rounded-2xl">
        <Wordmark />
      </a>
      <nav aria-label="On this page" className="flex items-center gap-1 sm:gap-2">
        <a
          href="#scores"
          className="hidden rounded-full px-4 py-2 font-semibold text-(--ink-soft) hover:bg-(--sand) hover:text-(--ink) sm:block"
        >
          How guests are scored
        </a>
        <a
          href="#find"
          className="rounded-full border-2 border-(--ink) bg-(--paper) px-4 py-2 font-bold shadow-[0_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
        >
          Find your show
        </a>
      </nav>
    </header>
  );
}

const STEPS: { kind: "find" | "meet" | "invite"; tone: Tone; title: string; text: string }[] = [
  { kind: "find", tone: "lilac", title: "Find your show", text: "Type its name, then pick it from the list." },
  { kind: "meet", tone: "peach", title: "Meet the guests", text: "Each one is scored on fit, love back and reach." },
  { kind: "invite", tone: "mint", title: "Send the invite", text: "You reach out yourself. Echo never contacts anyone." },
];

function Hero() {
  return (
    <section
      id="top"
      className={`${WRAP} grid items-start gap-x-14 gap-y-10 pt-6 pb-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] lg:pt-12`}
    >
      <div className="flex flex-col gap-7 lg:pt-10">
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-(--paper) py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-[inset_0_0_0_1.5px_var(--line)]">
          <span className="grid size-7 place-items-center rounded-full bg-(--rose-tint)">
            <Heart className="size-4" />
          </span>
          For podcast hosts and producers
        </p>
        <h1
          className={`${styles.display} text-[clamp(2.75rem,6vw,5.25rem)] leading-[0.96] font-extrabold tracking-[-0.03em] text-balance`}
        >
          Find the guest who carries your voice to <Highlight>new ears.</Highlight>
        </h1>
        <p className="max-w-[44ch] text-lg leading-relaxed text-(--ink-soft) sm:text-xl">
          Tell Echo your show. It reads what your listeners love on Qloo, then finds guests they&apos;ll love whose own
          fans will love your show back.
        </p>
      </div>

      <div id="find" className="relative scroll-mt-6">
        <Sparkle className="absolute -top-5 -left-4 z-10 size-10 rotate-12 sm:-left-7" />
        <Sparkle className="absolute top-40 -right-3 z-10 size-6" fill={TONES.mint.base} />
        <Squiggle className="absolute -bottom-7 -left-12 hidden w-28 -rotate-6 lg:block" color={TONES.lilac.deep} />
        <div className="relative overflow-hidden rounded-[36px] border border-(--line) bg-(--paper) shadow-[0_40px_80px_-48px_rgb(80_50_20/0.7),0_2px_0_var(--line)]">
          <div className={`${styles.dots} relative bg-(--lilac-tint) px-3 pt-5 pb-2 sm:px-6`}>
            <HeroScene className="relative mx-auto block w-full max-w-[29rem]" />
          </div>
          <div className="p-4 sm:p-6">
            <ShowChat />
          </div>
        </div>
      </div>

      <ol aria-label="How it goes" className="grid gap-3 sm:grid-cols-3 sm:gap-9 lg:col-span-2 lg:mt-2">
        {STEPS.map((step, index) => (
          <li
            key={step.kind}
            className="relative flex items-center gap-4 rounded-[26px] p-4 sm:p-5"
            style={{ background: TONES[step.tone].tint }}
          >
            <span className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-(--paper)/70">
              <StepIcon kind={step.kind} />
            </span>
            <span className="flex flex-col gap-1">
              <span className={`${styles.display} text-lg leading-tight font-bold`}>
                <span className={`${styles.hand} mr-1.5 text-base font-semibold`} style={{ color: TONES[step.tone].deep }}>
                  {index + 1}.
                </span>
                {step.title}
              </span>
              <span className="text-sm leading-snug text-pretty text-(--ink-soft)">{step.text}</span>
            </span>
            {index < STEPS.length - 1 && <StepArrow />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepArrow() {
  return (
    <svg
      viewBox="0 0 40 24"
      className="absolute top-1/2 -right-[2.05rem] z-10 hidden w-7 -translate-y-1/2 sm:block"
      fill="none"
      aria-hidden
    >
      <path d="M3 14 C12 4 24 4 34 12" stroke="#2b2522" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M27 6 L35 12.5 L26 16" stroke="#2b2522" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SCORES: { tone: Tone; name: string; way?: string; text: string; star?: boolean }[] = [
  {
    tone: "peach",
    name: "Fit",
    way: "your show to the guest",
    text: "Your listeners like this guest more than the guest's fame alone would predict.",
  },
  {
    tone: "rose",
    name: "Love back",
    way: "the guest to your show",
    text: "The guest's fans like your show too, so the match works both ways.",
  },
  {
    tone: "mint",
    name: "Reach",
    way: "the new ears",
    text: "The guest's fans are new to your show: people you don't reach yet.",
  },
  {
    tone: "butter",
    name: "Sweet spot",
    text: "High on all three. It's rare, about 1 to 4 guests in 20, and Echo tells you when it finds one.",
    star: true,
  },
];

function Scoring() {
  return (
    <section id="scores" aria-labelledby="scores-title" className={`${WRAP} scroll-mt-6 py-10 sm:py-14`}>
      <div className="relative overflow-hidden rounded-[40px] bg-(--sand) px-5 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14">
          <div className="flex flex-col gap-4">
            <p className={`${styles.hand} text-lg text-(--peach-deep)`}>a match has to work both ways</p>
            <h2
              id="scores-title"
              className={`${styles.display} text-[clamp(2rem,4vw,3rem)] leading-[1.02] font-extrabold tracking-[-0.02em]`}
            >
              How Echo scores a guest
            </h2>
            <p className="max-w-[48ch] text-lg leading-relaxed text-(--ink-soft)">
              Picture two crowds: your listeners and the guest&apos;s fans. Echo checks how much each one likes the
              other, and how many of the guest&apos;s fans you don&apos;t have yet.
            </p>
            <div className="mt-2 rounded-[32px] bg-(--paper) p-3 shadow-[0_24px_50px_-36px_rgb(80_50_20/0.6)] sm:p-5">
              <ScoreDiagram className="block h-auto w-full" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
              {SCORES.map((item) => (
                <ScoreCard key={item.name} {...item} />
              ))}
            </ul>
            <p className="mt-2 rounded-[22px] border-2 border-dashed border-(--line) px-5 py-4 text-[0.95rem] leading-relaxed text-(--ink-soft)">
              High fit with low reach is safe, but adds nobody. High reach with low love back brings people who
              won&apos;t stay. Echo shows you which is which.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ tone, name, way, text, star }: { tone: Tone; name: string; way?: string; text: string; star?: boolean }) {
  const colors = TONES[tone];
  return (
    <li className="flex gap-4 rounded-[24px] bg-(--paper) p-4 sm:p-5">
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-2xl shadow-[inset_0_0_0_2px_var(--ink)]"
        style={{ background: colors.base }}
      >
        {star ? <Sparkle className="size-7" fill={colors.tint} /> : <ScoreGlyph tone={tone} />}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span className={`${styles.display} text-xl leading-tight font-extrabold`}>{name}</span>
          {way && (
            <span className={`${styles.hand} text-[0.95rem]`} style={{ color: colors.deep }}>
              {way}
            </span>
          )}
        </span>
        <span className="leading-snug text-(--ink-soft)">{text}</span>
      </span>
    </li>
  );
}

function ScoreGlyph({ tone }: { tone: Tone }) {
  const path =
    tone === "peach"
      ? "M7 20 C10 9 22 9 26 18 M22 14 L26 18 L21 21"
      : tone === "rose"
        ? "M26 12 C23 23 11 23 7 14 M11 18 L7 14 L12 11"
        : "M8 16 H24 M19 11 L24 16 L19 21";
  return (
    <svg viewBox="0 0 32 32" className="size-7" fill="none" aria-hidden>
      {tone === "mint" && <circle cx={10} cy={16} r={3.5} fill="#2b2522" />}
      <path d={path} stroke="#2b2522" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Closer() {
  return (
    <section aria-labelledby="closer-title" className={`${WRAP} pb-14`}>
      <div className="relative overflow-hidden rounded-[40px] bg-(--ink) px-6 py-12 text-(--cream) sm:px-12 sm:py-14">
        <span aria-hidden className={`${styles.dotsCream} pointer-events-none absolute inset-0`} />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <p className={`${styles.hand} text-lg text-(--butter)`}>so, who&apos;s next?</p>
            <h2
              id="closer-title"
              className={`${styles.display} max-w-[18ch] text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.025em]`}
            >
              Your next guest is already out there.
            </h2>
            <p className="max-w-[46ch] text-lg text-[#e9dfd2]">
              Start with your show&apos;s name. Echo does the looking, and you decide who to invite.
            </p>
          </div>
          <div className="relative grid shrink-0 md:h-[13.75rem] md:w-[19rem] md:place-items-center">
            <BubbleOutline className="pointer-events-none absolute inset-0 hidden size-full opacity-70 md:block" />
            <a
              href="#find"
              className={`${styles.onInk} relative inline-flex min-h-13 items-center gap-2 rounded-full border-2 border-(--ink) bg-(--butter) px-7 text-lg font-bold text-(--ink) shadow-[0_4px_0_var(--peach)] transition-transform hover:-translate-y-0.5 md:-mt-7 md:-ml-9`}
            >
              Find your show
              <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                <path d="M10 15 V4 M5 9 L10 4 L15 9" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function BubbleOutline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 220" className={className} aria-hidden fill="none">
      <path
        d="M50 20 H210 Q250 20 250 60 V130 Q250 170 210 170 H120 L76 210 L86 170 H50 Q10 170 10 130 V60 Q10 20 50 20 Z"
        stroke={TONES.butter.base}
        strokeWidth={3}
        strokeLinejoin="round"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <path d="M262 40 A40 40 0 0 1 290 80" stroke={TONES.butter.base} strokeWidth={5} strokeLinecap="round" />
      <path d="M262 10 A70 70 0 0 1 298 60" stroke={TONES.butter.base} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
    </svg>
  );
}

function FooterNote({ children }: { children: ReactNode }) {
  return <p className="leading-snug">{children}</p>;
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-(--line) bg-(--sand)">
      <div className={`${WRAP} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
        <Wordmark size="sm" />
        <div className="flex max-w-[62ch] flex-col gap-1.5 text-[0.95rem] text-(--ink-soft) sm:text-right">
          <FooterNote>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</FooterNote>
          <FooterNote>Echo sends nothing. Invitations are yours to send.</FooterNote>
        </div>
      </div>
    </footer>
  );
}
