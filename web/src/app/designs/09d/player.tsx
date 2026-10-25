"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { Logo } from "@/components/logo";
import type { Featured, Guest } from "@/lib/echo";

import { Cover, coverStyle } from "./cover";
import { analysisState, useDeck } from "./deck";
import { styles } from "./styles";
import { GuestWave, IdleWave, LABEL_NAME, LoadingWave, out100, scrubGeometry, TONE, type Part } from "./wave";

const analysisHref = (id: string) => `/analyses/${encodeURIComponent(id)}`;
const pad = (value: number) => String(value).padStart(2, "0");

export function Player() {
  const deck = useDeck();

  if (deck.featured === null) return <LoadingPlayer />;
  if (!deck.featured.length || !deck.current) return <IdlePlayer />;

  const { current } = deck;
  const state = analysisState(deck, current.analysis_id);

  return (
    <section aria-labelledby="v9d-shows" className="relative">
      <div className={`${styles.player} relative isolate flex flex-col rounded-[36px] p-5 sm:p-7`}>
        <CoverGlow item={current} />
        <header className="flex items-center justify-between gap-3">
          <h2 id="v9d-shows" className="text-xs font-bold tracking-[0.18em] text-(--v9d-soft) uppercase">
            Shows Echo has run
          </h2>
          <span className="text-sm text-(--v9d-dim)">{deck.featured.length} ready to open</span>
        </header>

        {deck.featured.length > 1 && <Shelf />}

        <ShowMeta item={current} />

        {deck.guests ? (
          <Chapters guests={deck.guests} />
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-(--v9d-soft)">
              {state === "loading" && "Loading the guests Echo found."}
              {state === "running" && "Echo is still scoring this show's guests."}
              {state === "failed" && "This run didn't load. Open it to try again."}
              {state === "done" && "Echo found no guests for this show."}
            </p>
            {state === "loading" || state === "running" ? <LoadingWave /> : <IdleWave />}
          </div>
        )}

        <Transport href={analysisHref(current.analysis_id)} title={current.show.title} />
      </div>
    </section>
  );
}

function CoverGlow({ item }: { item: Featured }) {
  const image = item.show.image_url;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[35px]">
      <div
        className={`${styles.glow} absolute -top-24 -left-20 h-[340px] w-[min(90%,520px)] rounded-full blur-[80px]`}
        style={
          image
            ? {
                backgroundImage: `url(${JSON.stringify(image)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: coverStyle(item.show.title).background }
        }
      />
    </div>
  );
}

const COLUMNS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

function Shelf() {
  const deck = useDeck();
  return (
    <ul
      aria-label="Load a show into the player"
      className={`mt-4 grid grid-cols-2 gap-2 ${COLUMNS[Math.min(deck.featured?.length ?? 1, 4)]}`}
    >
      {deck.featured?.map((item, index) => {
        const active = index === deck.loaded;
        return (
          <li key={item.analysis_id} className="min-w-0">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => deck.load(index)}
              className={`flex w-full min-w-0 items-center gap-2.5 rounded-full p-1 pr-4 text-sm font-semibold transition-colors ${
                active
                  ? "bg-(--v9d-ink) text-(--v9d-on-hue)"
                  : "bg-(--v9d-ground)/50 text-(--v9d-soft) ring-1 ring-(--v9d-line) hover:text-(--v9d-ink) hover:ring-(--v9d-dim)"
              }`}
            >
              <Cover show={item.show} className="size-8" />
              <span className="min-w-0 truncate">{item.show.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ShowMeta({ item }: { item: Featured }) {
  const deck = useDeck();
  const guests = deck.guests;
  const state = analysisState(deck, item.analysis_id);
  const sweet = guests?.filter((guest) => guest.label === "sweet_spot").length ?? null;
  return (
    <div className="mt-5 flex items-center gap-4 sm:gap-6">
      <Cover
        show={item.show}
        titled
        className="size-[92px] shadow-[0_24px_50px_-18px_rgb(0_0_0/0.8)] sm:size-[148px]"
      />
      <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
        <h3 className={`${styles.display} text-xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2rem]`}>
          {item.show.title}
        </h3>
        {item.show.description && <p className="line-clamp-2 text-(--v9d-soft) sm:text-lg">{item.show.description}</p>}
        <p className={`hidden flex-wrap gap-2 ${state === "loading" || guests ? "sm:flex" : ""}`}>
          <Stat value={guests?.length ?? null}>{guests?.length === 1 ? "guest scored" : "guests scored"}</Stat>
          <Stat value={sweet} hot>
            {sweet === 1 ? "sweet spot" : "sweet spots"}
          </Stat>
        </p>
      </div>
    </div>
  );
}

function Stat({ value, hot = false, children }: { value: number | null; hot?: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded-full px-3.5 py-1.5 text-sm ${
        hot && value
          ? `${styles.gradientEdge} text-(--v9d-ink)`
          : "bg-(--v9d-ground)/60 text-(--v9d-soft) ring-1 ring-(--v9d-line)"
      }`}
    >
      <span
        className={`${styles.display} font-semibold ${value === null ? styles.waiting : ""} ${hot && value ? styles.gradientText : "text-(--v9d-ink)"}`}
      >
        {value ?? "–"}
      </span>
      {children}
    </span>
  );
}

