from collections import Counter
from datetime import UTC, date, datetime

from echo_engine import apple, scoring
from echo_engine.cleanup import dedupe, host_matcher, is_dead, is_minor, is_public_figure, normalize, person_description
from echo_engine.models import Show
from echo_engine.pipeline import (
    LoveBack,
    bio_of,
    guest_description,
    known_facts,
    links_of,
    matches_search,
    new_podcasts,
    past_guest_ids,
    reach_width,
    shared_podcasts,
    shared_tags,
    shared_tastes,
)
from echo_engine.screen import clean_entity, clean_name, clean_person, clean_tag_name
from echo_engine.wikidata import confirmed, queries

TODAY = datetime(2026, 10, 26, tzinfo=UTC)


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


def described(text: str, born: str | None = None) -> dict:
    properties = {"short_descriptions": [{"language": "en", "value": text}]}
    return {"name": "Ann Example", "properties": {**properties, "date_of_birth": born} if born else properties}


def test_descriptions_never_show_a_birth_year():
    for text in (
        "American actor, comedian, writer (born 1970)",
        "Canadian actor (b. 1963)",
        "English footballer born 1991",
        "American comedian (1970-)",
        "American poet 1898-1980",
    ):
        cleaned = person_description(described(text))
        assert cleaned and not any(ch.isdigit() for ch in cleaned), (text, cleaned)
    assert person_description(described("American actor, comedian, writer (born 1970)")) == (
        "American actor, comedian, writer"
    )
    assert person_description(described("Computer scientist, Ph.D. 2017")) == "Computer scientist, Ph.D. 2017"
    assert person_description(described("researcher")) is None
    assert person_description(described("researcher (ORCID 0000-0003-0000-0000)")) is None
    jobs = [
        {"type": "urn:tag:occupation:person", "name": n} for n in ("Lawyer", "Reality Television Participant", "Dj")
    ]
    assert person_description({"name": "Ann Example", "tags": jobs}) == "Lawyer and reality television participant"


def test_a_lifespan_in_the_description_means_they_have_died():
    assert is_dead({"properties": {"date_of_death": "2021-12-31"}})
    assert is_dead(described("American actor (1929–2021)", born="1929-11-15"))
    assert is_dead(described("American poet 1898-1980"))
    assert not is_dead(described("American actor (1929–2021)", born="1975-01-01"))
    assert not is_dead(described("Ambassador of Example (2013–2017)"))
    assert not is_dead(described("American actor (born 1970)", born="1970"))


def test_politicians_and_convicts_are_never_suggested():
    for text in (
        "American politician",
        "United States Representative from New York since 2019",
        "U.S. Representative from California",
        "President of the United States from 1993 to 2001",
        "American television news host and political commentator",
        "American entrepreneur, attorney and political candidate",
        "United States Secretary of Transportation since 2021",
        "American football player and felon",
        "Entrepreneur convicted of fraud",
    ):
        assert not clean_person(described(text)), text
    for text in (
        "American stand-up comedian and television host",
        "American investor and entrepreneur",
        "American comedian, writer, producer, activist, and television host",
        "Sports executive, president of an example team",
        "Brand ambassador and model",
    ):
        assert clean_person(described(text)), text
    tagged = {"name": "Ann Example", "tags": [{"type": "urn:tag:occupation:person", "name": "Politician"}]}
    assert not clean_person(tagged)
    assert clean_person({**tagged, **described("American investor")})
    assert not clean_tag_name("Occultism") and not clean_tag_name("Anti-Religion")


def test_the_screen_drops_stereotypes_and_tags_that_say_nothing():
    for name in ("Social Inequality", "Poverty", "Street Life", "Hustling", "Totalitarianism", "Patriotism"):
        assert not clean_tag_name(name), name
    for name in ("teenage girl", "boy", "love", "Audiobook", "Contemporary", "Good Times", "Societal Challenges"):
        assert not clean_tag_name(name), name
    for name in ("Sports Analysis", "satire comedy", "Small Town Life", "Basketball", "Friendship", "Humor"):
        assert clean_tag_name(name), name
    assert not clean_name("A Book About Whiteness") and clean_name("Black Mirror")
    assert not clean_name("Why Progressives Ruin Example City") and not clean_name("How Covid Changed Example Town")
    assert clean_entity(genre("Progressive Rock"))


