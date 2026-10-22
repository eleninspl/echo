import type { ResponseCache } from "./cache";
import type { EntityType, Params, QlooEntity } from "./types";

export class QlooError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    detail: string,
  ) {
    super(`Qloo ${status} on ${path}: ${detail}`);
  }
}

type ClientOptions = {
  apiKey: string;
  baseUrl?: string;
  cache?: ResponseCache;
  maxRetries?: number;
  requestsPerSecond?: number;
};

export type Quota = {
  monthLimit?: number;
  monthRemaining?: number;
  liveRequests: number;
  cacheHits: number;
};

export type QlooClient = ReturnType<typeof createQlooClient>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildQuery(params: Params) {
  const query = new URLSearchParams();
  const entries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    if (value === undefined) continue;
    query.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return query.toString();
}

export function createQlooClient({
  apiKey,
  baseUrl = "https://hackathon.api.qloo.com",
  cache,
  maxRetries = 4,
  requestsPerSecond = 4,
}: ClientOptions) {
  const minIntervalMs = 1000 / requestsPerSecond;
  let nextSlot = 0;
  const quota: Quota = { liveRequests: 0, cacheHits: 0 };

  async function throttle() {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + minIntervalMs;
    await sleep(slot - now);
  }

  function readQuota(headers: Headers) {
    const limit = Number(headers.get("x-month-ratelimit-limit"));
    const remaining = Number(headers.get("x-month-ratelimit-remaining"));
    if (Number.isFinite(limit) && limit > 0) quota.monthLimit = limit;
    if (headers.has("x-month-ratelimit-remaining") && Number.isFinite(remaining)) {
      quota.monthRemaining = remaining;
    }
  }

  async function get<T>(path: string, params: Params = {}): Promise<T> {
    const url = `${baseUrl}${path}?${buildQuery(params)}`;
    const cached = await cache?.get(url);
    if (cached !== undefined) {
      quota.cacheHits++;
      return cached as T;
    }

    for (let attempt = 0; ; attempt++) {
      await throttle();
      quota.liveRequests++;
      const response = await fetch(url, { headers: { "X-Api-Key": apiKey } });
      readQuota(response.headers);
      const body = await response.text();
      if (response.ok) {
        const json = JSON.parse(body) as T;
        await cache?.set(url, json);
        return json;
      }
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= maxRetries) {
        throw new QlooError(response.status, path, body.slice(0, 300));
      }
      const resetSeconds = Number(response.headers.get("x-second-ratelimit-reset")) || 1;
      await sleep(resetSeconds * 1000 * (attempt + 1));
    }
  }

  return {
    get,

    quota: () => ({ ...quota }),

    async search(query: string, type: EntityType, take = 5) {
      const data = await get<{ results?: QlooEntity[] }>("/search", { query, types: type, take });
      return data.results ?? [];
    },

    async insights(params: Params & { "filter.type": string }) {
      const data = await get<{ results?: { entities?: QlooEntity[] } }>("/v2/insights", params);
      return data.results?.entities ?? [];
    },

    async compare(a: string[], b: string[], params: Params = {}) {
      return get<unknown>("/v2/analysis/compare", {
        "a.signal.interests.entities": a,
        "b.signal.interests.entities": b,
        ...params,
      });
    },
  };
}
