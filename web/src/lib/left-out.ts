import type { LeaveOutWhy } from "./echo";
import { isRecord, useStored } from "./stored";

export type LeftOutGuest = { id: string; name: string; why: LeaveOutWhy };

export const LEFT_OUT_LIMIT = 50;

function parseLeftOut(value: unknown): LeftOutGuest[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (guest): guest is LeftOutGuest =>
        isRecord(guest) &&
        typeof guest.id === "string" &&
        typeof guest.name === "string" &&
        (guest.why === "had_on" || guest.why === "not_for_us"),
    )
    .map(({ id, name, why }) => ({ id, name, why }));
}

const noneLeftOut = (guests: LeftOutGuest[]) => guests.length === 0;

export function useLeftOut(showId: string) {
  return useStored(`echo.left-out.${showId}`, parseLeftOut, noneLeftOut);
}
