"""Day 1 spike: show -> audience map -> person candidates -> fit (A), love back (S), overlap (O)
and reach (R) for the top 10, plus explainability and compare checks.

Run from engine/:  uv run python scripts/spike.py "Show name" ["Show name" ...]   (full output: .cache/spike/)
"""

from __future__ import annotations

import asyncio
import json
import math
import statistics
import sys
import time

from echo_engine.config import get_settings
from echo_engine.qloo_client import QlooClient

DNA_TYPES = ["artist", "book", "movie", "brand", "podcast", "tv_show"]
DNA_TAKE = 20
CANDIDATE_TAKE = 50
SCORED = 10
HIDDEN_TAG_PREFIXES = ("urn:tag:gender",)  # never shown or used


def urn(kind: str) -> str:
    return f"urn:entity:{kind}"


def slim(entity: dict) -> dict:
    return {
        "id": entity["entity_id"],
        "name": entity["name"],
        "affinity": entity.get("query", {}).get("affinity"),
        "popularity": entity.get("popularity"),
    }


async def resolve(q: QlooClient, name: str) -> dict:
    results = await q.search(name, types=urn("podcast"), take=5)
    exact = [r for r in results if r["name"].lower() == name.lower()]
    best = (exact or results)[0]
    return {"id": best["entity_id"], "name": best["name"], "popularity": best.get("popularity")}


async def dna(q: QlooClient, entity_id: str, exclude: str | None = None) -> dict[str, list[dict]]:
    async def one(kind: str) -> list[dict]:
        params = {"filter.type": urn(kind), "signal.interests.entities": entity_id, "take": DNA_TAKE}
        if exclude and kind == "podcast":
            params["filter.exclude.entities"] = exclude
        data = await q.insights(params)
        return [slim(e) for e in data["results"]["entities"]]

    lists = await asyncio.gather(*(one(kind) for kind in DNA_TYPES))
    return dict(zip(DNA_TYPES, lists, strict=True))


def overlap(a: dict[str, list[dict]], b: dict[str, list[dict]]) -> float:
    """Mean Jaccard overlap of the top-N entity sets, per entity type."""
    scores = []
    for kind in DNA_TYPES:
        sa, sb = {e["id"] for e in a[kind]}, {e["id"] for e in b[kind]}
        if sa or sb:
            scores.append(len(sa & sb) / len(sa | sb))
    return sum(scores) / len(scores) if scores else 0.0


def sweet_spot(a: float, s: float, o: float, r: float) -> float:
    """The brief's starting formula; tuned on the backtest later."""
    return (a**0.4) * (s**0.3) * (max(r, 1e-6) ** 0.3) * math.exp(-((o - 0.35) ** 2) / 0.05)


async def stickiness(q: QlooClient, candidate_id: str, show_id: str) -> float | None:
    data = await q.insights(
        {
            "filter.type": urn("podcast"),
            "signal.interests.entities": candidate_id,
            "filter.results.entities": show_id,
        }
    )
    entities = data["results"]["entities"]
    return entities[0]["query"]["affinity"] if entities else None


async def compare(q: QlooClient, show_id: str, candidate_id: str) -> dict:
    data = await q.get(
        "/v2/analysis/compare",
        {
            "a.signal.interests.entities": show_id,
            "b.signal.interests.entities": candidate_id,
        },
    )
    res = data["results"]

    def names(tags: list[dict]) -> list[str]:
        return [t["name"] for t in tags if not t.get("subtype", "").startswith(HIDDEN_TAG_PREFIXES)]

    return {
        "shared": names(res.get("tags", [])),
        "show_only": names(res.get("a", []))[:8],
        "guest_only": names(res.get("b", []))[:8],
    }


async def explainability_test(q: QlooClient, show: dict, show_dna: dict[str, list[dict]]) -> dict:
    signals = [show["id"]] + [show_dna[kind][0]["id"] for kind in DNA_TYPES if show_dna[kind]]
    names = {show["id"]: show["name"]} | {
        show_dna[k][0]["id"]: show_dna[k][0]["name"] for k in DNA_TYPES if show_dna[k]
    }
    data = await q.insights(
        {
            "filter.type": urn("person"),
            "signal.interests.entities": signals,
            "feature.explainability": True,
            "take": 10,
        }
    )
    rows, spreads = [], []
    for e in data["results"]["entities"]:
        contrib = e.get("query", {}).get("explainability", {}).get("signal.interests.entities", [])
        scores = [c["score"] for c in contrib]
        if scores:
            spreads.append(max(scores) - min(scores))
        top = max(contrib, key=lambda c: c["score"]) if contrib else None
        rows.append(
            {
                "name": e["name"],
                "top_driver": names.get(top["entity_id"]) if top else None,
                "contributions": len(contrib),
            }
        )
    return {
        "signals": [names[s] for s in signals],
        "rows": rows,
        "mean_spread": statistics.mean(spreads) if spreads else None,
    }


