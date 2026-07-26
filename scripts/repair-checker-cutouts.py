from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def is_checker_tone(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, alpha = pixel
    return alpha > 0 and min(r, g, b) >= 218 and max(r, g, b) - min(r, g, b) <= 8


def color_distance(left: tuple[int, int, int, int], right: tuple[int, int, int, int]) -> int:
    return max(abs(left[index] - right[index]) for index in range(3))


def matches_transparent_template(
    pixels,
    width: int,
    height: int,
    x: int,
    y: int,
    period: int,
    tolerance: int,
) -> bool:
    current = pixels[x, y]
    for multiplier in (1, -1, 2, -2, 3, -3):
        offset = period * multiplier
        for tx, ty in ((x + offset, y), (x, y + offset)):
            if not (0 <= tx < width and 0 <= ty < height):
                continue
            template = pixels[tx, ty]
            if template[3] == 0 and color_distance(current, template) <= tolerance:
                return True
    return False


def repair(source: Path, destination: Path, period: int, tolerance: int, analyze: bool) -> int:
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    candidate = {
        (x, y)
        for y in range(height)
        for x in range(width)
        if is_checker_tone(pixels[x, y])
    }
    removed = set()
    components = []
    while candidate:
        start = candidate.pop()
        component = {start}
        frontier = [start]
        while frontier:
            x, y = frontier.pop()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in candidate:
                    candidate.remove(neighbor)
                    component.add(neighbor)
                    frontier.append(neighbor)
        if len(component) < 24:
            continue
        matches = sum(
            matches_transparent_template(pixels, width, height, x, y, period, tolerance)
            for x, y in component
        )
        xs = [point[0] for point in component]
        ys = [point[1] for point in component]
        components.append((len(component), matches, min(xs), min(ys), max(xs), max(ys)))
        # Checker islands contain many pixels matching the already-transparent
        # checker texture. Clothing highlights only produce occasional matches.
        if len(component) >= 1000 and matches >= 80 and matches / len(component) >= 0.18:
            removed.update(component)

    if analyze:
        for item in sorted(components, reverse=True)[:40]:
            size, matches, left, top, right, bottom = item
            print(
                f"component size={size} matches={matches} ratio={matches / size:.3f} "
                f"bbox={left},{top},{right},{bottom}"
            )

    for x, y in removed:
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination)
    return len(removed)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--period", type=int, default=92)
    parser.add_argument("--tolerance", type=int, default=7)
    parser.add_argument("--analyze", action="store_true")
    args = parser.parse_args()
    count = repair(args.source, args.destination, args.period, args.tolerance, args.analyze)
    print(f"removed_pixels={count}")


if __name__ == "__main__":
    main()
