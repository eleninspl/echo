import { Archivo, Newsreader } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/logo";

import "./design.css";
import { RunSection } from "./run";
import { ShowSearch } from "./search";

const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-w3-sans",
});
const serif = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-w3-serif",
});

const FRAME = "mx-auto w-full max-w-[1280px] px-4 sm:px-8";

export default function DesignNineDaylightTool() {
  return (
    <div
      className={`${sans.variable} ${serif.variable} w3-root flex min-h-screen flex-col`}
    >
      <Masthead />
      <main className="flex-1">
        <section
          aria-labelledby="w3-pitch"
          className={`${FRAME} pt-10 pb-12 sm:pt-12 sm:pb-14`}
        >
          <h1
            id="w3-pitch"
            className="w3-serif max-w-[24ch] text-[2.125rem] leading-[1.08] font-normal tracking-[-0.015em] text-balance sm:text-[2.875rem] lg:max-w-none"
          >
            Find the guest who carries your voice to new ears.
          </h1>
          <p
            id="w3-what"
            className="mt-3 max-w-[62ch] text-[1.0625rem] leading-relaxed text-(--w3-soft) xl:max-w-none"
          >
            Echo reads Qloo&apos;s taste data to rank guests your listeners
            will love, whose own fans will love your show back.
          </p>
          <ShowSearch />
        </section>
        <RunSection />
      </main>
      <Footer />
    </div>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Logo className="size-7" />
      <span className="w3-wide text-[1.1875rem] leading-none font-bold tracking-[-0.01em]">
        Echo
      </span>
    </span>
  );
}

function Masthead() {
  return (
    <header className="border-b border-(--w3-rule)">
      <div className={`${FRAME} flex h-16 items-center justify-between gap-6`}>
        <Link href="/" aria-label="Echo, home" className="rounded-[3px]">
          <Wordmark />
        </Link>
        <nav
          aria-label="On this page"
          className="flex items-center gap-6 text-[0.9375rem] text-(--w3-soft)"
        >
          <a
            href="#runs"
            className="hidden underline-offset-4 hover:text-(--w3-ink) hover:underline sm:inline"
          >
            Shows Echo has run
          </a>
          <a
            href="#scores"
            className="underline-offset-4 hover:text-(--w3-ink) hover:underline"
          >
            How scores work
          </a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-(--w3-rule)">
      <div
        className={`${FRAME} flex flex-col gap-5 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10`}
      >
        <Wordmark />
        <div className="flex flex-col gap-1 text-[0.9375rem] text-(--w3-soft) sm:text-right">
          <p>
            Echo reads Qloo&apos;s taste data. Results describe audiences as
            groups, never one listener.
          </p>
          <p>Echo sends nothing. Invitations are yours to send.</p>
        </div>
      </div>
    </footer>
  );
}
