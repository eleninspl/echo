"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type { Show } from "@/lib/echo";

// The status bar's height: a section counts as current once its heading passes a little below it.
const BAR = 56;
const REDUCED = "(prefers-reduced-motion: reduce)";

export type Stop = { id: string; label: string };

const noop = () => () => {};

// Where you are on the long analysis page. Once the show's header scrolls away, the status bar names the show
// and lists the page's sections, the current one marked; on a phone, the current section opens the list.
// `stops` are heading ids in page order; `lock` is the id of the header that hides this while it's on screen.
export function PageNav({ show, stops, lock }: { show: Show; stops: Stop[]; lock: string }) {
  const target = useSyncExternalStore(
    noop,
    () => document.getElementById("bar-context"),
    () => null,
  );
  const [shown, setShown] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [picking, setOpen] = useState(false);
  const open = picking && shown;
  const menu = useRef<HTMLDivElement>(null);
  const ids = stops.map(({ id }) => id).join(" ");

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const header = document.getElementById(lock);
      const visible = header ? header.getBoundingClientRect().bottom < BAR : false;
      setShown(visible);
      if (!visible) setOpen(false);
      const line = BAR + window.innerHeight * 0.3;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let at: string | null = null;
      for (const id of ids.split(" ")) {
        const heading = document.getElementById(id);
        if (heading && (atEnd || heading.getBoundingClientRect().top <= line)) at = id;
      }
      setCurrent(at);
    };
    const later = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    later();
    window.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", later);
      window.removeEventListener("resize", later);
    };
  }, [ids, lock]);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!target) return null;

  const behavior = (): ScrollBehavior => (matchMedia(REDUCED).matches ? "auto" : "smooth");
  // Jumps to a section and moves focus there, so the keyboard carries on from where the eye went.
  const go = (id: string) => {
    setOpen(false);
    const heading = document.getElementById(id);
    if (!heading) return;
    heading.scrollIntoView({ behavior: behavior(), block: "start" });
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  };
  const here = stops.find(({ id }) => id === current);

  return createPortal(
    <nav
      aria-label="On this page"
      inert={!shown}
      data-on={shown || undefined}
      className={`flex min-w-0 flex-1 items-center gap-3 transition-[opacity,translate] duration-300 ease-(--ease-out) motion-reduce:transition-none lg:gap-6 ${
        shown ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: behavior() })}
        title="Back to the top"
        className="flex min-w-0 shrink items-center gap-2.5 rounded-lg text-left lg:max-w-[16rem]"
      >
        <span className="relative hidden size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-well ring-1 ring-steel sm:flex">
          {show.image_url ? (
            <Image src={show.image_url} alt="" fill unoptimized sizes="32px" className="object-cover" />
          ) : (
            <span aria-hidden className="font-display text-sm font-semibold text-ink-dim">
              {show.title.trim().charAt(0)}
            </span>
          )}
        </span>
        <span className="truncate font-display text-sm font-semibold text-ink sm:text-base">{show.title}</span>
      </button>

      <ol className="hidden items-center gap-1 lg:flex">
        {stops.map(({ id, label }) => {
          const on = id === current;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={on ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  go(id);
                }}
                className={`relative flex h-14 items-center px-2.5 text-sm whitespace-nowrap transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent after:transition-opacity ${
                  on ? "text-ink after:opacity-100" : "text-ink-dim after:opacity-0 hover:text-ink"
                }`}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ol>

      <div ref={menu} className="relative shrink-0 lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen(!open)}
          className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft ring-1 ring-steel transition-colors hover:bg-deck-hi hover:text-ink"
        >
          <span className="max-w-[7.5rem] truncate">{here?.label ?? "Sections"}</span>
          <svg aria-hidden viewBox="0 0 12 12" className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M3 4.5L6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        {open && (
          <ol className="rise absolute top-full right-0 mt-2 flex w-56 flex-col rounded-2xl bg-deck p-1.5 shadow-pop ring-1 ring-steel">
            {stops.map(({ id, label }) => {
              const on = id === current;
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={on ? "location" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      go(id);
                    }}
                    className={`flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm transition-colors hover:bg-deck-hi ${
                      on ? "text-ink" : "text-ink-soft"
                    }`}
                  >
                    {label}
                    {on && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
                  </a>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </nav>,
    target,
  );
}