function Chapters({ guests }: { guests: Guest[] }) {
  const deck = useDeck();
  const selected = deck.selected;
  const guest = guests[selected];
  const count = guests.length;
  const { segment, width } = scrubGeometry(count);
  const inset = (segment / 2 / width) * 100;
  const sweet = guest.label === "sweet_spot";

  return (
    <div className="mt-6 flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex items-center gap-2.5 text-sm">
            <span className={`${styles.display} font-semibold text-(--v9d-dim) tabular-nums`}>
              No. {pad(selected + 1)}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold tracking-[0.08em] uppercase ${
                sweet ? `${styles.gradientFill} text-(--v9d-on-hue)` : "text-(--v9d-soft) ring-1 ring-(--v9d-line)"
              }`}
            >
              {LABEL_NAME[guest.label]}
            </span>
          </p>
          <p
            className={`${styles.display} truncate text-2xl leading-tight font-semibold tracking-[-0.03em] sm:text-[1.75rem]`}
          >
            {guest.name}
          </p>
          {guest.description && <p className="truncate text-(--v9d-soft)">{guest.description}</p>}
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
          <Readout part="fit" name="Fit" value={guest.scores.fit} />
          <Readout part="love" name="Love back" value={guest.scores.love_back} />
          <Readout part="reach" name="Reach" value={guest.scores.reach} />
        </dl>
      </div>

      <div className={`${styles.scrub} relative mt-6`}>
        <GuestWave guests={guests} selected={selected} />
        <input
          type="range"
          min={0}
          max={Math.max(0, count - 1)}
          step={1}
          value={selected}
          onChange={(event) => deck.select(Number(event.target.value))}
          aria-label="Scrub through the guests, best first"
          aria-valuetext={`${selected + 1} of ${count}: ${guest.name}, ${LABEL_NAME[guest.label]}`}
          className="absolute inset-y-0 cursor-pointer opacity-0"
          style={{
            left: `calc(${inset}% - 8px)`,
            width: `calc(${100 - inset * 2}% + 16px)`,
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-(--v9d-soft) tabular-nums">
        <span>
          Guest <span className="font-semibold text-(--v9d-ink)">{selected + 1}</span> of {count}
        </span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <span aria-hidden className="size-1.5 rounded-full bg-(--v9d-ink)" />
          Sweet spot
        </span>
        <span>Best first</span>
      </div>
    </div>
  );
}

function Readout({ part, name, value }: { part: Part; name: string; value: number | null }) {
  return (
    <div className="flex min-w-[5.25rem] flex-col gap-1.5 rounded-2xl bg-(--v9d-ground)/55 px-3 py-2.5 sm:min-w-[6rem]">
      <dt className="text-xs font-bold tracking-[0.06em] uppercase" style={{ color: TONE[part] }}>
        {name}
      </dt>
      <dd className="flex flex-col gap-2">
        <span className={`${styles.display} text-2xl leading-none font-semibold tabular-nums`}>
          {value === null ? (
            <>
              <span aria-hidden className="text-(--v9d-dim)">
                –
              </span>
              <span className="sr-only">not scored</span>
            </>
          ) : (
            out100(value)
          )}
        </span>
        <span aria-hidden className="block h-1 overflow-hidden rounded-full bg-(--v9d-muted)">
          <span
            className="block h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.round((value ?? 0) * 100)}%`,
              background: TONE[part],
            }}
          />
        </span>
      </dd>
    </div>
  );
}

