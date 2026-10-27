from collections.abc import Sequence
from statistics import fmean

from .models import Label

EPSILON = 0.05
ANCHOR_WEIGHT = 0.35
MIN_REACH_SCORED = 5
MIN_POOL_FOR_FAME_ADJUSTMENT = 8


def percentiles(values: Sequence[float | None]) -> list[float | None]:
    known = [v for v in values if v is not None]
    if len(known) == 1:
        return [0.5 if v is not None else None for v in values]
    return [None if v is None else sum(1 for k in known if k < v) / (len(known) - 1) for v in values]


def fame_adjusted(fit: Sequence[float], popularity: Sequence[float]) -> list[float]:
    if len(fit) < MIN_POOL_FOR_FAME_ADJUSTMENT:
        return list(fit)
    mean_pop, mean_fit = fmean(popularity), fmean(fit)
    spread = sum((p - mean_pop) ** 2 for p in popularity)
    if spread == 0:
        return list(fit)
    slope = sum((p - mean_pop) * (f - mean_fit) for p, f in zip(popularity, fit, strict=True)) / spread
    intercept = mean_fit - slope * mean_pop
    return [f - (intercept + slope * p) for f, p in zip(fit, popularity, strict=True)]


def reach_raw(show_affinities: Sequence[float | None]) -> float | None:
    scored = [a for a in show_affinities if a is not None]
    if len(scored) < MIN_REACH_SCORED:
        return None
    return 1 - fmean(scored)


def echo_score(fit_pct: float, love_pct: float, reach_pct: float | None, anchor_pct: float | None = None) -> float:
    reach = 0.5 if reach_pct is None else reach_pct
    product = (fit_pct + EPSILON) * (love_pct + EPSILON) * (reach + EPSILON)
    if anchor_pct is None:
        return product ** (1 / 3) / (1 + EPSILON)
    return (product ** ((1 - ANCHOR_WEIGHT) / 3) * (anchor_pct + EPSILON) ** ANCHOR_WEIGHT) / (1 + EPSILON)


def label(fit_pct: float, love_pct: float, reach_pct: float | None) -> Label:
    if reach_pct is None:
        if fit_pct >= 0.5 and love_pct >= 0.5:
            return "sweet_spot"
        return "long_shot" if fit_pct < 0.33 else "balanced"
    if fit_pct >= 0.5 and reach_pct >= 0.33:
        return "sweet_spot" if love_pct >= 0.33 else "far"
    if fit_pct < 0.33:
        return "long_shot"
    if reach_pct < 0.33:
        return "safe"
    return "balanced"
