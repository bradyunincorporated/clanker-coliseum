"""Format the new cels using the original pack's pixel scale and anchors."""
import json
from pathlib import Path
from PIL import Image, ImageOps
from new_jobs import ROOT as SOURCE, RAW, IDENTITIES
from new_config import SPECS, config
from prepare_frames import POSES
from align_body import match_torso

ROOT=SOURCE.parent/'apps/web/static'
NEAREST=Image.Resampling.NEAREST

def keyed(image):
    image=image.convert('RGBA')
    image.putdata([(0,0,0,0) if r>g+40 and b>g+40 and r>100 and b>100 else (r,g,b,255)
                   for r,g,b,a in image.get_flattened_data()])
    return image

def place(image,bottom=468):
    bounds=image.getbbox()
    if bounds is None:
        raise ValueError('Empty image')
    canvas=Image.new('RGBA',(800,520))
    canvas.alpha_composite(image,(round(400-(bounds[0]+bounds[2])/2),round(bottom-bounds[3])))
    return canvas

def original_frames(species,folder):
    source=SOURCE/'references'/species
    timing=json.loads((source/'timing.json').read_text())
    first=ImageOps.mirror(Image.open(source/timing[0]['file']).convert('RGBA'))
    ground=first.getbbox()[3]
    frames=[]
    for i,entry in enumerate(timing):
        im=ImageOps.mirror(Image.open(source/entry['file']).convert('RGBA'))
        canvas=Image.new('RGBA',(800,520))
        canvas.alpha_composite(im.resize((im.width*5,im.height*5),NEAREST),
            (round(400-im.width*2.5),468-ground*5))
        filename=f'idle_original_{i:03}.png'
        canvas.save(folder/filename)
        frames.append(dict(frame=filename,durationMs=entry['durationMs']))
    Image.open(folder/frames[0]['frame']).save(folder/'idle_1.png')
    Image.open(folder/frames[min(8,len(frames)-1)]['frame']).save(folder/'idle_2.png')
    duration=sum(f['durationMs'] for f in frames)
    (folder.parent/'idle-timing.json').write_text(json.dumps(dict(frames=frames,durationMs=duration,loop=True),indent=2))
    return duration

def palette_for(species):
    im=Image.open(SOURCE/'references'/species/'000.png').convert('RGBA')
    colors=sorted({p[:3] for p in im.get_flattened_data() if p[3]})
    palette=Image.new('P',(1,1))
    palette.putpalette([c for color in (colors+[colors[0]]*(256-len(colors))) for c in color])
    return palette

def prepare(species):
    folder=ROOT/'fighters'/species
    frames=folder/'frames'
    frames.mkdir(parents=True,exist_ok=True)
    duration=original_frames(species,frames)
    palette=palette_for(species)
    for name in POSES[2:]:
        path=RAW/species/f'{name}.png'
        if not path.exists(): continue
        size=SPECS[species]['pixels']
        image=keyed(Image.open(path)).resize((size,size),NEAREST)
        alpha=image.getchannel('A')
        image=image.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA')
        image.putalpha(alpha)
        if species == 'hitmonlee':
            reference=Image.open(SOURCE/'references'/species/'000.png').convert('RGBA')
            image=match_torso(image,reference)
        image=image.resize((image.width*5,image.height*5),NEAREST)
        bottom={'jump_rise':438,'jump_fall':458,'knockdown_fall':428}.get(name,468)
        place(image,bottom).save(frames/f'{name}.png')
    metadata=config(species,duration)
    (folder/'fighter-art.json').write_text(json.dumps(metadata,indent=2))
    return folder,metadata

if __name__=='__main__':
    for species in IDENTITIES:
        folder,_=prepare(species)
        print(species,len(list((folder/'frames').glob('*.png'))),'frames',flush=True)
