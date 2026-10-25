"use client";

import { useSyncExternalStore } from "react";

// The name the host signs invitations with, kept in this browser so they type it once. There are no
// accounts in v1.
const KEY = "echo.host-name";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveHostName(name: string) {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

export function useHostName(): string {
  return useSyncExternalStore(
    (change) => {
      listeners.add(change);
      window.addEventListener("storage", change);
      return () => {
        listeners.delete(change);
        window.removeEventListener("storage", change);
      };
    },
    read,
    () => "",
  );
}
