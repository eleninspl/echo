import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Michroma } from "next/font/google";
import Link from "next/link";

import { EngineNote } from "@/components/engine-note";
import { FRAME, hue } from "@/components/gallery";
import { Logo } from "@/components/logo";
import "./globals.css";

const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400" });

const DESCRIPTION =
  "Echo finds podcast guests your audience will love, who bring a new audience that will love your show back.";

export const metadata: Metadata = {
  title: { default: "Echo", template: "%s · Echo" },
  description: DESCRIPTION,
  openGraph: { title: "Echo", description: DESCRIPTION, siteName: "Echo", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0f1011" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${michroma.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="key key-lit sr-only z-20 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          style={hue("var(--amber)")}
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-10 border-b border-line bg-desk/95 backdrop-blur-sm">
          <div className={`${FRAME} flex h-12 items-center justify-between gap-4`}>
            <Link href="/" className="flex items-center gap-2.5 rounded-sm">
              <Logo className="size-6 text-fit" />
              <span className="silk text-sm tracking-[0.2em] text-ink">Echo</span>
              <span className="silk hidden text-ink-dim sm:inline">Guest gallery</span>
            </Link>
            <EngineNote />
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <footer className="border-t border-line">
          <div
            className={`${FRAME} flex flex-col gap-1 py-6 text-sm text-ink-soft sm:flex-row sm:justify-between sm:gap-6`}
          >
            <p>Echo reads Qloo&apos;s taste data. Results describe audiences as groups, never one listener.</p>
            <p>Echo sends nothing. Invitations are yours to send.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
