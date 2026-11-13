"""Shared source-pack conventions retained from the original fighter pipeline."""

from pathlib import Path

ROOT = Path("output/gen5/pack")

POSES = ["idle_1", "idle_2", *[f"walk_{i}" for i in range(1, 5)],
         "jump_rise", "jump_fall", "crouch", "block", "crouch_block", "hit",
         "knockdown_fall", "knockdown_ground", "victory",
         *[f"move{i}_{phase}" for i in range(1, 5) for phase in ("windup", "strike", "recover")]]
