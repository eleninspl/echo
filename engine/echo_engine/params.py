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

# Valid in Qloo, but Echo never sends them: no demographic inference about anyone, and no
# filtering of people by personal attributes.
FORBIDDEN_PREFIXES = ("signal.demographics", "filter.gender", "filter.date_of_birth", "filter.date_of_death")


class InvalidParamError(ValueError):
    pass


def allowed_params(entity_type: str) -> set[str]:
    if entity_type not in ENTITY_TYPES:
        raise InvalidParamError(f"unknown entity type {entity_type!r}")
    return _COMMON | _EXTRA.get(entity_type, set())


def check_insights_params(params: dict[str, object]) -> None:
    urn = params.get("filter.type")
    if not isinstance(urn, str) or not urn.startswith("urn:entity:"):
        raise InvalidParamError("filter.type must be a urn:entity:* value")
    allowed = allowed_params(urn.removeprefix("urn:entity:"))
    for name in params:
        if name.startswith(FORBIDDEN_PREFIXES):
            raise InvalidParamError(f"{name} is never sent by Echo (privacy rule)")
        if name not in allowed:
            raise InvalidParamError(f"{name} is not a documented parameter for {urn}")
