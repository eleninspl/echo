import re

from .cleanup import english_description, normalize, occupations


def terms(text: str) -> frozenset[str]:
    return frozenset(text.split())


THEME_TAGS = "urn:tag:theme:qloo"
TAG_TYPES = (
    "urn:tag:keyword:media",
    "urn:tag:genre:media",
    "urn:tag:genre:music",
    THEME_TAGS,
)
GENRE_TAG_PREFIXES = ("urn:tag:genre", "urn:tag:subgenre")

RELIGION = terms(
    "religion religious christian christianity catholic protestant evangelical muslim islam islamic jewish "
    "judaism hindu hinduism buddhist buddhism sikh atheist atheism church mosque synagogue bible biblical "
    "gospel scripture jesus faith worship prayer sermon mormon lds spirituality occult occultism satanic satanism "
    "witchcraft"
)
SEXUALITY = terms(
    "lgbt lgbtq lgbtqia gay lesbian bisexual transgender queer homosexual homosexuality sexuality erotic porn"
)
SEX = terms("sex sexual sexy")
GENDER = terms("trans gender feminist feminism female male women woman men masculinity girl girls boy boys")
ETHNICITY = terms(
    "race racial racism ethnic ethnicity black african asian latino latina latinx hispanic indigenous native "
    "arab immigrant immigrants immigration"
)
HEALTH = terms(
    "depression anxiety cancer disease illness disability disabled autism autistic adhd addiction alcoholism "
    "alcoholic sober sobriety suicide pregnancy pregnant abortion hiv obesity psychiatric covid pandemic coronavirus"
)
WELLBEING = terms("health mental therapy")
POLITICS = terms(
    "politics political democrat democrats democratic republican republicans conservative socialist socialism "
    "communist communism libertarian election partisan maga gop activism activist trump biden government "
    "patriotism patriotic nationalism nationalist totalitarianism totalitarian authoritarianism authoritarian fascism "
    "fascist dictatorship propaganda inequality injustice progressives liberals capitalism"
)
MONEY_TROUBLE = terms("debt loan loans credit bankruptcy payday gambling betting poverty poor homeless homelessness")
HARDSHIP = terms(
    "suffering struggle trauma traumatic grief grieving bereavement loss loneliness lonely alienation despair abuse "
    "misery pain drug drugs hustling gang gangs gangster gangsters thug thugs"
)
PLACEHOLDER_TAGS = {"not applicable", "n a", "none", "unknown", "other"}
VAGUE_TAGS = {
    "love",
    "friend",
    "dog",
    "secret",
    "party",
    "party lifestyle",
    "audiobook",
    "contemporary",
    "good times",
    "understanding",
    "personal experience",
    "independence",
    "battles",
    "triumph",
    "societal challenges",
    "life challenges",
    "entertainment",
    "entertaining",
}
PHRASES = (
    "mental health",
    "left wing",
    "right wing",
    "african american",
    "asian american",
    "native american",
    "religion and spirituality",
    "street life",
)

TAG_TERMS = RELIGION | SEXUALITY | SEX | GENDER | ETHNICITY | HEALTH | WELLBEING | POLITICS | MONEY_TROUBLE | HARDSHIP
GENRE_TERMS = RELIGION | SEXUALITY | HEALTH | POLITICS | MONEY_TROUBLE
NAME_TERMS = (
    terms(
        "religion religious christianity catholic bible biblical gospel scripture jesus mosque synagogue islam "
        "islamic muslim judaism hinduism buddhism mormon lds worship prayer sermon"
    )
    | terms("lgbt lgbtq lgbtqia transgender erotic porn")
    | terms("racism racist racial whiteness blackness ethnicity ethnic")
    | POLITICS
    | HEALTH
    | MONEY_TROUBLE
)


def has_term(text: str, vocabulary: frozenset[str]) -> bool:
    plain = normalize(text)
    if any(phrase in plain for phrase in PHRASES):
        return True
    return any(word in vocabulary or (word.endswith("s") and word[:-1] in vocabulary) for word in plain.split())


def clean_tag_name(name: str) -> bool:
    plain = normalize(name)
    return bool(plain) and plain not in PLACEHOLDER_TAGS | VAGUE_TAGS and not has_term(name, TAG_TERMS)


def clean_name(name: str) -> bool:
    return bool(name.strip()) and not has_term(name, NAME_TERMS)


POLITICAL_ROLE = re.compile(
    r"\b(?:politic(?:s|al|ian)|senator|congress(?:man|woman|person)?|governor|mayor|states(?:man|woman|person)|"
    r"diplomat|ambassador (?:to|of)|government official|secretary of|prime minister|member of parliament|"
    r"president of the united states|\d+(?:st|nd|rd|th) president|"
    r"(?:u\.\s?s\.|united states|state) representative)\b",
    re.IGNORECASE,
)
CRIME = re.compile(r"\b(?:felon|convicted|convict|murderer|fraudster)\b", re.IGNORECASE)
OFF_LIMITS_OCCUPATIONS = {
    "politician",
    "statesperson",
    "diplomat",
    "governor",
    "political pundit",
    "political activist",
    "convict",
    "criminal",
}


def clean_person(entity: dict) -> bool:
    if description := english_description(entity):
        return not (POLITICAL_ROLE.search(description) or CRIME.search(description))
    return not {normalize(name) for name in occupations(entity)} & OFF_LIMITS_OCCUPATIONS


NEWS_ONLY = {"news", "podcasts", "news commentary", "daily news"}


def clean_entity(entity: dict) -> bool:
    if not clean_name(entity.get("name") or ""):
        return False
    genres = [tag for tag in entity.get("tags") or [] if str(tag.get("type", "")).startswith(GENRE_TAG_PREFIXES)]
    if any(has_term(tag.get("name") or "", GENRE_TERMS) for tag in genres):
        return False
    names = {normalize(tag.get("name") or "") for tag in genres}
    return not ("news" in names and names <= NEWS_ONLY)