async def run_show(q: QlooClient, name: str) -> dict:
    show = await resolve(q, name)
    show_dna = await dna(q, show["id"], exclude=show["id"])

    people = await q.insights(
        {"filter.type": urn("person"), "signal.interests.entities": show["id"], "take": CANDIDATE_TAKE}
    )
    candidates = []
    for e in people["results"]["entities"]:
        occupations = [t["name"] for t in e.get("tags", []) if t.get("type", "").startswith("urn:tag:occupation")]
        candidates.append(slim(e) | {"occupations": occupations[:3]})

    async def score(c: dict) -> dict:
        s, c_dna, cmp = await asyncio.gather(
            stickiness(q, c["id"], show["id"]), dna(q, c["id"]), compare(q, show["id"], c["id"])
        )
        o = overlap(show_dna, c_dna)
        r = (c["popularity"] or 0) * (1 - o)
        show_pods = {p["id"] for p in show_dna["podcast"]} | {show["id"]}
        new_pods = [p["name"] for p in c_dna["podcast"] if p["id"] not in show_pods][:5]
        return c | {
            "S": s,
            "O": o,
            "R": r,
            "score": sweet_spot(c["affinity"], s or 0, o, r),
            "new_podcasts": new_pods,
            "compare": cmp,
            "dna": c_dna,
        }

    scored = await asyncio.gather(*(score(c) for c in candidates[:SCORED]))
    explain = await explainability_test(q, show, show_dna)
    return {"show": show, "dna": show_dna, "candidates": candidates, "scored": scored, "explainability": explain}


def spread(values: list[float]) -> str:
    values = [v for v in values if v is not None]
    if not values:
        return "n/a"
    return f"min {min(values):.3f}  max {max(values):.3f}  sd {statistics.pstdev(values):.3f}"


def report(result: dict, seconds: float, calls: int, cached: int) -> None:
    show = result["show"]
    print(f"\n{'=' * 100}\n{show['name']}  ({show['id']}, popularity {show['popularity']:.3f})")
    print(f"{calls} Qloo calls ({cached} from cache) in {seconds:.1f}s")

    print("\nAudience DNA (top 5 per type):")
    for kind, items in result["dna"].items():
        print(f"  {kind:<8} " + ", ".join(i["name"] for i in items[:5]))

    print("\nTop 20 person candidates (fit = show audience -> person):")
    for i, c in enumerate(result["candidates"][:20], 1):
        occupations = ", ".join(c["occupations"])
        print(f"  {i:>2}. {c['name']:<28} fit {c['affinity']:.3f}  pop {c['popularity']:.2f}  {occupations}")

    print("\nScored top 10:")
    print(f"  {'name':<26}{'fit':>7}{'love':>7}{'O':>7}{'reach':>7}{'score':>8}   new podcasts the guest brings")
    for c in sorted(result["scored"], key=lambda c: -c["score"]):
        s = f"{c['S']:.3f}" if c["S"] is not None else "  n/a"
        scores = f"{c['affinity']:>7.3f}{s:>7}{c['O']:>7.3f}{c['R']:>7.3f}{c['score']:>8.3f}"
        print(f"  {c['name']:<26}{scores}   {', '.join(c['new_podcasts'][:3])}")
    print(f"\n  love back spread: {spread([c['S'] for c in result['scored']])}")
    print(f"  overlap spread: {spread([c['O'] for c in result['scored']])}")
    print(f"  fit spread: {spread([c['affinity'] for c in result['scored']])}")

    top = max(result["scored"], key=lambda c: c["score"])
    cmp = top["compare"]
    print(f"\n  Compare for {top['name']}: shared {cmp['shared']}; guest-only {cmp['guest_only'][:5]}")

    ex = result["explainability"]
    print(f"\nExplainability with {len(ex['signals'])} signals ({', '.join(ex['signals'])}):")
    print(
        f"  mean spread between strongest and weakest driver: {ex['mean_spread']:.3f}"
        if ex["mean_spread"] is not None
        else "  no explainability returned"
    )
    for row in ex["rows"][:5]:
        print(f"  {row['name']:<26} top driver: {row['top_driver']}")


async def main(shows: list[str]) -> None:
    out_dir = get_settings().cache_dir / "spike"
    out_dir.mkdir(parents=True, exist_ok=True)
    async with QlooClient.from_settings() as q:
        for name in shows:
            before = len(q.log)
            started = time.monotonic()
            result = await run_show(q, name)
            calls = q.log[before:]
            report(result, time.monotonic() - started, len(calls), sum(c.cached for c in calls))
            slug = "".join(ch if ch.isalnum() else "_" for ch in name.lower())
            (out_dir / f"{slug}.json").write_text(json.dumps(result, indent=1))
    print(f"\nFull results saved under {out_dir} (private, gitignored).")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1:]))
