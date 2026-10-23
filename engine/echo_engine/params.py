"""Qloo silently ignores parameters that are invalid for a filter.type, so every Insights call is
checked against the documented list (https://docs.qloo.com/reference/available-parameters-by-entity-type).
Demographic signals and person-attribute filters are always rejected (privacy rule)."""

ENTITY_TYPES = {
    "artist",
    "book",
    "brand",
    "destination",
    "movie",
    "person",
    "place",
    "podcast",
    "tv_show",
    "videogame",
}

# Listed for every entity type we use.
_COMMON = {
    "filter.type",
    "filter.exclude.entities",
    "filter.exclude.tags",
    "filter.external.exists",
    "filter.parents.types",
    "filter.popularity.min",
    "filter.popularity.max",
    "filter.results.entities",
    "filter.results.entities.query",
    "filter.tags",
    "operator.exclude.tags",
    "operator.filter.external.exists",
    "operator.filter.tags",
    "bias.trends",
    "signal.interests.entities",
    "signal.interests.tags",
    "offset",
    "take",
    # Listed as "all entity types" in the Parameter reference.
    "feature.explainability",
    "page",
    "sort_by",
    "filter.results.tags",
    "signal.interests.entities.weight",
    "signal.demographics.age",
    "signal.location.query",
}

_EXTRA = {
    "book": {"filter.publication_year.min", "filter.publication_year.max"},
    "movie": {
        "filter.content_rating",
        "filter.release_year.min",
        "filter.release_year.max",
        "filter.release_country",
        "operator.filter.release_country",
        "filter.rating.min",
        "filter.rating.max",
    },
    "tv_show": {
        "filter.content_rating",
        "filter.finale_year.min",
        "filter.finale_year.max",
        "filter.latest_known_year.min",
        "filter.latest_known_year.max",
        "filter.release_year.min",
        "filter.release_year.max",
        "filter.release_country",
        "operator.filter.release_country",
        "filter.rating.min",
        "filter.rating.max",
    },
}

ANALYSIS_TYPES = {
    "urn:tag": {"filter.type", "signal.interests.entities", "filter.tag.types", "filter.parents.types", "take", "page"},
    "urn:demographics": {"filter.type", "signal.interests.entities"},
}

# Valid in Qloo, but Echo never sends them: no gender or audience-segment signals, and no
# filtering of people by personal attributes. An age bucket is allowed as a "grow toward" signal.
FORBIDDEN_PREFIXES = (
    "signal.demographics.gender",
    "signal.demographics.audiences",
    "filter.gender",
    "filter.date_of_birth",
    "filter.date_of_death",
)


class InvalidParamError(ValueError):
    pass


def allowed_params(entity_type: str) -> set[str]:
    if entity_type not in ENTITY_TYPES:
        raise InvalidParamError(f"unknown entity type {entity_type!r}")
    return _COMMON | _EXTRA.get(entity_type, set())


def check_insights_params(params: dict[str, object]) -> None:
    urn = params.get("filter.type")
    if isinstance(urn, str) and urn in ANALYSIS_TYPES:
        allowed = ANALYSIS_TYPES[urn]
    elif isinstance(urn, str) and urn.startswith("urn:entity:"):
        allowed = allowed_params(urn.removeprefix("urn:entity:"))
    else:
        raise InvalidParamError("filter.type must be a urn:entity:* value, urn:tag or urn:demographics")
    for name in params:
        if name.startswith(FORBIDDEN_PREFIXES):
            raise InvalidParamError(f"{name} is never sent by Echo (privacy rule)")
        if name not in allowed:
            raise InvalidParamError(f"{name} is not a documented parameter for {urn}")
