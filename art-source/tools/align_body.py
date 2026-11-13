"""Match Hitmonlee's torso size to the original sprite across articulated poses."""
from math import sqrt

from PIL import Image


def torso_area(image):
    pixels = image.load()
    remaining = set()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and red - green > 14 and green - blue > 7:
                remaining.add((x, y))
    largest = 0
    while remaining:
        pending = [remaining.pop()]
        area = 1
        while pending:
            x, y = pending.pop()
            for neighbor in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    pending.append(neighbor)
                    area += 1
        largest = max(largest, area)
    return largest


def match_torso(image, reference):
    # Brown torso pixels form a separate component from the pale segmented limbs.
    scale = sqrt(torso_area(reference) / max(1, torso_area(image)))
    size = (round(image.width * scale), round(image.height * scale))
    return image.resize(size, Image.Resampling.NEAREST)
