import { QlooError, type QlooClient } from "../qloo/client";
import type { QlooEntity } from "../qloo/types";

export type CompareTag = {
  tag_id: string;
  name: string;
  type: string;
  query?: { score?: number; count?: string };
};

export function isDeceased(entity: QlooEntity) {
  return Boolean(entity.properties?.["date_of_death"]);
}

export async function findShow(qloo: QlooClient, name: string) {
  const [show] = await qloo.search(name, "urn:entity:podcast", 1);
  return show;
}

export async function candidateGuests(
  qloo: QlooClient,
  showId: string,
  { take = 50, popularityMax }: { take?: number; popularityMax?: number } = {},
) {
  const people = await qloo.insights({
    "filter.type": "urn:entity:person",
    "signal.interests.entities": showId,
    "filter.popularity.max": popularityMax,
    take,
  });
  return {
    alive: people.filter((person) => !isDeceased(person)),
    deceased: people.filter(isDeceased),
  };
}

export async function podcastNeighbours(qloo: QlooClient, entityId: string, take = 50) {
  return qloo.insights({
    "filter.type": "urn:entity:podcast",
    "signal.interests.entities": entityId,
    take,
  });
}

export async function loveBack(qloo: QlooClient, guestId: string, showId: string) {
  const [match] = await qloo.insights({
    "filter.type": "urn:entity:podcast",
    "signal.interests.entities": guestId,
    "filter.results.entities": showId,
  });
  return match?.entity_id === showId ? match.query?.affinity : undefined;
}

export async function tagContrast(qloo: QlooClient, showId: string, guestId: string) {
  try {
    const data = (await qloo.compare([showId], [guestId])) as {
      results?: { tags?: CompareTag[]; a?: CompareTag[]; b?: CompareTag[] };
    };
    return {
      shared: data.results?.tags ?? [],
      showOnly: data.results?.a ?? [],
      guestOnly: data.results?.b ?? [],
    };
  } catch (error) {
    if (error instanceof QlooError && error.status === 404) {
      return { shared: [], showOnly: [], guestOnly: [] };
    }
    throw error;
  }
}
