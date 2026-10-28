"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { echo, type Analysis, type GuestDetails, type Guest } from "@/lib/echo";
import { describe, type HostError } from "@/lib/errors";
import {
  briefingFor,
  isEmail,
  mailto,
  useBriefings,
  useDrafts,
  useEmails,
  useEpisodeLength,
  useStatuses,
  type InviteStatus,
  type SavedDraft,
} from "@/lib/invitations";
import { analysisPath, invitePath, yourGuestsPath } from "@/lib/paths";
import { usePickCount, usePickedShows, usePicks, type Pick as SavedPick } from "@/lib/picks";
import { readRewrites, rewrittenIdea, withRewrites } from "@/lib/rewrites";

import { Briefing } from "./briefing";
import { CopyButton } from "./copy-button";
import { FansVenn } from "./fans-venn";
import { EpisodePlan } from "./guest-details";
import { Picture } from "./guest-list";
import { Chip, FRAME, hue, Lamp, LABEL_HUE } from "./hud";
import { ShowCover } from "./show-cover";

const TITLE = "font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-semibold text-balance";

type Stage = "new" | "drafted" | InviteStatus;

const STAGES: Record<Stage, { name: string; color: string }> = {
  new: { name: "Not written", color: "var(--ink-dim)" },
  drafted: { name: "Drafted", color: "var(--ink-soft)" },
  sent: { name: "Sent", color: "var(--brand)" },
  booked: { name: "Booked", color: "var(--sweet)" },
};

type Run = Analysis | "failed";

const noChange = () => () => undefined;