function Transport({ href, title }: { href: string; title: string }) {
  const deck = useDeck();
  const count = deck.guests?.length ?? 0;
  return (
    <div className="mt-7 flex items-start justify-center gap-6 sm:gap-10">
      <Skip direction="back" disabled={!count || deck.selected === 0} onClick={() => deck.select(deck.selected - 1)} />
      <EchoControl href={href} label={`Open the analysis of ${title}`}>
        Open the analysis
      </EchoControl>
      <Skip
        direction="next"
        disabled={!count || deck.selected >= count - 1}
        onClick={() => deck.select(deck.selected + 1)}
      />
    </div>
  );
}

function Skip({
  direction,
  disabled,
  onClick,
}: {
  direction: "back" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const back = direction === "back";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={back ? "Previous guest" : "Next guest"}
      className="mt-3.5 flex size-12 items-center justify-center rounded-full text-(--v9d-ink) ring-1 ring-(--v9d-line) transition hover:bg-(--v9d-plum-hi) hover:ring-(--v9d-dim) disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
    >
      <svg aria-hidden viewBox="0 0 20 20" className={`size-5 ${back ? "" : "-scale-x-100"}`} focusable="false">
        <rect x={3.5} y={4} width={2.4} height={12} rx={1.2} fill="currentColor" />
        <path
          d="M16 4.6v10.8a1 1 0 0 1-1.55.83L7.4 10.83a1 1 0 0 1 0-1.66l7.05-5.4A1 1 0 0 1 16 4.6Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

const RINGS: { color: string; delay: number; still: number }[] = [
  { color: TONE.fit, delay: 0, still: 1.3 },
  { color: TONE.love, delay: 1.2, still: 1.65 },
  { color: TONE.reach, delay: 2.4, still: 2 },
];

function EchoControl({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="group flex flex-col items-center gap-4 rounded-3xl">
      <span className="relative flex size-[76px] items-center justify-center">
        {RINGS.map((ring) => (
          <span
            key={ring.color}
            aria-hidden
            className={styles.ring}
            style={
              {
                "--ring-color": ring.color,
                "--ring-delay": `${ring.delay}s`,
                "--still-scale": ring.still,
                "--still-opacity": 0.5 - ring.still * 0.15,
              } as CSSProperties
            }
          />
        ))}
        <span
          className={`${styles.gradientFill} relative flex size-full items-center justify-center rounded-full text-(--v9d-on-hue) shadow-[0_16px_40px_-12px_rgb(255_92_147/0.8)] transition-transform group-hover:scale-105`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-7" focusable="false">
            <path
              d="M5 12h13m-5.5-6L18.5 12l-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
      <span className="relative text-sm font-semibold text-(--v9d-ink)">{children}</span>
    </Link>
  );
}

function LoadingPlayer() {
  return (
    <div aria-hidden className={`${styles.player} flex flex-col gap-6 rounded-[36px] p-5 sm:p-7`}>
      <span className={`${styles.waiting} h-4 w-40 rounded-full bg-(--v9d-plum-hi)`} />
      <div className="flex items-center gap-6">
        <span className={`${styles.waiting} size-[92px] rounded-[22%] bg-(--v9d-plum-hi) sm:size-[148px]`} />
        <span className="flex flex-1 flex-col gap-3">
          <span className={`${styles.waiting} h-7 w-3/5 rounded-full bg-(--v9d-plum-hi)`} />
          <span className={`${styles.waiting} h-4 w-4/5 rounded-full bg-(--v9d-plum-hi)`} />
        </span>
      </div>
      <LoadingWave />
    </div>
  );
}

function IdlePlayer() {
  return (
    <div className={`${styles.player} flex flex-col rounded-[36px] p-5 sm:p-7`}>
      <div className="flex items-center gap-5 sm:gap-6">
        <span
          aria-hidden
          className="flex size-[92px] shrink-0 items-center justify-center rounded-[22%] border-2 border-dashed border-(--v9d-line) text-(--v9d-dim) sm:size-[148px]"
        >
          <Logo className="size-10 sm:size-14" />
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className={`${styles.display} text-xl font-semibold sm:text-[1.75rem]`}>Nothing loaded yet</p>
          <p className="text-(--v9d-soft) sm:text-lg">
            Find your show and run Echo on it. Its guests come back ranked, best first.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <IdleWave />
      </div>
      <div className="mt-7 flex justify-center">
        <EchoControl href="#find" label="Find your show">
          Find your show
        </EchoControl>
      </div>
    </div>
  );
}
