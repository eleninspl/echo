"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const KEY = "echo-theme";

// Runs in <head> before the first paint: the theme the visitor chose, or else the system's.
export const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("${KEY}")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t)})()`;

function subscribe(change: () => void) {
  const observer = new MutationObserver(change);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const current = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

// Switches between the light and dark themes and remembers the choice in this browser.
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, current, () => null);
  const next: Theme = theme === "light" ? "dark" : "light";

  function toggle() {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to the ${next} theme` : "Switch theme"}
      title={theme ? `Switch to the ${next} theme` : undefined}
      className="flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-deck-hi hover:text-ink"
    >
      {/* Both icons render on the server; the theme on <html> shows the right one before React runs. */}
      <svg aria-hidden viewBox="0 0 20 20" className="size-[1.125rem] dark:hidden">
        <path
          d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5a6.8 6.8 0 1 0 8.7 8.7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <svg aria-hidden viewBox="0 0 20 20" className="hidden size-[1.125rem] dark:block">
        <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
