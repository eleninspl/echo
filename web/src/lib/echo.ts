export type Fame = "any" | "less_famous" | "rising";
export type AgeBucket = "24_and_younger" | "25_to_29" | "30_to_34" | "35_to_44" | "45_to_54" | "55_and_older";
export type AnchorType = "movie" | "tv_show" | "artist" | "brand" | "videogame";
export type Label = "sweet_spot" | "safe" | "far" | "long_shot" | "balanced";
export type Status = "running" | "done" | "failed";

export type Show = { id: string; title: string; description: string | null; image_url: string | null };

export type EpisodeAbout = { query: string; type: AnchorType; used?: string | null };

export type Filters = {
  fame: Fame;
  age: AgeBucket | null;
  country: string | null;
  episode_about: EpisodeAbout | null;
  // A topic for the episode in the host's words, for the writing only: the guests don't change for it.
  theme?: string | null;
  exclude?: string[];
};

// The engine's limit on a theme's length.
export const THEME_LENGTH = 120;

export type Step = { key: string; label: string; done: boolean };
export type MapItem = { name: string; image_url: string | null; affinity: number; id?: string | null };
export type MapRow = { category: string; items: MapItem[] };
export type Scores = { fit: number; love_back: number; reach: number | null; echo: number };
export type Evidence = {
  shared_tastes: string[];
  shared_podcasts?: string[];
  new_podcasts: string[];
  ages: AgeBucket[];
};
// `rewritten` is the web app's own mark on an idea Echo rewrote for this browser (lib/rewrites.ts), never the engine's.
export type Idea = { reason: string; title: string; pitch: string; rewritten?: boolean };

export type Guest = {
  ref: string;
  id: string;
  name: string;
  description: string | null;
  // A few plain sentences from the guest's public facts, the description first. Null when there's nothing more.
  bio: string | null;
  image_url: string | null;
  // Keys: wikipedia, imdb, spotify, musicbrainz, website.
  links: Record<string, string>;
  label: Label;
  scores: Scores;
  evidence: Evidence | null;
  idea: Idea | null;
};

export type QlooCall = {
  path: string;
  params: Record<string, string>;
  status: number;
  duration_ms: number;
  cached: boolean;
  at: string;
};

export type EchoErrorBody = { error: string; message: string };

export type Analysis = {
  id: string;
  status: Status;
  show: Show;
  filters: Filters;
  steps: Step[];
  audience_map: MapRow[];
  guests: Guest[];
  left_out: { name: string; why: "host" | "past_guest" }[];
  qloo_calls: QlooCall[];
  error: EchoErrorBody | null;
};

export type Episode = {
  title: string;
  summary: string;
  segments: { title: string; points: string[]; minutes?: number | null }[];
  questions: string[];
};

export type GuestDetails = { ref: string; audience_map: MapRow[]; adds: MapRow[]; episode: Episode | null };
export type Message = { role: "user" | "assistant"; content: string };

export type LeaveOutWhy = "had_on" | "not_for_us";
export type BridgeCount = { both: number; yours: number; theirs: number };
export type GuestBridge = {
  ref: string;
  both: MapRow[];
  yours: MapRow[];
  theirs: MapRow[];
  totals?: Record<string, BridgeCount>;
};
export type TasteFans = { category: string; name: string; guests: { ref: string; affinity: number }[] };
export type TasteAsk = { category: string; name: string };
export type MapFocus = { category: string | null; tastes: string[] };

export type ChatReply = {
  reply: string;
  action: "rerun" | "rewrite" | "leave_out" | "none";
  analysis_id: string | null;
  guest_ref: string | null;
  idea: Idea | null;
  why?: LeaveOutWhy | null;
  map?: MapFocus | null;
  guest_refs?: string[];
};

export type DraftText = { subject: string; body: string };
export type Draft = DraftText & { guest_ref: string };

