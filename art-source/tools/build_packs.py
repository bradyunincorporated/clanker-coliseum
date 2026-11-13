"""Build the four Pixi atlases through the original packing implementation."""
from new_jobs import IDENTITIES
from prepare_new import ROOT
import pack_sheets

pack_sheets.ROOT=ROOT
for species in IDENTITIES:
    pack_sheets.pack(species)
