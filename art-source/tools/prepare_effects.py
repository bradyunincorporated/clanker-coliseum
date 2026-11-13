"""Extract four effect phases and format selection portraits."""
import json
from PIL import Image
from new_jobs import RAW, IDENTITIES
from prepare_new import ROOT, NEAREST, keyed, place

for species in IDENTITIES:
    folder=ROOT/'fighters'/species
    metadata=json.loads((folder/'fighter-art.json').read_text())
    portrait_path=RAW/species/'portrait.png'
    if portrait_path.exists():
        portrait=Image.open(portrait_path).convert('RGB')
        portrait.resize((192,192),NEAREST).resize((768,768),NEAREST).save(folder/'portrait.png')
    for move in ('move2','move3','move4'):
        path=RAW/species/f'{move}_fx.png'
        if not path.exists(): continue
        sheet=Image.open(path)
        half_w,half_h=sheet.width//2,sheet.height//2
        cels=[keyed(sheet.crop((x*half_w,y*half_h,(x+1)*half_w,(y+1)*half_h)))
              for y in range(2) for x in range(2)]
        boxes=[cel.getbbox() for cel in cels]
        if any(box is None for box in boxes):
            raise ValueError(f'Empty effect cel in {species}/{move}')
        hitbox=metadata['artGuides']['moves'][move]['hitbox']
        width,height=hitbox['w']*2,hitbox['h']*2
        largest_w=max(b[2]-b[0] for b in boxes)
        largest_h=max(b[3]-b[1] for b in boxes)
        for index,cel in enumerate(cels,1):
            cel=cel.crop(cel.getbbox())
            size=(max(1,round(cel.width/largest_w*width/5)),
                  max(1,round(cel.height/largest_h*height/5)))
            small=cel.resize(size,NEAREST)
            alpha=small.getchannel('A')
            small=small.convert('RGB').quantize(colors=24,dither=Image.Dither.NONE).convert('RGBA')
            small.putalpha(alpha)
            image=small.resize((size[0]*5,size[1]*5),NEAREST)
            place(image,bottom=260+image.height/2).save(folder/'frames'/f'{move}_fx_{index}.png')
    print(species,'extras prepared',flush=True)
