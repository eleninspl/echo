import { EchoError, OFFLINE, type EchoErrorBody } from "./echo";

// What the host can do next after an error, per docs/plan.md, "Web app tasks".
export type NextStep = "featured" | "previous" | "retry" | "home" | "none";

type Problem = { title: string; next: NextStep };

// The engine's message is written for the host and is shown as it comes, except a stub's (NOT_BUILT below);
// the title and next step are the app's.
const PROBLEMS: Record<string, Problem> = {
  show_unusable: { title: "Echo can't analyse this show yet", next: "featured" },
  daily_cap: { title: "Echo is resting until tomorrow", next: "featured" },
  filters_too_narrow: { title: "No guests match those changes", next: "previous" },
  unknown_country: { title: "Echo doesn't know that country", next: "previous" },
  qloo_error: { title: "Taste data is out of reach", next: "retry" },
  llm_error: { title: "The writing step failed", next: "retry" },
  engine_error: { title: "Echo hit a problem", next: "retry" },
  [OFFLINE]: { title: "Echo isn't answering", next: "retry" },
  not_implemented: { title: "Not built yet", next: "none" },
  not_found: { title: "Echo can't find that", next: "home" },
  bad_request: { title: "Echo couldn't read that", next: "none" },
};

const UNKNOWN: Problem = { title: "Something went wrong", next: "retry" };

export type HostError = Problem & { code: string; message: string };

// A stub's message names the task that builds it ("L6: briefing"), which is for us, not the host.
const NOT_BUILT = "This part of Echo isn't ready yet. Everything else on the page works.";

export function describe(error: EchoErrorBody | EchoError | unknown): HostError {
  if (error instanceof EchoError) return problem(error.code, error.message);
  if (isErrorBody(error)) return problem(error.error, error.message);
  return { ...UNKNOWN, code: "unknown", message: "Try again in a minute." };
}

function problem(code: string, message: string): HostError {
  return { ...(PROBLEMS[code] ?? UNKNOWN), code, message: code === "not_implemented" ? NOT_BUILT : message };
}

function isErrorBody(value: unknown): value is EchoErrorBody {
  return typeof value === "object" && value !== null && "error" in value && "message" in value;
}
