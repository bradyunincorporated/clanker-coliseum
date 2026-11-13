"""Separate effect sequences and select portraits."""
import json
from new_jobs import ROOT, RAW, IDENTITIES

EFFECTS={
 'blastoise': ['translucent blue concentric water rings bursting horizontally RIGHT, white cyan foam and droplets', 'a low horizontal aqua crescent sweeping RIGHT with scattered white water droplets', 'two powerful parallel horizontal blue-white water jets blasting RIGHT, white foam tips and cyan spray'],
 'raichu': ['jagged branching bright yellow-white lightning striking RIGHT, amber zigzag outer arcs', 'a low sharp silver-white crescent slash sweeping RIGHT with cold blue edge sparkles', 'an oval yellow-white electric aura with an empty center for a diving mouse, long lightning trails streaming LEFT'],
 'scyther': ['a pale cyan-white horizontal wind slash sweeping RIGHT, sharp crescent air trails', 'a low horizontal ivory-white blade arc sweeping RIGHT with a pale green edge', 'two crossed luminous ivory and green blade slashes making an X, cutting toward RIGHT'],
 'hitmonlee': ['a curved ivory-white roundhouse kick speed arc aimed RIGHT, ochre impact accents', 'a very low thin ivory crescent sweep toward RIGHT with sparse tan dust specks', 'a sharp diagonal up-RIGHT white and gold kick impact burst with a short tapered motion trail'],
}
result=[]
for species, effects in EFFECTS.items():
    reference=str(ROOT/'references'/species/'guide.png')
    for number,effect in enumerate(effects,2):
        prompt=f'''Create a 2 by 2 sprite sheet containing FOUR sequential cels of {effect}. Effect only, no creature. Top-left forming, top-right full force, bottom-left full force variant, bottom-right dispersing. Each quadrant contains exactly one entire effect with generous empty margins, occupying at most 70 percent of its quadrant. Consistent middle cel dimensions. Face RIGHT. Match the reference's Generation 5 chunky Nintendo DS pixel art, crisp hard square pixels, limited colors, no gradients, no blur. Uniform pure MAGENTA RGB(255,0,255) background. No text, dividers, grid or labels. Square canvas.'''
        result.append(dict(fighter=species,name=f'move{number}_fx',prompt=prompt,references=[reference],destination=str(RAW/species/f'move{number}_fx.png')))
    prompt=f'''Create a polished character-selection portrait of {IDENTITIES[species]} Strictly match the attached Generation 5 reference for identity, coloring and anatomy. Head and upper torso, expressive three-quarter view facing RIGHT. Beautiful crisp Pokemon pixel art with purposeful color clusters and strong dark outline. Coarse roughly 128x128 logical pixels enlarged. Keep ears, head and visible wings entirely in frame with comfortable margins. Plain warm cream RGB(243,233,210) background. No text, frames, props or other characters.'''
    result.append(dict(fighter=species,name='portrait',prompt=prompt,references=[reference],destination=str(RAW/species/'portrait.png')))
(ROOT/'extra-jobs.json').write_text(json.dumps(result,indent=2))
