import type { Metadata } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import Link from "next/link";

import { EngineNote } from "@/components/engine-note";
import { Logo } from "@/components/logo";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
// Google has no metrics for an automatic fallback; a narrow system face keeps the shift small.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  fallback: ["Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: "Echo", template: "%s · Echo" },
  description: "Find the podcast guest who carries your voice to new ears.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${bigShoulders.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-10 bg-ink px-4 py-2 text-stock focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        {/* The shadow hides a hairline seam between the header and the field below it at fractional zoom. */}
        <header className="relative bg-field text-on-field shadow-[0_1px_0_var(--field)]">
          <div className="grid-lines mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 pt-5 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5 rounded-sm">
              <Logo className="size-9" />
              <span className="font-display text-3xl leading-none font-extrabold tracking-tight uppercase">Echo</span>
            </Link>
            <EngineNote />
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <footer className="border-t border-rule">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-6 text-sm text-ink-soft sm:px-8">
            <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
            <p>Echo sends nothing. Invitations are yours to send.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
