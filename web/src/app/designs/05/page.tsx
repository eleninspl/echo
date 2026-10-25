import {
  Bricolage_Grotesque,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";
import type { Label } from "@/lib/echo";
import { LABELS } from "@/lib/format";

import "./design.css";
import { styles } from "./styles";
import { MatchDiagram, ScoreGlyph, type ScoreKind } from "./drawings";
import { Finder } from "./finder";
import { FRAME, LIME, PAPER, PINK, SKY, YELLOW } from "./palette";
import { Stamp, Star, Sticker } from "./parts";
import { ShowsRun } from "./shows-run";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-d05-display",
  axes: ["opsz"],
});
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-d05-body" });
const mono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-d05-mono",
  weight: ["400", "700"],
});

const SCORES: {
  kind: ScoreKind;
  name: string;
  color: string;
  direction: string;
  text: string;
}[] = [
  {
    kind: "fit",
    name: "Fit",
    color: SKY,
    direction: "Show → guest",
    text: "Your listeners over-index on this guest, beyond what the guest's fame alone would predict.",
  },
  {
    kind: "love_back",
    name: "Love back",
    color: PINK,
    direction: "Guest → show",
    text: "The guest's fans over-index on your show, so the listeners they bring have a reason to stay.",
  },
  {
    kind: "reach",
    name: "Reach",
    color: LIME,
    direction: "New ears",
    text: "How new the guest's fans are to you: the podcasts they love are ones your listeners don't.",
  },
];

const OTHER_LABELS: Label[] = ["safe", "far", "long_shot", "balanced"];