export function YourGuests() {
  const ready = useSyncExternalStore(
    noChange,
    () => true,
    () => false,
  );
  const shows = usePickedShows();
  const count = usePickCount();
  const params = useSearchParams();
  const router = useRouter();
  const open = { show: params.get("show"), guest: params.get("guest") };

  function toggle(showId: string, guestId: string) {
    const opened = open.show === showId && open.guest === guestId;
    router.replace(opened ? yourGuestsPath() : yourGuestsPath(showId, guestId), { scroll: false });
  }

  return (
    <div className={`${FRAME} flex flex-1 flex-col gap-10 pt-10 pb-24`}>
      <header className="flex max-w-5xl flex-col gap-3">
        <h1 className={TITLE}>Your guests</h1>
        <p className="max-w-[62ch] text-ink-soft">
          Everyone you picked, by show: where each invitation stands, the invitation itself, and what to read before you
          record. Kept in this browser only.
        </p>
        {ready && count > 0 && (
          <p className="tag text-ink-dim">
            {count} {count === 1 ? "guest" : "guests"} · {shows.length} {shows.length === 1 ? "show" : "shows"}
          </p>
        )}
      </header>

      {!ready ? (
        <div aria-busy className="h-40 max-w-5xl animate-pulse rounded-2xl bg-deck" />
      ) : !shows.length ? (
        <section className="flex max-w-[60ch] flex-col items-start gap-4">
          <p className="font-display text-2xl font-semibold">No guests picked yet</p>
          <p className="text-ink-soft">
            Find your show, pick guests with + and write their invitations. They show up here, with a briefing for each.
          </p>
          <Link href="/" className="btn btn-brand mt-2 min-h-12 px-6 text-base">
            Find your show
          </Link>
        </section>
      ) : (
        <div className="flex max-w-5xl flex-col gap-8">
          {shows.map((showId) => (
            <ShowGroup
              key={showId}
              showId={showId}
              openGuest={open.show === showId ? open.guest : null}
              onToggle={(guestId) => toggle(showId, guestId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function useRuns(picks: SavedPick[]): Record<string, Run> {
  const ids = [...new Set(picks.flatMap(({ analysis }) => analysis ?? []))].sort().join(",");
  const [runs, setRuns] = useState<Record<string, Run>>({});

  useEffect(() => {
    const controller = new AbortController();
    for (const id of ids.split(",").filter(Boolean)) {
      echo
        .analysis(id, controller.signal)
        .then((run) =>
          setRuns((current) => ({
            ...current,
            [id]: run.status === "done" ? withRewrites(run, readRewrites(id)) : "failed",
          })),
        )
        .catch(() => {
          if (!controller.signal.aborted) setRuns((current) => ({ ...current, [id]: "failed" }));
        });
    }
    return () => controller.abort();
  }, [ids]);

  return runs;
}

function ShowGroup({
  showId,
  openGuest,
  onToggle,
}: {
  showId: string;
  openGuest: string | null;
  onToggle: (guestId: string) => void;
}) {
  const [picks] = usePicks(showId);
  const [drafts] = useDrafts(showId);
  const [statuses, setStatuses] = useStatuses(showId);
  const runs = useRuns(picks);
  const loaded = Object.values(runs).filter((run): run is Analysis => run !== "failed");
  const show = loaded[0]?.show;
  const latest = picks.findLast((pick) => pick.analysis)?.analysis;
  const failed =
    !show && [...new Set(picks.flatMap(({ analysis }) => analysis ?? []))].every((id) => runs[id] === "failed");
  const stageOf = (id: string): Stage => statuses[id] ?? (drafts[id] ? "drafted" : "new");
  const counts = (["booked", "sent", "drafted"] as const)
    .map((stage) => ({ stage, count: picks.filter((pick) => stageOf(pick.id) === stage).length }))
    .filter(({ count }) => count > 0);
  const headingId = `show-${showId}`;

  return (
    <section aria-labelledby={headingId} className="zone flex flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-steel p-4 sm:p-5">
        {show ? (
          <ShowCover show={show} size={48} />
        ) : (
          <span aria-hidden className="size-12 shrink-0 animate-pulse rounded-xl bg-deck-hi" />
        )}
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
          <h2 id={headingId} className="truncate font-display text-xl leading-tight font-semibold">
            {show?.title ?? (failed ? "A show Echo can't open now" : "Opening…")}
          </h2>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-dim">
            <span>
              {picks.length} {picks.length === 1 ? "guest" : "guests"}
            </span>
            {counts.map(({ stage, count }) => (
              <Chip key={stage} color={STAGES[stage].color}>
                {count} {STAGES[stage].name.toLowerCase()}
              </Chip>
            ))}
          </p>
        </div>
        {latest && (
          <div className="flex gap-2">
            <Link href={analysisPath(latest)} className="btn btn-sm">
              Guests
            </Link>
            <Link href={invitePath(latest)} className="btn btn-sm">
              Invitations
            </Link>
          </div>
        )}
      </header>
      <ul className="flex flex-col divide-y divide-steel">
        {picks.map((pick) => {
          const run = pick.analysis ? runs[pick.analysis] : "failed";
          const guest =
            run && run !== "failed"
              ? run.guests.find((each) => each.id === pick.id && each.ref === pick.ref)
              : undefined;
          return (
            <GuestRow
              key={pick.id}
              showId={showId}
              pick={pick}
              run={run}
              guest={guest}
              stage={stageOf(pick.id)}
              draft={drafts[pick.id]}
              open={openGuest === pick.id}
              onToggle={() => onToggle(pick.id)}
              onStatus={(status) =>
                setStatuses((current) => {
                  const next = { ...current };
                  if (status) next[pick.id] = status;
                  else delete next[pick.id];
                  return next;
                })
              }
            />
          );
        })}
      </ul>
    </section>
  );
}

function GuestRow({
  showId,
  pick,
  run,
  guest,
  stage,
  draft,
  open,
  onToggle,
  onStatus,
}: {
  showId: string;
  pick: SavedPick;
  run: Run | undefined;
  guest: Guest | undefined;
  stage: Stage;
  draft: SavedDraft | undefined;
  open: boolean;
  onToggle: () => void;
  onStatus: (status: InviteStatus | undefined) => void;
}) {
  const panelId = `guest-${showId}-${pick.id}`;
  const face = guest ?? { name: pick.name, image_url: pick.image_url ?? null, label: pick.label ?? "balanced" };

  useEffect(() => {
    if (open) document.getElementById(`row-${panelId}`)?.scrollIntoView({ block: "nearest" });
  }, [open, panelId]);

  return (
    <li id={`row-${panelId}`} className="scroll-mt-20">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-deck-hi/60 sm:px-5"
      >
        <span
          className="relative block size-11 shrink-0 overflow-hidden rounded-full bg-well"
          style={{ boxShadow: `0 0 0 2px var(--deck), 0 0 0 3.5px ${LABEL_HUE[face.label]}` }}
        >
          <Picture guest={face} sizes="44px" small />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-display text-[1.0625rem] leading-tight font-semibold">{pick.name}</span>
          <span className="truncate text-sm text-ink-dim">{draft ? draft.subject : "No invitation yet"}</span>
        </span>
        <Chip color={STAGES[stage].color} className="hidden sm:inline-flex">
          {STAGES[stage].name}
        </Chip>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`size-3 shrink-0 text-ink-dim transition-transform duration-300 ease-(--ease-out) ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-6 sm:px-5 sm:pl-[4.75rem]">
          <Prep showId={showId} pick={pick} run={run} guest={guest} stage={stage} draft={draft} onStatus={onStatus} />
        </div>
      )}
    </li>
  );
}

type Tab = "invitation" | "briefing" | "episode" | "fans";

const TABS: { tab: Tab; name: string }[] = [
  { tab: "invitation", name: "Invitation" },
  { tab: "briefing", name: "Briefing" },
  { tab: "episode", name: "Episode" },
  { tab: "fans", name: "Their fans" },
];

function Prep({
  showId,
  pick,
  run,
  guest,
  stage,
  draft,
  onStatus,
}: {
  showId: string;
  pick: SavedPick;
  run: Run | undefined;
  guest: Guest | undefined;
  stage: Stage;
  draft: SavedDraft | undefined;
  onStatus: (status: InviteStatus | undefined) => void;
}) {
  const [tab, setTab] = useState<Tab>("invitation");
  const [emails] = useEmails();
  const [briefings, setBriefings] = useBriefings(showId);
  const length = useEpisodeLength(showId);
  const email = emails[pick.id] ?? "";
  const idea = guest && rewrittenIdea(guest);
  const details = useGuestDetails(run, guest, idea, length, tab === "episode" || tab === "fans");
  const writeHere = pick.analysis ? invitePath(pick.analysis) : undefined;
  const forKey = run && run !== "failed" && guest ? briefingFor(run.id, guest.ref, idea?.title, length) : "";
  const kept = briefings[pick.id];
  const tabId = (each: Tab) => `${showId}-${pick.id}-${each}`;

  return (
    <div className="rise flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="tag text-ink-dim">Where it stands</span>
        <div role="group" aria-label={`Where the invitation to ${pick.name} stands`} className="flex flex-wrap gap-1">
          {([undefined, "sent", "booked"] as const).map((status) => {
            const on = status ? stage === status : stage === "new" || stage === "drafted";
            const color = STAGES[status ?? (stage === "new" ? "new" : "drafted")].color;
            return (
              <button
                key={status ?? "none"}
                type="button"
                aria-pressed={on}
                onClick={() => onStatus(status)}
                className={`btn btn-sm ${on ? "btn-solid" : ""}`}
                style={hue(status ? color : "var(--ink)")}
              >
                {status ? STAGES[status].name : "Not sent"}
              </button>
            );
          })}
        </div>
        {guest?.idea && <p className="text-sm text-ink-soft sm:ml-auto">Idea: {guest.idea.title}</p>}
      </div>

      <div
        role="tablist"
        aria-label={`About ${pick.name}`}
        className="flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--steel)] [scrollbar-width:none]"
      >
        {TABS.map(({ tab: each, name }) => {
          const on = each === tab;
          return (
            <button
              key={each}
              id={`tab-${tabId(each)}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${tabId(each)}`}
              onClick={() => setTab(each)}
              className={`shrink-0 border-b-2 px-2.5 py-2 font-display text-sm font-semibold whitespace-nowrap transition-colors sm:px-3 ${
                on ? "border-ink text-ink" : "border-transparent text-ink-dim hover:text-ink-soft"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      <div id={`panel-${tabId(tab)}`} role="tabpanel" aria-labelledby={`tab-${tabId(tab)}`}>
        {tab === "invitation" ? (
          draft ? (
            <Invitation name={pick.name} draft={draft} email={email} edit={writeHere} />
          ) : (
            <Empty>
              No invitation yet.{" "}
              {writeHere && (
                <Link href={writeHere} className="text-ink underline underline-offset-4 hover:text-brand">
                  Write it
                </Link>
              )}
            </Empty>
          )
        ) : !run ? (
          <Waiting>Opening the run…</Waiting>
        ) : run === "failed" || !guest ? (
          <Empty>Echo can&apos;t open the run this guest was picked in any more. Run the show again to prepare.</Empty>
        ) : tab === "briefing" ? (
          <Briefing
            key={forKey}
            id={run.id}
            guestRef={guest.ref}
            guestName={guest.name}
            idea={idea}
            length={length}
            saved={kept?.for === forKey ? kept.markdown : undefined}
            onWritten={(markdown) => setBriefings((current) => ({ ...current, [pick.id]: { markdown, for: forKey } }))}
          />
        ) : details.state === "failed" ? (
          <div role="alert" className="flex flex-col gap-1">
            <p className="font-semibold text-alert">{details.problem.title}</p>
            <p className="text-sm text-ink-soft">{details.problem.message}</p>
          </div>
        ) : details.state !== "done" ? (
          <Waiting>{tab === "episode" ? "Writing the episode…" : "Mapping their fans…"}</Waiting>
        ) : tab === "episode" ? (
          details.details.episode ? (
            <EpisodePlan episode={details.details.episode} />
          ) : (
            <Empty>Echo hasn&apos;t written this episode yet.</Empty>
          )
        ) : (
          <div className="max-w-2xl">
            <FansVenn showMap={run.audience_map} guestMap={details.details.audience_map} adds={details.details.adds} />
          </div>
        )}
      </div>
    </div>
  );
}

function Invitation({ name, draft, email, edit }: { name: string; draft: SavedDraft; email: string; edit?: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="screen flex flex-col gap-3 p-4 sm:p-5">
        {isEmail(email) && <p className="text-sm text-ink-dim">To {email.trim()}</p>}
        <p className="font-semibold">{draft.subject}</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">{draft.body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={mailto(draft, email)} className="btn btn-solid" style={hue("var(--brand)")}>
          Open in email
          <span className="sr-only">, the invitation to {name}</span>
        </a>
        <CopyButton text={`Subject: ${draft.subject}\n\n${draft.body}`} label="Copy" of={`the invitation to ${name}`} />
        {edit && (
          <Link href={edit} className="btn btn-sm ml-auto">
            Edit
            <span className="sr-only"> the invitation to {name}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

type Load =
  { state: "idle" | "loading" } | { state: "done"; details: GuestDetails } | { state: "failed"; problem: HostError };

const loaded = new Map<string, GuestDetails>();

function useGuestDetails(
  run: Run | undefined,
  guest: Guest | undefined,
  idea: ReturnType<typeof rewrittenIdea>,
  length: string | undefined,
  wanted: boolean,
): Load {
  const runId = run && run !== "failed" ? run.id : null;
  const key =
    runId && guest ? `${runId}/${guest.ref}/${idea ? `${idea.title}/${idea.pitch}` : ""}/${length ?? ""}` : "";
  const [asked, setAsked] = useState(false);
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null);
  if (wanted && !asked) setAsked(true);
  const cached = loaded.get(key);

  useEffect(() => {
    if (!asked || !key || !runId || !guest || loaded.has(key)) return;
    let current = true;
    echo
      .guest(runId, guest.ref, idea, length)
      .then((details) => {
        loaded.set(key, details);
        if (current) setResult({ key, load: { state: "done", details } });
      })
      .catch((error) => {
        if (current) setResult({ key, load: { state: "failed", problem: describe(error) } });
      });
    return () => {
      current = false;
    };
  }, [asked, key, runId, guest, idea, length]);

  if (cached) return { state: "done", details: cached };
  if (result?.key === key) return result.load;
  return asked && key ? { state: "loading" } : { state: "idle" };
}

function Waiting({ children }: { children: ReactNode }) {
  return (
    <div aria-busy className="flex min-h-24 items-center gap-3 text-ink-soft">
      <Lamp color="var(--accent)" className="pulse size-2" />
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-steel-hi px-4 py-6 text-sm text-ink-dim">{children}</p>;
}