def test_the_death_check_asks_wikidata_by_id_or_by_name_and_birth_year():
    people = [
        {"entity_id": "A", "name": "Ann Example", "external": {"imdb_id": [{"id": "nm1"}]}},
        {"entity_id": "B", "name": 'Bo "The Quote" Sample', "properties": {"date_of_birth": "1942-03-28"}},
        {"entity_id": "C", "name": "Cy Nobody"},
    ]
    by_id, by_name = queries(people)
    assert '("A" "nm1")' in by_id and "wdt:P345" in by_id and "wdt:P570" in by_id
    assert '("B" "Bo \\"The Quote\\" Sample"@en 1942)' in by_name
    assert '"C"' not in by_id + by_name
    assert queries([people[2]]) == []
    rows = [["A", None], ["B", "1942-03-28T00:00:00Z"], ["B", "1950-01-01T00:00:00Z"], ["X", None]]
    assert confirmed(people, rows) == {"A", "B"}
    assert confirmed(people, [["B", "1950-01-01T00:00:00Z"]]) == set()
    assert confirmed(people, [["B", "1942-10-14T00:00:00Z"]]) == set()
    assert confirmed(people, [["B", "1942-01-01T00:00:00Z"]]) == {"B"}


def genre(name: str) -> dict:
    return {"name": "Example Pod", "tags": [{"name": name, "type": "urn:tag:genre:media"}]}


def test_screen_keeps_ordinary_culture_and_drops_sensitive_signals():
    assert clean_tag_name("Road trips") and not clean_tag_name("Religion") and not clean_tag_name("female protagonist")
    assert clean_name("Example Rock Band") and clean_name("Faith Example") and clean_name("Example Church")
    assert not clean_name("Example Politics Hour") and not clean_name("A Book About Example Trump's Years")
    assert not clean_entity(genre("Politics")) and not clean_entity(genre("Religion & Spirituality"))
    assert clean_entity(genre("Comedy")) and clean_entity(genre("Progressive Rock"))


def test_screen_drops_titles_about_a_people_or_a_conflict():
    for name in (
        "An Example Guide to Anti-Semitism",
        "Antisemitism: An Example History",
        "Example Letters to a Palestinian Friend",
        "Example Israel: A Short Account",
        "The Example Jewish Cookbook",
    ):
        assert not clean_name(name), name


def test_screen_drops_hardship_tags_but_keeps_their_neighbours():
    for name in ("Suffering", "Inner Struggle", "Social Alienation", "Grief", "Drug Use", "Not Applicable", "N/A"):
        assert not clean_tag_name(name), name
    for name in ("Friendship", "Dance", "Youth Rebellion", "Television Production"):
        assert clean_tag_name(name), name
    assert clean_name("Example Struggle Band")


def test_screen_drops_social_and_gender_tags_but_not_names_with_those_words():
    for name in ("Social Justice", "Social Inequality", "Poverty", "Patriotism", "Femininity", "Violence"):
        assert not clean_tag_name(name), name
    assert clean_name("Example Justice Band") and clean_name("Poverty Example Film")
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


def test_new_podcasts_leave_out_those_shown_as_shared():
    love = LoveBack(0.5, None, ["a", "b", "c"], {p: p.upper() for p in "abc"})
    scores = {"a": 0.1, "b": 0.2, "c": 0.9}
    assert new_podcasts(love, 3, scores, Counter(), ["a"]) == ["B", "C"]


def test_shared_tags_drop_what_most_guests_have_and_put_rare_ones_first():
    names = ("Common", "broad", "rare", "elsewhere", "later")
    tags = [{"tag_id": f"urn:tag:keyword:media:{n.lower()}", "name": n} for n in names]
    show_ranks = {tag["tag_id"]: rank for rank, tag in zip((0, 1, 6, None, 2), tags, strict=True) if rank is not None}
    # Common is on 6 of the 10 guests' lists, broad on 5 (counted by name, so "common" on another list counts).
    guests = Counter({"common": 6, "broad": 5, "rare": 1, "later": 5})
    # Ranks: broad 1 + 1, rare 6 + 2, later 2 + 4. Times the guests with it: broad 15, rare 9, later 35.
    assert shared_tags(show_ranks, tags, guests, 10) == ["rare", "broad", "later"]
    everywhere = Counter({"common": 9, "broad": 9, "rare": 9, "later": 9})
    assert shared_tags(show_ranks, tags, everywhere, 10) == ["Common", "broad"]


