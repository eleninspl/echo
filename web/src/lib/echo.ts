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
};

export type Step = { key: string; label: string; done: boolean };
export type MapItem = { name: string; image_url: string | null; affinity: number };
export type MapRow = { category: string; items: MapItem[] };
export type Scores = { fit: number; love_back: number; reach: number | null; echo: number };
export type Evidence = { shared_tastes: string[]; new_podcasts: string[]; ages: AgeBucket[] };
export type Idea = { reason: string; title: string; pitch: string };

export type Guest = {
  ref: string;
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
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
  segments: { title: string; points: string[] }[];
  questions: string[];
};

export type GuestDetails = { ref: string; audience_map: MapRow[]; adds: MapRow[]; episode: Episode | null };
export type Message = { role: "user" | "assistant"; content: string };

export type ChatReply = {
  reply: string;
  action: "rerun" | "rewrite" | "none";
  analysis_id: string | null;
  guest_ref: string | null;
  idea: Idea | null;
};

export type DraftText = { subject: string; body: string };
export type Draft = DraftText & { guest_ref: string };

export type DraftRequest = {
  analysis_id: string;
  guest_refs: string[];
  host_name?: string;
  note?: string;
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

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8000";

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
  guest: (id: string, ref: string, signal?: AbortSignal) =>
    call<GuestDetails>(`/analyses/${encodeURIComponent(id)}/guests/${encodeURIComponent(ref)}`, undefined, signal),
  chat: (analysis_id: string, messages: Message[]) => call<ChatReply>("/chat", { analysis_id, messages }),
  drafts: (request: DraftRequest) => call<{ drafts: Draft[] }>("/drafts", request),
  briefing: (analysis_id: string, guest_ref: string) =>
    call<{ markdown: string }>("/briefings", { analysis_id, guest_ref }),
};
