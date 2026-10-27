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
YEAR = r"(?:1[89]|20)\d{2}"
YEAR_NOTE = re.compile(rf"\s*\([^()]*\b{YEAR}\b[^()]*\)")
BORN_NOTE = re.compile(rf",?\s*\b(?:born|b\.)\s[^,;()]*?\b{YEAR}\b", re.IGNORECASE)
LIFESPAN = re.compile(rf"\b({YEAR})\s*[-–—−]\s*({YEAR})\b")
MIN_LIFESPAN = 18
STUB_DESCRIPTIONS = {"researcher", "scientist", "scholar"}


def normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    plain = "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower()
    plain = plain.replace("&", " and ").replace("’", "'").replace("'", "")
    return re.sub(r"[^a-z0-9]+", " ", plain).strip()


def words(text: str) -> list[str]:
    return normalize(text).split()


def properties(entity: dict) -> dict:
    return entity.get("properties") or {}


def english_description(entity: dict) -> str | None:
    props = properties(entity)
    for item in props.get("short_descriptions") or []:
        if item.get("language") == "en" and item.get("value"):
            return item["value"]
    return props.get("short_description")


def occupations(entity: dict) -> list[str]:
    names = [tag.get("name") or "" for tag in entity.get("tags") or [] if tag.get("type") == OCCUPATION_TAG]
    return list(dict.fromkeys(name.strip() for name in names if name.strip()))


def from_occupations(entity: dict) -> str | None:
    named = occupations(entity)[:2]
    if not named:
        return None
    return " and ".join([named[0], *(name.lower() for name in named[1:])])


def person_description(entity: dict) -> str | None:
    text = english_description(entity)
    if not text or "orcid" in text.lower() or text.strip().lower() in STUB_DESCRIPTIONS:
        return from_occupations(entity)
    plain = LIFESPAN.sub("", BORN_NOTE.sub("", YEAR_NOTE.sub("", text)))
    return re.sub(r"\s+([,.;])", r"\1", re.sub(r"\s{2,}", " ", plain)).strip(" ,;") or None


def birth_year(entity: dict) -> int | None:
    match = re.match(r"(\d{4})", str(properties(entity).get("date_of_birth") or ""))
    return int(match.group(1)) if match else None


def lifespan_in_description(entity: dict) -> bool:
    match = LIFESPAN.search(english_description(entity) or "")
    if not match:
        return False
    born, died = int(match.group(1)), int(match.group(2))
    if (known := birth_year(entity)) is not None:
        return born == known
    return died - born >= MIN_LIFESPAN


def is_dead(entity: dict) -> bool:
    return bool(properties(entity).get("date_of_death")) or lifespan_in_description(entity)


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


def host_matcher(title: str, author: str | None, description: str | None = None) -> Callable[[str], bool]:
    """Hosts by name from the title and Apple's author line, and by full name from Qloo's description of the show,
    which names its hosts when the author line is a network ("Ann Example and Bo Sample talk sports")."""
    full_names: set[str] = set()
    single_names: set[str] = set()
    for text in (author or "", host_part(title)):
        names, singles = host_names(text)
        full_names.update(names)
        single_names.update(singles)
    full_texts = [f" {normalize(text)} " for text in (title, author or "") if text]
    about = f" {normalize(description or '')} "

    def is_host(name: str) -> bool:
        parts = words(name)
        if not parts:
            return False
        joined = " ".join(parts)
        if joined in full_names or any(f" {joined} " in text for text in full_texts):
            return True
        if len(parts) > 1 and f" {joined} " in about:
            return True
        if len(parts) > 2 and f"{parts[0]} {parts[-1]}" in full_names:
            return True
        first, last = parts[0], parts[-1]
        if len(parts) > 1 and len(last) >= 4 and last in single_names:
            return True
        return len(first) >= 4 and first in single_names

    return is_host


def dedupe(people: Iterable[dict], score: Callable[[dict], float]) -> list[dict]:
    """One person per normalised name: the one with the higher score, in the place of the first."""
    best: dict[str, dict] = {}
    for person in people:
        key = normalize(person["name"])
        if key not in best or score(person) > score(best[key]):
            best[key] = person
    return list(best.values())