def test_shared_podcasts_are_loved_by_the_show_and_rare_among_the_top_guests():
    love = LoveBack(0.5, None, ["a", "b", "c", "d", "e", "f"], {p: p.upper() for p in "abcdef"} | {"f": "Politics Now"})
    # The show's affinities for every guest's podcasts: the top half starts at 0.6.
    scores = {"a": 0.9, "b": 0.8, "c": 0.7, "d": 0.2, "e": 0.95, "f": 0.99, "x": 0.1, "y": 0.6, "z": 0.3, "w": 0.4}
    top_guests = Counter({"a": 4, "b": 1, "c": 2, "d": 1, "e": 1, "f": 1})
    # a is on more than a third of the 10 lists, d isn't loved by the show, e is beyond the width, f is screened.
    assert shared_podcasts(love, 4, scores, top_guests, 10) == ["b", "c"]


def test_shared_podcasts_fill_in_with_the_guests_strongest_loved_ones_shown_on_no_other_card():
    love = LoveBack(0.5, None, ["a", "b", "c", "d"], {p: p.upper() for p in "abcd"})
    # The top half of the show's affinities starts at 0.7: b isn't loved.
    scores = {"a": 0.9, "b": 0.2, "c": 0.8, "d": 0.7, "x": 0.1, "y": 0.6}
    everyone = Counter({p: 10 for p in "abcd"})
    assert shared_podcasts(love, 4, scores, everyone, 10) == ["a", "c"]
    assert shared_podcasts(love, 4, scores, everyone, 10, shown={"a"}) == ["c", "d"]
    assert shared_podcasts(love, 4, scores, everyone, 10, shown={"a", "c", "d"}) == ["a", "c"]
    one_rare = Counter({"a": 10, "c": 10, "d": 1})
    assert shared_podcasts(love, 4, scores, one_rare, 10) == ["d", "a"]


def test_shared_tastes_put_named_podcasts_first_without_repeats():
    tastes = shared_tastes(["Ann's Podcast"], ["satire", "ann's podcast", "a", "b", "c"])
    assert tastes == ["Ann's Podcast", "Satire", "A", "B", "C"]


def test_shared_tastes_drop_near_repeats_and_capitalise_tags():
    tastes = shared_tastes(
        [], ["Business", "satire comedy", "satire", "Business Strategy", "rock 'n' roll", "iPhone Apps"]
    )
    assert tastes == ["Business", "Satire Comedy", "Rock 'n' Roll", "iPhone Apps"]


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


def test_older_titles_count_a_name_only_where_a_guest_is_named():
    names = ["Ann Example", "Bo Sample", "Cy Person", "Dee Other", "Eli Name", "Fay Doctor", "Gus Newsworthy"]
    pool = [{"entity_id": f"p{i}", "name": name} for i, name in enumerate(names)]
    older = [
        "Example Company: Ann Example (Part 1 of 2)",
        "Bo Sample on building things | E1234",
        "Cy Person of Example Co",
        "Why Dee Other's plan failed",
        "A conversation with Eli Name",
        "How to Build Things | Dr. Fay Doctor",
        "BREAKING: Gus Newsworthy steps down, and more | E99",
        "INTRODUCING: Dee Other",
    ]
    assert past_guest_ids([], pool, older) == {"p0", "p1", "p2", "p4", "p5"}
    assert past_guest_ids(["BREAKING: Gus Newsworthy steps down"], pool) == {"p6"}


def test_feed_titles_come_from_each_item():
    feed = (
        "<rss><channel><title>The Show</title>"
        "<item><itunes:title>Short</itunes:title><title><![CDATA[Ann Example: Part 1]]></title></item>"
        "<item><title>Bo &amp; Cy\n  Talk</title></item>"
        "<item><description>No title</description></item>"
        "<item><title>Cut off"
    )
    assert apple.item_titles(feed) == ["Ann Example: Part 1", "Bo & Cy Talk"]


def test_a_search_result_shares_a_word_with_the_query():
    show = Show(id="x", title="Example Interview Show", description="Comedians talk about road trips.")
    for q in ("example interview", "exampel", "exampleinterview", "road trip stories", "the show"):
        assert matches_search(show, q), q
    assert not matches_search(show, "qzxv show")
    assert not matches_search(show, "zzzz")


def invented_person(**props) -> dict:
    return {"entity_id": "p1", "name": "Ann Example", "properties": props, "external": {}}


