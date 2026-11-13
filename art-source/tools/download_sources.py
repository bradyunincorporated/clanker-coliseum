"""Save the selected Gen 5 source art and its original frame timing."""
import json
import re
from pathlib import Path

import requests
from PIL import Image, ImageOps, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
SPECIES = ("blastoise", "raichu", "scyther", "hitmonlee")

for species in SPECIES:
    folder = ROOT / "references" / species
    folder.mkdir(parents=True, exist_ok=True)
    html = Path(f"/private/tmp/{species}-sprites.html").read_text()
    urls = sorted(set(re.findall(r'https://img\.pokemondb\.net/sprites/black-white/[^"<> ]+', html)))
    selected = [url for url in urls if url.endswith(f"/{species}.gif") and
                ("/anim/normal/" in url or "/anim/back-normal/" in url)]
    selected += [url for url in urls if url.endswith(f"/normal/{species}.png")]
    records = []
    for url in selected:
        name = "back.gif" if "/back-normal/" in url else "front" + Path(url).suffix
        response = requests.get(url, timeout=40)
        response.raise_for_status()
        (folder / name).write_bytes(response.content)
        records.append({"url": url, "file": name})
    timing = []
    with Image.open(folder / "front.gif") as animation:
        for index, frame in enumerate(ImageSequence.Iterator(animation)):
            name = f"{index:03}.png"
            frame.convert("RGBA").save(folder / name)
            timing.append({"file": name, "durationMs": frame.info.get("duration", 100)})
    (folder / "timing.json").write_text(json.dumps(timing, indent=2))
    (folder / "sources.json").write_text(json.dumps({"page": f"https://pokemondb.net/sprites/{species}",
        "generation": 5, "variant": "normal", "assets": records}, indent=2))
    first = ImageOps.mirror(Image.open(folder / "000.png").convert("RGBA"))
    enlarged = first.resize((first.width * 8, first.height * 8), Image.Resampling.NEAREST)
    guide = Image.new("RGBA", enlarged.size, (255, 0, 255, 255))
    guide.alpha_composite(enlarged)
    guide.convert("RGB").save(folder / "guide.png")
    print(f"{species}: {len(timing)} frames, {sum(f['durationMs'] for f in timing)} ms", flush=True)
