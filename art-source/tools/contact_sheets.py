"""Create compact art review sheets from each pack's required poses."""
from PIL import Image, ImageDraw
from new_jobs import IDENTITIES, ROOT as SOURCE
from prepare_new import ROOT, POSES

for species in IDENTITIES:
    sheet=Image.new('RGB',(1200,1200),'#d4dce2')
    draw=ImageDraw.Draw(sheet)
    folder=ROOT/'fighters'/species/'frames'
    for index,name in enumerate(POSES):
        x,y=(index%5)*240,(index//5)*200
        path=folder/f'{name}.png'
        draw.text((x+6,y+6),name,fill='#17212b')
        draw.line((x,y+168,x+240,y+168),fill='#9aabb8')
        if path.exists():
            frame=Image.open(path).convert('RGBA')
            frame.thumbnail((240,156),Image.Resampling.NEAREST)
            sheet.paste(frame,(x,y+28),frame)
    sheet.save(SOURCE/f'{species}-poses.png')
