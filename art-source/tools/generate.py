"""Generate sprite artwork through Gemini without persisting credentials."""

import argparse
import base64
import json
import os
import time
import tempfile
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image


def image_blocks(value):
    if isinstance(value, dict):
        if value.get("type") == "image" and value.get("data"):
            yield value
        elif value.get("mime_type", "").startswith("image/") and value.get("data"):
            yield value
        else:
            for child in value.values():
                yield from image_blocks(child)
    elif isinstance(value, list):
        for child in value:
            yield from image_blocks(child)


def generate(prompt, references, destination, aspect="1:1"):
    destination = Path(destination)
    metadata_path = destination.with_suffix(".json")
    if destination.exists() and metadata_path.exists():
        try:
            with Image.open(destination) as existing:
                existing.verify()
            json.loads(metadata_path.read_text())
            return str(destination)
        except (OSError, ValueError):
            pass
    key = os.environ.get("GEMINI_API_KEY") or Path("/tmp/clanker-gemini-key").read_text().strip()
    inputs = [{"type": "text", "text": prompt}]
    for reference in references:
        inputs.append({"type": "image", "mime_type": "image/png", "data":
                       base64.b64encode(Path(reference).read_bytes()).decode()})
    body = {"model": "gemini-nano-banana-2.1", "input": inputs,
            "response_format": {"type": "image", "mime_type": "image/jpeg",
                                "aspect_ratio": aspect, "image_size": "1K"}}
    headers = {"x-goog-api-key": key, "Api-Revision": "2026-05-20"}
    for attempt in range(3):
        try:
            response = requests.post("https://generativelanguage.googleapis.com/v1beta/interactions",
                                     headers=headers, json=body, timeout=240)
        except (requests.Timeout, requests.ConnectionError):
            if attempt == 2:
                raise RuntimeError("Gemini network request failed after three attempts") from None
            time.sleep(5 * (attempt + 1))
            continue
        if response.status_code not in (429, 500, 502, 503, 504):
            break
        if attempt < 2:
            time.sleep(5 * (attempt + 1))
    if not response.ok:
        message = response.text.replace(key, "[redacted]")[:600]
        raise RuntimeError(f"Gemini HTTP {response.status_code}: {message}")
    result = response.json()
    images = list(image_blocks(result))
    if not images:
        raise RuntimeError(f"No image returned. Response keys: {list(result)}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    metadata = {"model": body["model"], "prompt": prompt, "references": references,
                "usage": result.get("usage"), "interaction_id": result.get("id")}
    with tempfile.TemporaryDirectory(dir=destination.parent) as temporary:
        image_path = Path(temporary) / "image.png"
        info_path = Path(temporary) / "metadata.json"
        Image.open(BytesIO(base64.b64decode(images[-1]["data"]))).save(image_path)
        info_path.write_text(json.dumps(metadata, indent=2))
        os.replace(info_path, metadata_path)
        os.replace(image_path, destination)
    return str(destination)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt")
    parser.add_argument("destination")
    parser.add_argument("references", nargs="*")
    args = parser.parse_args()
    print(generate(Path(args.prompt).read_text(), args.references, args.destination), flush=True)
