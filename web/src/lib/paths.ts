const PREFIX = "/analyses/";

export const analysisPath = (id: string) => `${PREFIX}${encodeURIComponent(id)}`;

export const guestPath = (id: string, guestRef: string) => `${analysisPath(id)}/guests/${encodeURIComponent(guestRef)}`;

export const invitePath = (id: string) => `${analysisPath(id)}/invite`;

export function readPath(pathname: string): { id: string; guestRef: string | null; inviting: boolean } {
  const [id = "", section, guestRef] = pathname.slice(PREFIX.length).split("/");
  return {
    id: decodeURIComponent(id),
    guestRef: section === "guests" && guestRef ? decodeURIComponent(guestRef) : null,
    inviting: section === "invite",
  };
}

export const yourGuestsPath = (showId?: string, guestId?: string) =>
  showId && guestId ? `/guests?${new URLSearchParams({ show: showId, guest: guestId }).toString()}` : "/guests";
