from collections import Counter
from datetime import date

from echo_engine import scoring
from echo_engine.cleanup import dedupe, host_matcher, is_minor, is_public_figure, normalize
from echo_engine.pipeline import LoveBack, new_podcasts, past_guest_ids, reach_width, shared_tastes
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
    in_description = host_matcher("Example Take", "Example Network", "Ann Example and Bo Sample talk sports.")
    assert in_description("Bo Sample") and in_description("Ann Example")
    assert not in_description("Bo Other") and not in_description("Sample")


def test_public_figures_minors_and_duplicates():
    assert is_public_figure({"tags": [{"type": "urn:tag:occupation:person"}]})
    assert is_public_figure({"external": {"imdb_id": [{"id": "nm1"}]}})
    assert not is_public_figure({"external": {"twitter_username": [{"id": "x"}]}})
    assert is_minor({"properties": {"date_of_birth": "2015-06-01"}}, date(2026, 10, 23))
    assert not is_minor({"properties": {"date_of_birth": "1990"}}, date(2026, 10, 23))
    assert not is_minor({}, date(2026, 10, 23))
    people = [{"name": "Ann Example", "a": 0.5}, {"name": "Bo Sample", "a": 0.7}, {"name": "ann example", "a": 0.9}]
    assert [p["name"] for p in dedupe(people, lambda p: p["a"])] == ["ann example", "Bo Sample"]


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


def test_reach_width_grows_only_while_the_lens_needs_no_more_calls():
    alike = [[f"p{i}" for i in range(50)] for _ in range(20)]
    assert reach_width(alike) == 50  # one world: the same 50 podcasts fit one call at any width
    apart = [[f"g{g}p{i}" for i in range(50)] for g in range(20)]
    assert reach_width(apart) == 10  # 200 podcasts already need 4 calls; 11 each would need 5
    shifted = [[f"p{g + i}" for i in range(50)] for g in range(20)]
    assert reach_width(shifted) == 31  # p0 to p49 fill one call
    assert reach_width([["p1", "p2"]]) == 10


def test_new_podcasts_prefer_what_few_other_guests_have():
    love = LoveBack(0.5, None, ["a", "b", "c", "d", "e"], {p: p.upper() for p in "abcde"})
    scores = {"a": 0.1, "b": 0.2, "c": 0.9, "d": 0.8, "e": 0.05}
    shared_by = Counter({"a": 9, "b": 9, "c": 1, "d": 1, "e": 1})
    assert new_podcasts(love, 4, scores, shared_by) == ["D", "C", "A"]  # e is beyond the width


def test_shared_tastes_put_tags_most_guests_share_last():
    tags = [{"tag_id": t, "name": t.title()} for t in ("common", "rare", "elsewhere", "later")]
    show_ranks = {"common": 0, "rare": 5, "later": 9}
    assert shared_tastes(show_ranks, tags, {"common"}) == ["Rare", "Later", "Common"]


def test_past_guests_skip_trailers_and_cross_promotions():
    pool = [{"entity_id": f"p{i}", "name": name} for i, name in enumerate(["Ann Example", "Bo Sample", "Cy Person"])]
    titles = [
        "INTRODUCING: Another Show with Ann Example",
        "Trailer - Bo Sample's new series",
        "Preview of Season 2, with Cy Person",
        "Cy Person Returns",
        "Introductions: a talk about Bo Sample",
    ]
    assert past_guest_ids(titles, pool) == {"p1", "p2"}
