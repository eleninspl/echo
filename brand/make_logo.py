"""Generate the Echo logo SVGs: a source ring wrapped by tapered, swirling echo arcs.

Run: python brand/make_logo.py  (writes logo-mark.svg and logo-icon.svg next to this file)
"""

from math import cos, pi, radians, sin
from pathlib import Path

OUT = Path(__file__).parent

BLUE = "#3D7BFF"
BLACK = "#05070D"

RING = {"c": (100, 262), "r": 53, "width": 23}
# (centre x, centre y, radius, start deg, end deg, width, taper). Angles are math-style
# (0 = right, counter-clockwise). Centres are slightly offset so the arcs swirl around the ring.
# radius may be a (start, end) pair, which makes the arc a spiral that widens as it goes.
# taper "end": cut flat at the start and fades to a point at the end, like a comet trail;
# taper "both": a thin crescent that fades at both ends.
ARCS = [
    (100, 262, 87, 222, 345, 18, "end"),  # hugs under the ring
    (112, 265, (122, 152), 262, 460, 18, "end"),  # spiral: up the right side and over the top
    (105, 258, 177, 312, 385, 18, "end"),
    (115, 270, 204, 0, 145, 21, "end"),  # big outer sweep over the top
]
STEPS = 180
MARGIN = 40


def profile(u: float, taper: str) -> float:
    """Width factor (0..1) along the arc at position u (0 = start, 1 = end)."""
    if taper == "both":
        return sin(pi * u)
    t = 1 - u if taper == "end" else u
    return sin(pi / 2 * min(1.0, t / 0.55))


def crescent(
    cx: float, cy: float, r: float | tuple[float, float], start: float, end: float, width: float, taper: str
) -> list[tuple[float, float]]:
    """Polygon for an arc of the given width, shaped along its length by `profile`.

    The outer edge stays a perfect circle and only the inner edge moves in, so the arc reads
    as one continuous curve (a crescent) rather than bending where it starts to taper.
    """
    r0, r1 = r if isinstance(r, tuple) else (r, r)
    outer, inner = [], []
    for i in range(STEPS + 1):
        u = i / STEPS
        a = radians(start + (end - start) * u)
        ro = r0 + (r1 - r0) * u + width / 2
        ri = ro - max(0.4, width * profile(u, taper))
        outer.append((cx + ro * cos(a), cy - ro * sin(a)))
        inner.append((cx + ri * cos(a), cy - ri * sin(a)))
    return outer + inner[::-1]


def fit(shapes: list[list[tuple[float, float]]]) -> str:
    """SVG transform that centres the mark's bounding box in the 512 canvas with a margin."""
    xs = [x for s in shapes for x, _ in s]
    ys = [y for s in shapes for _, y in s]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    scale = (512 - 2 * MARGIN) / max(w, h)
    tx = (512 - w * scale) / 2 - min(xs) * scale
    ty = (512 - h * scale) / 2 - min(ys) * scale
    return f"translate({tx:.2f} {ty:.2f}) scale({scale:.4f})"


def mark(color: str) -> str:
    shapes = [crescent(*a) for a in ARCS]
    (cx, cy), r, rw = RING["c"], RING["r"], RING["width"]
    ring_box = [(cx - r - rw / 2, cy - r - rw / 2), (cx + r + rw / 2, cy + r + rw / 2)]
    paths = [
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="{rw}"/>',
        *(
            '<path d="M ' + " L ".join(f"{x:.2f} {y:.2f}" for x, y in s) + f' Z" fill="{color}"/>'
            for s in shapes
        ),
    ]
    body = "\n    ".join(paths)
    return f'<g transform="{fit(shapes + [ring_box])}">\n    {body}\n  </g>'


def svg(body: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Echo">\n'
        f"  {body}\n</svg>\n"
    )


def main() -> None:
    (OUT / "logo-mark.svg").write_text(svg(mark(BLUE)))
    (OUT / "logo-icon.svg").write_text(svg(f'<rect width="512" height="512" rx="112" fill="{BLACK}"/>\n  {mark(BLUE)}'))


if __name__ == "__main__":
    main()
