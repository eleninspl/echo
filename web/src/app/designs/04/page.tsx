import type { Metadata } from "next";
import { Bricolage_Grotesque, Courier_Prime } from "next/font/google";
import Link from "next/link";

import "./design.css";
import { FeaturedShows } from "./featured";
import { INK_VARS, InkDefs, Overprint, OverprintMark } from "./ink";
import { Plates } from "./plates";
import { ShowSearch } from "./search";
import { styles } from "./styles";
import { Venn } from "./venn";

const bricolage = Bricolage_Grotesque({
  variable: "--d04-display",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

const courier = Courier_Prime({
  variable: "--d04-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = { title: "Find a guest" };

const FRAME = "mx-auto w-full max-w-[1320px] px-4 sm:px-8";

export default function RisographHome() {
  return (
    <div className={`${bricolage.variable} ${courier.variable} ${styles.page} flex min-h-screen flex-col`} style={INK_VARS}>
      <InkDefs />

      <header className={`${FRAME} pt-5`}>
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <OverprintMark className="size-9 sm:size-10" />
            <Overprint className={`${styles.display} text-[2.3rem] leading-none uppercase sm:text-[2.6rem]`}>
              Echo
            </Overprint>
          </Link>
          <p className={`${styles.mono} hidden text-right text-sm font-bold text-(--blue) uppercase md:block`}>
            A guest finder for podcasts
            <span aria-hidden className="mx-3 text-(--pink)">●</span>
            Reads Qloo taste data
          </p>
          <p className={`${styles.mono} text-right text-xs font-bold text-(--blue) uppercase md:hidden`}>
            Guest finder
          </p>
        </div>
        <div aria-hidden className={`${styles.rule} mt-4`} />
      </header>

      <section aria-labelledby="d04-pitch" className={`${FRAME} grid grid-cols-1 gap-x-12 gap-y-12 pt-10 pb-20 lg:grid-cols-12 lg:pt-14 lg:pb-28`}>
        <div className="flex min-w-0 flex-col gap-7 lg:col-span-7">
          <p className={`${styles.mono} text-[0.95rem] font-bold tracking-wide text-(--blue) uppercase`}>
            Guests picked by what your audience loves
          </p>
          <h1
            id="d04-pitch"
            className={`${styles.display} ${styles.textured} text-[clamp(3rem,6.6vw,6.5rem)] leading-[0.86] text-(--blue) uppercase`}
          >
            Find the guest who carries your voice to <Overprint className={styles.newEars}>new ears.</Overprint>
          </h1>
          <p className="max-w-[44ch] text-[1.2rem] leading-snug text-(--blue) sm:text-[1.3rem]">
            Echo reads what your listeners love across music, film, books and brands on Qloo. Then it finds guests
            they&apos;ll love, whose own fans will love your show back.
          </p>
          <ShowSearch />
        </div>
        <div className="min-w-0 self-start lg:sticky lg:top-8 lg:col-span-5 lg:pt-6">
          <Venn />
        </div>
      </section>

      <section aria-labelledby="d04-how" className={styles.tintBand}>
        <div className={`${FRAME} flex flex-col gap-14 py-20 lg:py-24`}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
            <div className="flex flex-col gap-2 lg:col-span-7">
              <span className={`${styles.mono} text-sm font-bold tracking-wide text-(--blue) uppercase`}>
                Three scores, two audiences
              </span>
              <h2 id="d04-how" className="text-[clamp(2.6rem,6vw,4.75rem)] leading-[0.86] uppercase">
                <Overprint className={styles.display}>How Echo scores a guest</Overprint>
              </h2>
            </div>
            <p className="max-w-[48ch] text-[1.08rem] leading-snug text-(--blue) lg:col-span-5">
              Picture two audiences printed on top of each other: pink for your show&apos;s listeners, blue for a
              guest&apos;s fans. Echo reads Qloo&apos;s taste data in both directions and scores every guest three
              ways.
            </p>
          </div>
          <Plates />
        </div>
      </section>

      <div className={`${FRAME} py-20 lg:py-24`}>
        <FeaturedShows />
      </div>

      <footer className={`${FRAME} mt-auto pb-10`}>
        <div aria-hidden className={styles.rule} />
        <div className="grid grid-cols-1 items-start gap-8 pt-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-12">
          <div className="flex items-center gap-3">
            <OverprintMark className="size-8" />
            <Overprint className={`${styles.display} text-[1.9rem] leading-none uppercase`}>Echo</Overprint>
          </div>
          <div className="flex max-w-[60ch] flex-col gap-1.5 text-[1rem] leading-snug text-(--blue)">
            <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
            <p>Echo sends nothing. Invitations are yours to send.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`${styles.mono} text-xs font-bold text-(--blue) uppercase`}>Printed in two inks</span>
            <ul className="flex gap-4">
              <Swatch className="bg-(--pink)" name="Pink" />
              <Swatch className="bg-(--blue)" name="Blue" />
              <Swatch className="bg-(--overprint)" name="Both" />
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Swatch({ className, name }: { className: string; name: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={`${styles.swatch} ${className}`} />
      <span className={`${styles.mono} text-xs font-bold text-(--blue) uppercase`}>{name}</span>
    </li>
  );
}
