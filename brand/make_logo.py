"""Generate the Echo logo SVGs: a source ring wrapped by tapered, swirling echo arcs.

Run: python brand/make_logo.py  (writes logo-mark.svg and logo-icon.svg next to this file)
"""

from math import cos, pi, radians, sin
from pathlib import Path

OUT = Path(__file__).parent

BLUE = "#3D7BFF"
BLACK = "#05070D"

RING = {"c": (200, 280), "r": 56, "width": 28}
# (centre x, centre y, radius, start deg, end deg, max width). Angles are math-style
# (0 = right, counter-clockwise). Centres are slightly offset so the arcs swirl instead of
# nesting like a Wi-Fi icon, and each arc tapers to points at both ends.
ARCS = [
    (215, 270, 104, 195, 335, 16),  # hugs under the ring
    (200, 272, 152, -65, 50, 20),
    (205, 268, 184, 28, 92, 8),  # thin accent near the top
    (196, 272, 218, -55, 62, 24),
    (186, 266, 262, -38, 132, 30),  # big outer sweep over the top
]
STEPS = 64
MARGIN = 40


def crescent(cx: float, cy: float, r: float, start: float, end: float, width: float) -> list[tuple[float, float]]:
    """Polygon for an arc whose width swells to `width` in the middle and tapers to ~0 at the ends."""
    outer, inner = [], []
    for i in range(STEPS + 1):
        u = i / STEPS
        a = radians(start + (end - start) * u)
        half = (0.6 + (width - 0.6) * sin(pi * u)) / 2
        outer.append((cx + (r + half) * cos(a), cy - (r + half) * sin(a)))
        inner.append((cx + (r - half) * cos(a), cy - (r - half) * sin(a)))
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
