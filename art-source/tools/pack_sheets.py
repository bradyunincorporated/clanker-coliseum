"""Produce PixiJS hash atlases, preserving full-cell anchor geometry."""

import hashlib
import json
from math import gcd
from pathlib import Path

from PIL import Image
from rectpack import newPacker, MaxRectsBssf

from prepare_frames import ROOT, POSES


def animations(folder):
    p = lambda name: name + ".png"
    idle = json.loads((folder / "idle-timing.json").read_text())["frames"]
    samples = []
    quantum = gcd(*(frame["durationMs"] for frame in idle))
    for frame in idle:
        samples.extend([frame["frame"]] * (frame["durationMs"] // quantum))
    result = {"idle": samples}
    result["walkForward"] = [p(f"walk_{i}") for i in (1, 2, 3, 4)] * 3
    result["walkBack"] = [p(f"walk_{i}") for i in (4, 3, 2, 1)] * 3
    result["jump"] = [p("jump_rise")] * 4 + [p("jump_fall")] * 4 + [p("crouch")] + [p("idle_1")] * 3
    result["jumpForward"] = result["jump"]
    singles = {"crouch": "crouch", "block": "block", "crouchBlock": "crouch_block", "hitstun": "hit",
               "blockstun": "block", "stagger": "hit", "ko": "knockdown_ground", "victory": "victory"}
    result |= {action: [p(frame)] for action, frame in singles.items()}
    result["knockdown"] = [p("knockdown_fall")] * 2 + [p("knockdown_ground")] * 7 + [p("crouch")] * 2 + [p("idle_1")]
    for i in range(1, 5):
        for phase in ("windup", "strike", "recover"):
            name = f"move{i}_{phase}"
            result[name] = [p(name)]
        if i > 1:
            result[f"move{i}_fx"] = [p(f"move{i}_fx_{j}") for j in (2, 3)]
            result[f"move{i}_fx_sequence"] = [p(f"move{i}_fx_{j}") for j in range(1, 5)]
    return result


def pack(fighter):
    folder = ROOT / "fighters" / fighter
    images, names = {}, {}
    for path in sorted((folder / "frames").glob("*.png")):
        image = Image.open(path).convert("RGBA")
        assert image.size == (800, 520), path
        bounds = image.getbbox()
        cropped = image.crop(bounds)
        digest = hashlib.sha256(str(cropped.size).encode() + cropped.tobytes()).hexdigest()
        images[digest] = cropped
        names[path.name] = (digest, bounds)
    for name in POSES:
        assert name + ".png" in names, f"Missing pose {fighter}/{name}"
    packer = newPacker(pack_algo=MaxRectsBssf, rotation=False)
    for digest, image in images.items():
        packer.add_rect(image.width + 4, image.height + 4, rid=digest)
    packer.add_bin(4096, 4096, count=1)
    packer.pack()
    placements = packer.rect_list()
    assert len(placements) == len(images), f"Atlas exceeded 4096: {fighter}"
    width = max(x + w for _, x, y, w, h, rid in placements)
    height = max(y + h for _, x, y, w, h, rid in placements)
    atlas = Image.new("RGBA", (width, height))
    positions = {}
    for _, x, y, w, h, digest in placements:
        atlas.alpha_composite(images[digest], (x + 2, y + 2))
        positions[digest] = {"x": x + 2, "y": y + 2, "w": w - 4, "h": h - 4}
    frames = {}
    for name, (digest, (x, y, right, bottom)) in names.items():
        frames[name] = {"frame": positions[digest], "rotated": False, "trimmed": True,
                        "spriteSourceSize": {"x": x, "y": y, "w": right - x, "h": bottom - y},
                        "sourceSize": {"w": 800, "h": 520}}
    data = {"frames": frames, "animations": animations(folder),
            "meta": {"image": fighter + ".png", "format": "RGBA8888", "size": {"w": width, "h": height}, "scale": "1"}}
    atlas.save(folder / f"{fighter}.png")
    (folder / f"{fighter}.json").write_text(json.dumps(data, indent=2))
    print(f"{fighter}: {len(frames)} named frames, {len(images)} unique tiles, {width}x{height}")


if __name__ == "__main__":
    for fighter in ("arcanine", "gengar"):
        pack(fighter)
