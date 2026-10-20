"""Generate the Echo logo SVGs: a source ring with four echo arcs spiralling outward from it.

Run: python brand/make_logo.py  (writes logo-mark.svg and logo-icon.svg next to this file)
"""

from math import cos, radians, sin
from pathlib import Path

OUT = Path(__file__).parent

BLUE = "#3D7BFF"
BLACK = "#05070D"

# Drawing coordinates. FRAME is the square that maps onto the 512 canvas; the outer arc is
# allowed to run off its left edge, which keeps the ring large.
FRAME = (-60, 20, 860)  # x, y, size
CENTER = (205, 525)
RING = {"r": 111, "width": 38}
# (radius at start, radius at tip, start deg, end deg, width). Angles are math-style
# (0 = right, counter-clockwise). Each arc starts 45 degrees further round than the one inside
# it and is longer than it. Each is cut flat at the start, thins into a long tail, and curls
# slightly inward as it goes.
ARCS = [
    (198, 180, 226, 356, 26),
    (275, 248, 271, 403, 32),
    (345, 312, 316, 448, 30),
    (410, 384, 0, 150, 34),
]
STEPS = 240


def tail(u: float) -> float:
    """Width factor along the arc: full at the flat start (u=0), thinning to a point at the tip."""
    return (1 - u) ** 0.5


def arc_polygon(r0: float, r1: float, start: float, end: float, width: float) -> list[tuple[float, float]]:
    """Polygon for one arc. The outer edge is a smooth spiral and only the inner edge moves in,
    so the arc reads as one continuous curve while it thins."""
    cx, cy = CENTER
    outer, inner = [], []
    for i in range(STEPS + 1):
        u = i / STEPS
        a = radians(start + (end - start) * u)
        ro = r0 + (r1 - r0) * u + width / 2
        ri = ro - max(0.6, width * tail(u))
        outer.append((cx + ro * cos(a), cy - ro * sin(a)))
        inner.append((cx + ri * cos(a), cy - ri * sin(a)))
    return outer + inner[::-1]


def mark(color: str) -> str:
    x, y, size = FRAME
    scale = 512 / size
    cx, cy = CENTER
    paths = [
        f'<circle cx="{cx}" cy="{cy}" r="{RING["r"]}" fill="none" stroke="{color}" stroke-width="{RING["width"]}"/>'
    ]
    for arc in ARCS:
        pts = arc_polygon(*arc)
        paths.append('<path d="M ' + " L ".join(f"{px:.1f} {py:.1f}" for px, py in pts) + f' Z" fill="{color}"/>')
    body = "\n    ".join(paths)
    return f'<g transform="scale({scale:.5f}) translate({-x} {-y})">\n    {body}\n  </g>'


def svg(body: str, clip: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Echo">\n'
        f'  <defs><clipPath id="frame">{clip}</clipPath></defs>\n'
        f'  <g clip-path="url(#frame)">\n  {body}\n  </g>\n</svg>\n'
    )


def main() -> None:
    square = '<rect width="512" height="512"/>'
    rounded = '<rect width="512" height="512" rx="112"/>'
    (OUT / "logo-mark.svg").write_text(svg(mark(BLUE), square))
    (OUT / "logo-icon.svg").write_text(svg(f'<rect width="512" height="512" fill="{BLACK}"/>\n  {mark(BLUE)}', rounded))


if __name__ == "__main__":
    main()