def test_the_bio_is_built_from_work_facts_only():
    person = invented_person(
        notable_work=["Example Film", "Example Series", "Example Album", "Example Fourth Work"],
        award_received=["Example Prize", "Example Medal", "Example Third Award"],
        nominated_for=["Example Nomination"],
        employer=["Example Broadcasting"],
        work_period_start="1984-01-01",
    )
    assert bio_of(person, "comedian and actor", TODAY) == (
        "Comedian and actor. Known for Example Film, Example Series and Example Album. "
        "Received Example Prize and Example Medal. Has worked for Example Broadcasting."
    )
    nominated = invented_person(nominated_for=["Example Nomination"], work_period_start="1984-01-01")
    assert known_facts(nominated, TODAY) == ["Nominated for Example Nomination.", "Active since 1984."]
    teams = invented_person(
        member_of_sports_team=["Example United", "Example City"], instrument=["voice", "guitar", "keyboard instrument"]
    )
    assert known_facts(teams, TODAY) == [
        "Has played for Example United and Example City.",
        "Plays guitar and keyboard.",
    ]
    assert known_facts(invented_person(instrument=["voice"]), TODAY) == []


def test_the_bio_leaves_out_sensitive_facts_and_screened_names():
    person = invented_person(
        gender="female",
        date_of_birth="1970-02-03",
        citizenship=["Exampleland"],
        spouse=["Bo Spouse"],
        child=["Cy Child"],
        father=["Dee Father"],
        sibling=["Eli Sibling"],
        unmarried_partner=["Fay Partner"],
        lifestyle=["Example Lifestyle"],
        position_held=["Example Minister"],
        notable_work=["Example Politics Hour", "Example Film", "Ann Example", " ", "x" * 81, "example  film"],
    )
    bio = bio_of(person, "Writer (born 1970)", TODAY)
    assert bio == "Writer. Known for Example Film."
    for value in ("female", "1970", "Exampleland", "Bo", "Cy", "Dee", "Eli", "Fay", "Lifestyle", "Minister"):
        assert value not in bio
    # Only sensitive facts left: nothing beyond the description, so no bio.
    del person["properties"]["notable_work"]
    assert bio_of(person, "Writer", TODAY) is None


def test_a_lone_employer_is_left_out_of_a_businessperson_bio():
    one = invented_person(employer=["Example Search Co"])
    for description in ("American businessperson", "Example co-founder and investor", "Venture capitalist"):
        assert bio_of(one, description, TODAY) is None, description
    assert bio_of(one, "Journalist", TODAY) == "Journalist. Has worked for Example Search Co."
    two = invented_person(employer=["Example Search Co", "Example Pay Co"])
    assert bio_of(two, "Entrepreneur", TODAY) == "Entrepreneur. Has worked for Example Search Co and Example Pay Co."


def test_the_bio_skips_odd_values():
    person = invented_person(notable_work="Example Film", employer=[None, 3], work_period_start="2999-01-01")
    assert bio_of(person, "Writer", TODAY) is None
    assert bio_of(invented_person(notable_work=["Example Film"]), None, TODAY) == "Known for Example Film."


def test_the_website_is_an_http_link_only():
    assert links_of(invented_person(official_website=["https://example.com/ann"])) == {
        "website": "https://example.com/ann"
    }
    assert links_of(invented_person(official_website=["http://example.com"])) == {"website": "http://example.com"}
    for bad in (["javascript:alert(1)"], ["example.com"], ["https://"], ["https://exa mple.com"], [], None, [3]):
        assert "website" not in links_of(invented_person(official_website=bad))


def test_the_bio_screens_awards_that_say_who_someone_is():
    person = invented_person(
        award_received=["GLAAD Example Award", "Example Gay Film Prize", "NAACP Example Award", "Example Comedy Award"],
        employer=["Example Latino Network", "Example Studio"],
    )
    assert (
        bio_of(person, "Comedian", TODAY) == "Comedian. Received Example Comedy Award. Has worked for Example Studio."
    )


def test_a_description_that_names_who_someone_is_is_left_out():
    english = lambda text: invented_person(short_descriptions=[{"value": text, "language": "en"}])  # noqa: E731
    assert guest_description(english("Example comedian and podcaster")) == "Example comedian and podcaster"
    for text in ("Example transgender activist", "Example gay rights activist", "Example NAACP organizer"):
        assert guest_description(english(text)) is None, text
    assert guest_description(invented_person()) is None