export default function DesignFive() {
  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} ${styles.root} flex min-h-screen flex-col overflow-x-clip`}
    >
      <Header />
      <section
        aria-labelledby="d05-pitch"
        className="pt-10 pb-20 sm:pt-14 lg:pb-24"
      >
        <div className={FRAME}>
          <Finder lead={<Lead />} art={<HeroArt />} />
        </div>
      </section>
      <ScoreBand />
      <HowItScores />
      <ShowsRun />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b-3 border-(--nb-ink) bg-(--nb-paper)">
      <div className={`${FRAME} flex h-20 items-center justify-between gap-4`}>
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Echo, home"
        >
          <span className="grid size-11 place-items-center border-3 border-(--nb-ink) bg-(--nb-yellow) shadow-[3px_3px_0_0_var(--nb-ink)]">
            <Logo className="size-6" />
          </span>
          <span
            className={`${styles.display} text-[2rem] leading-none font-extrabold tracking-[-0.045em]`}
          >
            Echo
          </span>
        </Link>
        <nav aria-label="On this page" className="flex items-center gap-5">
          <a
            href="#how"
            className={`${styles.display} hidden text-lg font-bold underline decoration-3 underline-offset-[6px] hover:decoration-(--nb-pink) sm:inline`}
          >
            How Echo scores
          </a>
          <Sticker className="rotate-2 bg-white">Reads Qloo taste data</Sticker>
        </nav>
      </div>
    </header>
  );
}

function Lead() {
  return (
    <div className="flex flex-col gap-6">
      <Sticker className="-rotate-2 self-start bg-white">
        <Star className="size-3" />
        Guest finder for podcast hosts
      </Sticker>
      <h1
        id="d05-pitch"
        className={`${styles.display} text-[clamp(2.7rem,5.7vw,5.5rem)] leading-[0.93] font-extrabold tracking-[-0.04em] text-balance`}
      >
        Find the guest who carries your voice to{" "}
        <span className="relative mt-2 inline-block -rotate-2 border-3 border-(--nb-ink) bg-(--nb-lime) px-3 pb-1.5 shadow-[6px_6px_0_0_var(--nb-ink)]">
          new ears.
        </span>
      </h1>
      <p className="max-w-[44ch] text-lg leading-snug text-(--nb-soft) sm:text-xl">
        Name your show. Echo reads what your listeners love on Qloo, then ranks
        guests they&apos;ll love whose own fans will love your show back.
      </p>
    </div>
  );
}

function HeroArt() {
  return (
    <figure className="relative border-3 border-(--nb-ink) bg-white shadow-[10px_10px_0_0_var(--nb-ink)]">
      <figcaption
        className={`${styles.mono} flex items-center justify-between gap-3 border-b-3 border-(--nb-ink) bg-(--nb-ink) px-4 py-2 text-xs font-bold tracking-[0.08em] text-(--nb-paper) uppercase`}
      >
        <span>One guest, two audiences</span>
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-(--nb-sky)" />
          <span className="size-2.5 rounded-full bg-(--nb-pink)" />
          <span className="size-2.5 rounded-full bg-(--nb-lime)" />
        </span>
      </figcaption>
      <div className={`${styles.dots} bg-(--nb-paper) px-4 pt-6 pb-4 sm:px-7`}>
        <MatchDiagram />
      </div>
    </figure>
  );
}

function ScoreBand() {
  const words = [
    { text: "Fit", color: SKY },
    { text: "Love back", color: PINK },
    { text: "Reach", color: LIME },
    { text: "All three: sweet spot", color: YELLOW },
  ];
  return (
    <div aria-hidden className="border-y-3 border-(--nb-ink) bg-(--nb-ink)">
      <ul
        className={`${FRAME} ${styles.display} flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-5 text-[1.6rem] leading-none font-extrabold tracking-[-0.02em] uppercase sm:gap-x-9 sm:text-[2.4rem]`}
      >
        {words.map((word, index) => (
          <li key={word.text} className="flex items-center gap-6 sm:gap-9">
            {index > 0 && (
              <Star className="hidden size-7 sm:block" fill={PAPER} />
            )}
            <span style={{ color: word.color }}>{word.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowItScores() {
  return (
    <section
      id="how"
      aria-labelledby="d05-how"
      className="scroll-mt-4 py-20 sm:py-24"
    >
      <div className={FRAME}>
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <h2
            id="d05-how"
            className={`${styles.display} max-w-[13ch] text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[0.95] font-extrabold tracking-[-0.035em]`}
          >
            How Echo scores a guest
          </h2>
          <p className="max-w-[46ch] text-lg leading-snug">
            Two audiences: your show&apos;s and the guest&apos;s. Echo scores
            how much each likes the other, and how much of the guest&apos;s
            audience is new to you.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {SCORES.map((item, index) => (
            <li
              key={item.kind}
              className="flex flex-col border-3 border-(--nb-ink) bg-white shadow-[8px_8px_0_0_var(--nb-ink)]"
            >
              <div
                className={`relative border-b-3 border-(--nb-ink) bg-(--nb-paper) px-6 pt-12 pb-4 sm:pb-5 ${styles.dots}`}
              >
                <span
                  className={`${styles.mono} absolute top-3 left-3 grid size-9 place-items-center border-3 border-(--nb-ink) bg-(--nb-ink) font-bold text-(--nb-paper)`}
                >
                  {index + 1}
                </span>
                <Sticker className="absolute top-4 right-3 bg-white">
                  {item.direction}
                </Sticker>
                <ScoreGlyph
                  kind={item.kind}
                  className="mx-auto block w-full max-w-[12rem] sm:max-w-[15rem]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <h3>
                  <span
                    className={`${styles.display} inline-block -rotate-1 border-3 border-(--nb-ink) px-3 py-0.5 text-[2rem] leading-tight font-extrabold tracking-[-0.03em]`}
                    style={{ background: item.color }}
                  >
                    {item.name}
                  </span>
                </h3>
                <p className="text-[1.05rem] leading-snug">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid items-center gap-6 border-3 border-(--nb-ink) bg-(--nb-yellow) p-6 shadow-[10px_10px_0_0_var(--nb-ink)] sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10 sm:p-10">
          <Stamp
            lines={["SWEET", "SPOT"]}
            sizes={[22, 22]}
            fill="#ffffff"
            className="w-32 -rotate-12 sm:w-44"
          />
          <div className="flex flex-col gap-3">
            <h3
              className={`${styles.display} text-[clamp(1.9rem,3.4vw,3rem)] leading-[0.98] font-extrabold tracking-[-0.03em]`}
            >
              The sweet spot is high on all three.
            </h3>
            <p className="max-w-[58ch] text-lg leading-snug">
              Reach and love back pull against each other, so the sweet spot is
              rare: 1 to 4 guests in 20. Echo tells you how many it found, and
              says so when no guest clears all three.
            </p>
          </div>
        </div>

        <div className="mt-14">
          <h3
            className={`${styles.mono} mb-5 text-sm font-bold tracking-[0.08em] uppercase`}
          >
            Every other guest gets a label too
          </h3>
          <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {OTHER_LABELS.map((label) => (
              <li
                key={label}
                className="flex flex-col gap-2 border-3 border-(--nb-ink) bg-white p-4 shadow-[5px_5px_0_0_var(--nb-ink)] sm:gap-3 sm:p-5"
              >
                <span
                  className={`${styles.display} text-xl leading-none font-extrabold tracking-[-0.02em] sm:text-2xl`}
                >
                  {LABELS[label].name}
                </span>
                <p className="text-[0.95rem] leading-snug text-(--nb-soft) sm:text-base">
                  {LABELS[label].means}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 flex max-w-3xl items-start gap-3 text-lg leading-snug">
            <span
              aria-hidden
              className={`${styles.mono} mt-0.5 shrink-0 border-2 border-(--nb-ink) bg-(--nb-pink) px-1.5 text-sm font-bold`}
            >
              NB
            </span>
            Qloo follows who listens, not what a show is about. A good guest can
            come from well outside your topic, and that is the point.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className={`${styles.onInk} mt-auto border-t-3 border-(--nb-ink) bg-(--nb-ink) text-(--nb-paper)`}
    >
      <div
        className={`${FRAME} grid grid-cols-1 gap-8 py-12 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] md:gap-12`}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center border-3 border-(--nb-paper) bg-(--nb-yellow) text-(--nb-ink)">
            <Logo className="size-6" />
          </span>
          <span
            className={`${styles.display} text-[2rem] leading-none font-extrabold tracking-[-0.045em]`}
          >
            Echo
          </span>
        </div>
        <p className="border-l-3 border-(--nb-sky) pl-4 text-lg leading-snug">
          Echo reads Qloo&apos;s taste data. Results describe audiences as
          groups, never one listener.
        </p>
        <p className="border-l-3 border-(--nb-pink) pl-4 text-lg leading-snug">
          Echo sends nothing. Invitations are yours to send.
        </p>
      </div>
      <div className="border-t-2 border-(--nb-paper)/25">
        <p
          className={`${FRAME} ${styles.mono} py-4 text-xs tracking-[0.06em] text-(--nb-paper)/75 uppercase`}
        >
          An entry to the Qloo Agentic Hackathon 2026
        </p>
      </div>
    </footer>
  );
}