// The practical side of an invitation, all optional. A fee is an amount in words ("$300"), or `unpaid`.
export type InviteDetails = {
  dates?: string;
  fee?: string;
  unpaid?: boolean;
  format?: "in_person" | "remote";
  place?: string;
  length?: string;
  release?: string;
  reply_by?: string;
};

export type DraftRequest = {
  analysis_id: string;
  guest_refs: string[];
  host_name?: string;
  // `note` goes to every guest in the request; `notes` to one guest each, by ref, up to 300 characters.
  note?: string;
  notes?: Record<string, string>;
  // `details` go to every guest; `details_by_ref` to one guest each, on top of the shared ones.
  details?: InviteDetails;
  details_by_ref?: Record<string, InviteDetails>;
  // A guest's idea as the chat rewrote it (lib/rewrites.ts), in place of the analysis's own.
  ideas?: Record<string, Idea>;
  previous?: DraftText;
  instruction?: string;
};

export type Health = { ok: boolean; mock: boolean; qloo_calls_today: number; qloo_calls_left: number | null };
export type Featured = { show: Show; analysis_id: string };

export class EchoError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Without a trailing slash, so a URL pasted with one still works.
const ENGINE_URL = (process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:8000").replace(/\/+$/, "");

// Code for a request that never got an answer: the engine is down or the network dropped.
export const OFFLINE = "offline";

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${ENGINE_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new EchoError(0, OFFLINE, "Check your connection, then try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data as EchoErrorBody | null;
    throw new EchoError(response.status, error?.error ?? "unknown", error?.message ?? response.statusText);
  }
  return data as T;
}

export const echo = {
  health: () => call<Health>("/health"),
  shows: (q: string, signal?: AbortSignal) =>
    call<{ shows: Show[] }>(`/shows?q=${encodeURIComponent(q)}`, undefined, signal),
  featured: () => call<{ featured: Featured[] }>("/featured"),
  startAnalysis: (show_id: string, filters?: Partial<Filters>) =>
    call<{ id: string; status: Status }>("/analyses", { show_id, filters }),
  analysis: (id: string, signal?: AbortSignal) =>
    call<Analysis>(`/analyses/${encodeURIComponent(id)}`, undefined, signal),
  // With a rewritten idea, the episode is written for it; with a length, timed to it.
  guest: (id: string, ref: string, idea?: Idea, length?: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ ...(idea && plain(idea)), ...(length && { length }) }).toString();
    return call<GuestDetails>(
      `/analyses/${encodeURIComponent(id)}/guests/${encodeURIComponent(ref)}${query ? `?${query}` : ""}`,
      undefined,
      signal,
    );
  },
  chat: (analysis_id: string, messages: Message[], exclude: string[], taste?: TasteAsk) =>
    call<ChatReply>("/chat", { analysis_id, messages, exclude, taste }),
  bridge: (id: string, ref: string, signal?: AbortSignal) =>
    call<GuestBridge>(
      `/analyses/${encodeURIComponent(id)}/guests/${encodeURIComponent(ref)}/bridge`,
      undefined,
      signal,
    ),
  tasteFans: (id: string, taste: TasteAsk, signal?: AbortSignal) =>
    call<TasteFans>(
      `/analyses/${encodeURIComponent(id)}/taste?${new URLSearchParams({ category: taste.category, name: taste.name })}`,
      undefined,
      signal,
    ),
  drafts: (request: DraftRequest) =>
    call<{ drafts: Draft[] }>("/drafts", {
      ...request,
      ideas:
        request.ideas && Object.fromEntries(Object.entries(request.ideas).map(([ref, idea]) => [ref, plain(idea)])),
    }),
  briefing: (analysis_id: string, guest_ref: string, idea?: Idea, length?: string) =>
    call<{ markdown: string }>("/briefings", { analysis_id, guest_ref, idea: idea && plain(idea), length }),
};

// An idea as the engine takes it, without the web app's own mark.
function plain({ reason, title, pitch }: Idea) {
  return { reason, title, pitch };
}
