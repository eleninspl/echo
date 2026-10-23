import re
import unicodedata
from collections.abc import Callable, Iterable
from datetime import date

REGISTRY_KEYS = {
    "imdb_id",
    "wikidata",
    "musicbrainz_artist_id",
    "spotify_artist_id",
    "library_of_congress_authority_id",
    "goodreads_author_id",
}
OCCUPATION_TAG = "urn:tag:occupation:person"


def normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    plain = "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower()
    plain = plain.replace("&", " and ").replace("’", "'").replace("'", "")
    return re.sub(r"[^a-z0-9]+", " ", plain).strip()


def words(text: str) -> list[str]:
    return normalize(text).split()


def properties(entity: dict) -> dict:
    return entity.get("properties") or {}


def is_dead(entity: dict) -> bool:
    return bool(properties(entity).get("date_of_death"))


def is_minor(entity: dict, today: date) -> bool:
    born = str(properties(entity).get("date_of_birth") or "")
    match = re.match(r"(\d{4})(?:-(\d{2})-(\d{2}))?", born)
    if not match:
        return False
    year = int(match.group(1))
    month, day = (int(match.group(2)), int(match.group(3))) if match.group(2) else (1, 1)
    age = today.year - year - ((today.month, today.day) < (month, day))
    return age < 18


def is_public_figure(entity: dict) -> bool:
    if any(tag.get("type") == OCCUPATION_TAG for tag in entity.get("tags") or []):
        return True
    return bool(REGISTRY_KEYS & set(entity.get("external") or {}))


def host_part(title: str) -> str:
    lowered = title.lower()
    for marker in (" with ", " w/ ", " hosted by "):
        if marker in lowered:
            return title[lowered.index(marker) + len(marker) :]
    return ""


def host_names(text: str) -> tuple[list[str], set[str]]:
    items = [item for item in (normalize(i) for i in re.split(r",|&|\band\b|\+", text)) if item]
    multi = [item for item in items if len(item.split()) > 1]
    if not multi:
        return [], set(items)
    surname = multi[-1].split()[-1]
    return [item if len(item.split()) > 1 else f"{item} {surname}" for item in items], set()


def host_matcher(title: str, author: str | None) -> Callable[[str], bool]:
    full_names: set[str] = set()
    single_names: set[str] = set()
    for text in (author or "", host_part(title)):
        names, singles = host_names(text)
        full_names.update(names)
        single_names.update(singles)
    full_texts = [f" {normalize(text)} " for text in (title, author or "") if text]

    def is_host(name: str) -> bool:
        parts = words(name)
        if not parts:
            return False
        joined = " ".join(parts)
        if joined in full_names or any(f" {joined} " in text for text in full_texts):
            return True
        if len(parts) > 2 and f"{parts[0]} {parts[-1]}" in full_names:
            return True
        first, last = parts[0], parts[-1]
        if len(parts) > 1 and len(last) >= 4 and last in single_names:
            return True
        return len(first) >= 4 and first in single_names

    return is_host


def dedupe(people: Iterable[dict]) -> list[dict]:
    seen: set[str] = set()
    kept = []
    for person in people:
        key = normalize(person["name"])
        if key in seen:
            continue
        seen.add(key)
        kept.append(person)
    return kept
