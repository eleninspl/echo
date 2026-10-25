import {
  Instrument_Sans,
  Instrument_Serif,
  Newsreader,
} from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import { CoverStories } from "./covers";
import "./design.css";
import { styles } from "./styles";
import { AudienceFigure } from "./figure";
import { ShowSearch } from "./search";

const display = Instrument_Serif({
  variable: "--font-d01-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const text = Newsreader({
  variable: "--font-d01-text",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const sans = Instrument_Sans({
  variable: "--font-d01-sans",
  subsets: ["latin"],
});

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";

const SCORES = [
  {
    n: 1,
    name: "Fit",
    direction: "From your show to the guest",
    body: "Your listeners over-index on the guest, beyond what the guest's fame alone would predict.",
  },
  {
    n: 2,
    name: "Love back",
    direction: "From the guest to your show",
    body: "The guest's fans over-index on your show. They are likely to enjoy it, so they have a reason to stay.",
  },
  {
    n: 3,
    name: "Reach",
    direction: "The audience you don't have yet",
    body: "The guest's fans are new to your show. The less your listeners share their favourite podcasts, the higher it goes.",
  },
];

export default function EditorialHome() {
  return (
    <div
      className={`${styles.issue} ${display.variable} ${text.variable} ${sans.variable} min-h-screen`}
    >
      <Masthead />

      <main className={FRAME}>
        <Opener />
        <Method />
        <CoverStories />
      </main>

      <Colophon />
    </div>
  );
}

function Masthead() {
  return (
    <header className={`${FRAME} pt-4`}>
      <div
        className={`${styles.folio} flex items-center justify-between gap-6 pb-3 text-(--ink-dim)`}
      >
        <span>A guest finder for podcast hosts</span>
        <span className="hidden sm:inline">Taste data from Qloo</span>
      </div>
      <div className="flex items-end justify-between gap-6 border-t border-(--ink) pt-3 pb-3">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Echo, home"
        >
          <Logo className="size-9 text-(--red) sm:size-10" />
          <span
            className={`${styles.display} text-[2.75rem] leading-[0.8] tracking-[-0.01em] sm:text-[3.25rem]`}
          >
            Echo
          </span>
        </Link>
        <nav
          aria-label="On this page"
          className={`${styles.folio} hidden items-center gap-8 pb-1 text-(--ink-soft) md:flex`}
        >
          <a href="#find" className="hover:text-(--red)">
            Find your show
          </a>
          <a href="#method" className="hover:text-(--red)">
            How Echo scores
          </a>
          <a href="#covers" className="hover:text-(--red)">
            Cover stories
          </a>
        </nav>
      </div>
      <div className={styles.doubleRule} />
    </header>
  );
}

function Opener() {
  return (
    <section
      id="find"
      aria-labelledby="d01-headline"
      className="pt-10 sm:pt-14"
    >
      <div className="grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-10">
        <div className="md:col-span-8">
          <p
            className={`${styles.kicker} flex items-center gap-4 text-(--red)`}
          >
            <span>Feature</span>
            <span aria-hidden className="h-px w-10 bg-(--red)" />
            <span className="text-(--ink-dim)">Booking guests</span>
          </p>
          <h1
            id="d01-headline"
            className={`${styles.display} mt-5 text-[clamp(3.25rem,9.4vw,9rem)] leading-[0.88] tracking-[-0.018em]`}
          >
            <span className="block">Find the guest</span>
            <span className="block">who carries your</span>
            <span className="block">
              voice to <em className="text-(--red)">new ears.</em>
            </span>
          </h1>
        </div>
        <div className="flex flex-col gap-5 md:col-span-4 md:self-end md:border-l md:border-(--rule) md:pb-2 md:pl-8">
          <p className="text-[1.5rem] leading-[1.3] text-(--ink-soft) italic lg:text-[1.625rem]">
            Echo reads what your listeners love on Qloo, then finds the guests
            they&apos;ll love, whose own fans will love your show back.
          </p>
          <p className={`${styles.folio} text-(--ink-dim)`}>
            Words by Echo <span aria-hidden>·</span> Taste data by Qloo
          </p>
        </div>
      </div>
      <div className="mt-10 sm:mt-14">
        <ShowSearch />
      </div>
    </section>
  );
}

function Method() {
  return (
    <section
      id="method"
      aria-labelledby="d01-method"
      className="mt-24 sm:mt-32"
    >
      <div className={styles.doubleRule} />
      <div className="grid grid-cols-1 gap-x-14 gap-y-4 pt-6 md:grid-cols-12">
        <p className={`${styles.kicker} text-(--red) md:col-span-12`}>
          The method
        </p>
        <h2
          id="d01-method"
          className={`${styles.display} text-[3.25rem] leading-[0.95] text-balance sm:text-[4.5rem] md:col-span-8`}
        >
          How Echo scores a guest
        </h2>
        <p className="self-end text-xl leading-snug text-(--ink-soft) italic md:col-span-4 md:pb-2">
          Two audiences, and three questions about how they meet.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-x-14 gap-y-12 md:grid-cols-12">
        <div className="flex flex-col gap-5 text-[1.125rem] leading-[1.62] md:col-span-5 md:border-r md:border-(--rule) md:pr-14">
          <p className={styles.dropcap}>
            Podcasts grow through guests. A guest brings their own audience, and
            some of it stays. Most hosts book on gut feel, or on whoever is
            trending, so they keep inviting people whose fans already listen.
          </p>
          <p>
            Echo asks a harder question: who fits your show and also brings
            people who don&apos;t listen yet? Qloo&apos;s taste data follows
            what audiences love across music, film, TV, books and brands, so
            Echo can look at each guest from both sides.
          </p>
          <p>
            High fit with low reach is safe, but it adds nobody. High reach with
            low love back brings people who won&apos;t stay. Echo looks for the
            guests who hold all three.
          </p>
        </div>

        <figure className="flex flex-col gap-5 md:col-span-7">
          <AudienceFigure />
          <figcaption className="max-w-[60ch] border-t border-(--ink) pt-3 text-[0.9375rem] leading-snug text-(--ink-soft)">
            <span className={`${styles.kicker} mr-2 text-(--ink)`}>Fig. 1</span>
            Two audiences. Fit runs from your show to the guest, love back runs
            from the guest to your show, and reach is the part of the
            guest&apos;s audience you don&apos;t have yet.
          </figcaption>
        </figure>
      </div>

      <ol className="mt-16 grid grid-cols-1 border-t-[3px] border-(--ink) md:grid-cols-3">
        {SCORES.map((item) => (
          <li
            key={item.name}
            className="flex gap-5 border-b border-(--rule) py-7 md:border-b-0 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
          >
            <span
              aria-hidden
              className={`${styles.display} ${styles.numerals} text-[4.5rem] leading-[0.8] text-(--red)`}
            >
              {item.n}
            </span>
            <div className="flex flex-col gap-2">
              <h3 className={`${styles.display} text-[2rem] leading-none`}>
                {item.name}
              </h3>
              <p className={`${styles.folio} text-(--ink-dim)`}>
                {item.direction}
              </p>
              <p className="mt-1 text-[1.0625rem] leading-[1.55] text-(--ink-soft)">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <blockquote className="mx-auto mt-16 max-w-[1040px] border-y border-(--ink) py-10 text-center sm:mt-20 sm:py-14">
        <p
          aria-hidden
          className={`${styles.display} -mb-6 text-[6rem] leading-[0.6] text-(--red) sm:-mb-8 sm:text-[8rem]`}
        >
          &ldquo;
        </p>
        <p
          className={`${styles.display} text-[2.125rem] leading-[1.08] text-balance sm:text-[3.5rem]`}
        >
          The sweet spot is high on all three. It is rare, one to four guests in
          twenty, and Echo{" "}
          <em className="text-(--red)">tells you when it finds one.</em>
        </p>
        <footer className={`${styles.folio} mt-6 text-(--ink-dim)`}>
          On the sweet spot
        </footer>
      </blockquote>
    </section>
  );
}

function Colophon() {
  return (
    <footer className={`${FRAME} mt-24 pb-10 sm:mt-32`}>
      <div className={styles.doubleRule} />
      <div className="grid grid-cols-1 gap-x-14 gap-y-8 pt-8 md:grid-cols-12">
        <div className="flex flex-col gap-3 md:col-span-4">
          <span className="flex items-center gap-3">
            <Logo className="size-8 text-(--red)" />
            <span className={`${styles.display} text-[2.5rem] leading-none`}>
              Echo
            </span>
          </span>
          <p className="text-[1.0625rem] leading-snug text-(--ink-soft) italic">
            Find the guest who carries your voice to new ears.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-[1.0625rem] leading-relaxed md:col-span-5">
          <p>
            Echo reads Qloo&apos;s taste data. Results describe audiences as
            groups, never one listener.
          </p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
        <p
          className={`${styles.folio} leading-relaxed text-(--ink-dim) md:col-span-3 md:text-right`}
        >
          Set in Instrument Serif, Newsreader and Instrument Sans
        </p>
      </div>
    </footer>
  );
}
