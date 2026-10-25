import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Martian_Mono, Saira } from "next/font/google";
import Link from "next/link";

import { EngineNote } from "@/components/engine-note";
import { FRAME, hue } from "@/components/hud";
import { Logo } from "@/components/logo";
import { THEME_SCRIPT, ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const saira = Saira({ variable: "--font-saira", subsets: ["latin"] });
const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], axes: ["wdth"] });

const DESCRIPTION =
  "Echo finds podcast guests your audience will love, who bring a new audience that will love your show back.";

export const metadata: Metadata = {
  title: { default: "Echo", template: "%s · Echo" },
  description: DESCRIPTION,
  openGraph: { title: "Echo", description: DESCRIPTION, siteName: "Echo", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${saira.variable} ${chakra.variable} ${martian.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="btn btn-solid sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          style={hue("var(--ink)")}
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 bg-void/85 backdrop-blur-md">
          <div className={`${FRAME} flex h-14 items-center justify-between gap-4`}>
            <Link href="/" className="group flex items-center gap-3 rounded-full">
              <Logo className="size-7 text-ink" />
              <span className="font-display text-lg font-semibold tracking-[0.2em] text-ink">ECHO</span>
              <span className="tag hidden border-l border-steel-hi pl-3 text-ink-dim sm:inline">Guest finder</span>
            </Link>
            <div className="flex items-center gap-3">
              <EngineNote />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <footer className="mt-8 border-t border-steel">
          <div
            className={`${FRAME} flex flex-col gap-1 py-6 text-sm text-ink-dim sm:flex-row sm:justify-between sm:gap-6`}
          >
            <p>Results describe audiences as groups, never one listener.</p>
            <p>Echo sends nothing. Invitations are yours to send.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
