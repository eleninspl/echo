const PREFIX = "/analyses/";

export const analysisPath = (id: string) => `${PREFIX}${encodeURIComponent(id)}`;

export const guestPath = (id: string, guestRef: string) => `${analysisPath(id)}/guests/${encodeURIComponent(guestRef)}`;

export function readPath(pathname: string): { id: string; guestRef: string | null } {
  const [id = "", section, guestRef] = pathname.slice(PREFIX.length).split("/");
  return {
    id: decodeURIComponent(id),
    guestRef: section === "guests" && guestRef ? decodeURIComponent(guestRef) : null,
  };
}
