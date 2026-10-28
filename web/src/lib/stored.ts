"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// A value kept in this browser's localStorage as JSON, shared by every component that reads the same key. Where
// the browser refuses storage (a private window, a full quota) it lives in memory until the tab closes, so the page
// still works.
const memory = new Map<string, string>();
const memoryOnly = new Set<string>();
const listeners = new Set<() => void>();

function subscribe(change: () => void) {
  listeners.add(change);
  window.addEventListener("storage", change);
  return () => {
    listeners.delete(change);
    window.removeEventListener("storage", change);
  };
}

function readRaw(key: string): string | null {
  if (memoryOnly.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeRaw(key: string, raw: string | null) {
  if (raw === null) memory.delete(key);
  else memory.set(key, raw);
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
    memoryOnly.delete(key);
  } catch {
    memoryOnly.add(key);
  }
  listeners.forEach((listener) => listener());
}

function parsed<T>(raw: string | null, parse: (value: unknown) => T): T {
  try {
    return parse(raw === null ? null : JSON.parse(raw));
  } catch {
    return parse(null);
  }
}

// `parse` turns whatever is stored (or null) into a valid value; keep it a module-level function. `empty` says
// when to remove the key instead of storing the value.
export function useStored<T>(
  key: string,
  parse: (value: unknown) => T,
  empty: (value: T) => boolean,
): [T, (change: (current: T) => T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const value = useMemo(() => parsed(raw, parse), [raw, parse]);
  const update = useCallback(
    (change: (current: T) => T) => {
      const next = change(parsed(readRaw(key), parse));
      writeRaw(key, empty(next) ? null : JSON.stringify(next));
    },
    [key, parse, empty],
  );
  return [value, update];
}

export function writeStored(key: string, value: unknown) {
  writeRaw(key, value === null ? null : JSON.stringify(value));
}

function keysWith(prefix: string): string[] {
  const keys = new Set([...memory.keys()].filter((key) => key.startsWith(prefix)));
  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix) && !memoryOnly.has(key)) keys.add(key);
    }
  } catch {
    return [...keys].sort();
  }
  return [...keys].filter((key) => readRaw(key) !== null).sort();
}

export function storedKeys(prefix: string): string[] {
  return keysWith(prefix).map((key) => key.slice(prefix.length));
}

export function useStoredKeys(prefix: string): string[] {
  const joined = useStoredSnapshot(() => storedKeys(prefix).join("\n"), "");
  return useMemo(() => (joined ? joined.split("\n") : []), [joined]);
}

export function useStoredSnapshot<T extends string | number>(read: () => T, server: T): T {
  return useSyncExternalStore(subscribe, read, () => server);
}

export function readStored<T>(key: string, parse: (value: unknown) => T): T {
  return parsed(readRaw(key), parse);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringsOf(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
