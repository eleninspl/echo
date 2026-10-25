import { Courier_Prime, Newsreader } from "next/font/google";

import { Logo } from "@/components/logo";

import "./design.css";
import { HowItScores } from "./how-it-scores";
import { Kicker } from "./kicker";
import { LookUp } from "./look-up";
import { OnFile } from "./on-file";
import { InkFilter } from "./stamp";
import { styles } from "./styles";
import { FRAME, PALETTE, RED } from "./tokens";

const typewriter = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-d06-type",
});

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-d06-serif",
});

export default function BookingDeskHome() {
  return (
    <div
      className={`${typewriter.variable} ${serif.variable} ${styles.root} flex min-h-screen flex-col`}
      style={PALETTE}
    >
      <InkFilter />
      <header className={`${FRAME} flex h-20 items-center justify-between gap-6 sm:h-24`}>
        <div className="flex items-center gap-3">
          <Logo className="size-8 text-(--d-red)" />
          <span className={`${styles.serif} text-[1.9rem] leading-none font-semibold tracking-[-0.02em]`}>Echo</span>
          <span
            className={`${styles.typed} ml-1 hidden border-l border-(--d-ink)/25 pl-4 text-[0.78rem] font-bold tracking-[0.1em] text-(--d-ink-soft) uppercase sm:inline`}
          >
            Guest bookings
          </span>
        </div>
        <nav aria-label="On this page" className={`${styles.typed} flex items-center gap-6 text-[0.85rem] font-bold`}>
          <a href="#look-up" className="hidden tracking-[0.05em] underline-offset-[6px] hover:underline md:inline">
            Look up a show
          </a>
          <a href="#scoring" className="tracking-[0.05em] underline-offset-[6px] hover:underline">
            How it scores
          </a>
        </nav>
      </header>

      <main className="flex-1 border-t border-(--d-ink)/10">
        <LookUp intro={<Intro />} />
        <HowItScores />
        <OnFile />
      </main>

      <footer className="mt-24 sm:mt-32">
        <div className={`${styles.tray} h-3`} aria-hidden />
        <div className={`${FRAME} flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between`}>
          <div className="flex items-center gap-3">
            <Logo className="size-6 text-(--d-red)" />
            <span className={`${styles.serif} text-[1.35rem] leading-none font-semibold`}>Echo</span>
          </div>
          <div className={`${styles.typed} flex flex-col gap-1.5 text-[0.85rem] leading-relaxed text-(--d-ink-soft) sm:text-right`}>
            <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
            <p>Echo sends nothing. Invitations are yours to send.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Intro() {
  return (
    <div className="flex flex-col">
      <Kicker>For podcast hosts and producers</Kicker>
      <h1
        className={`${styles.serif} mt-6 text-[clamp(2.75rem,6.2vw,5.1rem)] leading-[0.98] font-medium tracking-[-0.025em] text-balance`}
      >
        Find the guest who carries your voice to{" "}
        <span className="relative inline-block italic">
          new ears.
          <svg
            aria-hidden
            viewBox="0 0 300 20"
            preserveAspectRatio="none"
            className="absolute -bottom-[0.1em] left-[-2%] h-[0.22em] w-[104%] overflow-visible"
            fill="none"
          >
            <path
              d="M3 13 C 70 5, 170 3, 297 8"
              pathLength={1}
              stroke={RED}
              strokeWidth="4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={styles.draw}
            />
            <path
              d="M24 18 C 110 11, 200 11, 286 14"
              pathLength={1}
              stroke={RED}
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity="0.7"
              className={styles.draw}
            />
          </svg>
        </span>
      </h1>
      <p className="mt-7 max-w-[50ch] text-[1.2rem] leading-relaxed text-(--d-ink-soft)">
        Echo reads what your listeners love on Qloo, across music, film, books and brands. Then it finds guests
        they&apos;ll love, whose own fans will love your show back.
      </p>
      <p
        className={`${styles.typed} mt-6 max-w-[52ch] border-l-2 border-(--d-red) pl-4 text-[0.88rem] leading-relaxed text-(--d-ink-soft)`}
      >
        Works best for comedy, music and sports shows: Qloo knows the people they invite.
      </p>
    </div>
  );
}
