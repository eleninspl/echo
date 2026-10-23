from datetime import date

from echo_engine import scoring
from echo_engine.cleanup import dedupe, host_matcher, is_minor, is_public_figure, normalize
from echo_engine.screen import clean_entity, clean_name, clean_tag_name


def test_normalize_handles_accents_quotes_and_ampersands():
    assert normalize("Ann O’Example") == "ann oexample"
    assert normalize("Ann & Bo Sample") == "ann and bo sample"
    assert normalize("Beyoncé") == "beyonce"


def test_hosts_from_author_line_and_title():
    by_author = host_matcher("Example Show", "Ann Example, Bo Sample, Cy Person")
    assert by_author("Bo Sample") and not by_author("Bo Other")
    by_title = host_matcher("Example Talk with Dee & Eli Surname", "Example Network")
    assert by_title("Dee Surname") and by_title("Eli Surname")
    assert not by_title("Dee Different") and not by_title("Eli Other")
    by_names = host_matcher("Example Pod with Fenwick, Gareth, Harlow & Ingram", None)
    assert by_names("Paul Harlow") and by_names("Fenwick Jones")
    assert not by_names("Somebody Else")
    in_title = host_matcher("The Ann Example Podcast", None)
    assert in_title("Ann Example") and not in_title("Ann Other")


def test_public_figures_minors_and_duplicates():
    assert is_public_figure({"tags": [{"type": "urn:tag:occupation:person"}]})
    assert is_public_figure({"external": {"imdb_id": [{"id": "nm1"}]}})
    assert not is_public_figure({"external": {"twitter_username": [{"id": "x"}]}})
    assert is_minor({"properties": {"date_of_birth": "2015-06-01"}}, date(2026, 10, 23))
    assert not is_minor({"properties": {"date_of_birth": "1990"}}, date(2026, 10, 23))
    assert not is_minor({}, date(2026, 10, 23))
    people = [{"name": "Ann Example"}, {"name": "ann example"}, {"name": "Bo Sample"}]
    assert [p["name"] for p in dedupe(people)] == ["Ann Example", "Bo Sample"]


def genre(name: str) -> dict:
    return {"name": "Example Pod", "tags": [{"name": name, "type": "urn:tag:genre:media"}]}


def test_screen_keeps_ordinary_culture_and_drops_sensitive_signals():
    assert clean_tag_name("Road trips") and not clean_tag_name("Religion") and not clean_tag_name("female protagonist")
    assert clean_name("Example Rock Band") and clean_name("Faith Example") and clean_name("Example Church")
    assert not clean_name("Example Politics Hour") and not clean_name("A Book About Example Trump's Years")
    assert not clean_entity(genre("Politics")) and not clean_entity(genre("Religion & Spirituality"))
    assert clean_entity(genre("Comedy")) and clean_entity(genre("Progressive Rock"))
    keyword = {"name": "Example Film", "tags": [{"name": "Pregnancy", "type": "urn:tag:keyword:media"}]}
    assert clean_entity(keyword)
    news = {"name": "Example Hour", "tags": [{"name": n, "type": "urn:tag:genre:media"} for n in ("Podcasts", "News")]}
    assert not clean_entity(news)
    news["tags"].append({"name": "Comedy", "type": "urn:tag:genre:media"})
    assert clean_entity(news)


def test_percentiles_and_fame_adjustment():
    assert scoring.percentiles([0.1, 0.3, 0.2, None]) == [0.0, 1.0, 0.5, None]
    assert scoring.percentiles([0.4]) == [0.5]
    popularity = [0.1 * i for i in range(10)]
    fit = [0.5 + 0.2 * p for p in popularity]
    assert all(abs(v) < 1e-9 for v in scoring.fame_adjusted(fit, popularity))
    assert scoring.fame_adjusted([0.3, 0.2], [0.1, 0.9]) == [0.3, 0.2]


def test_reach_needs_five_scored_podcasts():
    assert scoring.reach_raw([0.9, 0.8, None, None, None, None]) is None
    assert abs(scoring.reach_raw([0.9, 0.8, 0.7, 0.6, 0.5]) - 0.3) < 1e-9


def test_echo_score_and_labels():
    assert abs(scoring.echo_score(1, 1, 1) - 1) < 1e-9
    assert scoring.echo_score(1, 1, 0) < scoring.echo_score(0.6, 0.6, 0.6)
    assert scoring.label(0.6, 0.4, 0.4) == "sweet_spot"
    assert scoring.label(0.6, 0.2, 0.8) == "far"
    assert scoring.label(0.2, 0.9, 0.5) == "long_shot"
    assert scoring.label(0.6, 0.9, 0.1) == "safe"
    assert scoring.label(0.4, 0.4, 0.5) == "balanced"
    assert scoring.label(0.6, 0.6, None) == "sweet_spot"
    assert scoring.label(0.6, 0.4, None) == "balanced"


def test_anchor_tilts_the_echo_score():
    plain = scoring.echo_score(0.5, 0.5, 0.5)
    assert scoring.echo_score(0.5, 0.5, 0.5, 1.0) > plain > scoring.echo_score(0.5, 0.5, 0.5, 0.0)
    assert abs(scoring.echo_score(0.5, 0.5, 0.5, 0.5) - plain) < 1e-9
