"""Species-specific pose briefs for the four source packs."""
import json
from pathlib import Path
from pose_jobs import COMMON, STYLE

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'generated'
IDENTITIES = {
 'blastoise': 'Blastoise, stocky blue turtle Pokemon, cream segmented belly, brown shell with cream rim, two metallic water cannons above shoulders, short ears, exactly two arms and two legs.',
 'raichu': 'Kantonian Raichu, orange electric mouse Pokemon, cream belly, brown feet, long thin dark tail ending in one yellow lightning bolt, curled brown and yellow ears, yellow cheeks. Exactly two arms and two legs. Preserve the full tail.',
 'scyther': 'Scyther, green mantis Pokemon, angular green head, cream abdomen, two ivory curved scythe forearms, exactly two clawed feet, two thin translucent wings behind back. The scythes are its forearms, never handheld swords.',
 'hitmonlee': 'Hitmonlee, tan brown oval-bodied fighting Pokemon, eyes set in dark triangular sockets directly in torso, no mouth and no separate head, exactly two arms and two long segmented spring-like legs with three-toed feet.',
}
MOVES = {
 'blastoise': [('Bite','jaw pulls back, mouth opens','lunges head RIGHT jaws snapping','head retracts, mouth closes'),
 ('Water Pulse','arms pull back to chest, elbows bent','both palms thrust RIGHT releasing water, palms open','palms retract halfway and knees relax'),
 ('Aqua Tail','deep crouch, shell turns slightly as short thick tail coils behind','deep crouch twisting, thick blue tail sweeps low toward RIGHT','remains crouched, tail settling and torso untwisting'),
 ('Hydro Pump','wide planted stance, torso leans forward to aim both shoulder cannons RIGHT','braced low under powerful recoil, both shoulder cannons aimed horizontally RIGHT','cannons relax upward, shoulders and knees settle')],
 'raichu': [('Quick Attack','small low sprinter crouch','fast forward shoulder-first lunge RIGHT, feet trailing','braking with feet forward and body leaning back'),
 ('Thunderbolt','both fists near yellow cheek pouches gathering electricity','arms spread forward RIGHT, fierce face and cheeks presented RIGHT','arms lower, shoulders relax after electrical release'),
 ('Iron Tail','deep crouch, long lightning tail raised behind body','deep crouch twisting to whip complete lightning tail horizontally low toward RIGHT','still low, long tail retracts around body without tangling'),
 ('Volt Tackle','deep coiled sprint stance, ears swept back','full horizontal diving tackle RIGHT, face first, arms tucked, legs and full tail trailing LEFT','landing and skidding RIGHT, feet braced forward, tail behind')],
 'scyther': [('Quick Attack','knees bent, scythes close to chest','sharp short forward lunge RIGHT with one scythe across chest','withdraws lunge, feet resetting'),
 ('Wing Attack','wings spread and scythes held back','one wing and shoulder sweep forcefully toward RIGHT, wings attached to back','wings fold partway, shoulder settles'),
 ('Slash','deep crouch, one scythe cocked back near LEFT hip','deep crouch, one long ivory scythe sweeps low horizontally toward RIGHT','stays crouched, scythe retracting low'),
 ('X-Scissor','both ivory scythe forearms lifted and widely separated','both ivory scythe forearms cross decisively in an X toward RIGHT at chest height','scythes separate halfway after the crossing slash')],
 'hitmonlee': [('Double Kick','one knee raised in close guard','one foot kicks straight RIGHT at stomach height, other leg planted','kicking knee folds back toward torso'),
 ('Rolling Kick','torso twists, knee chambers high','one long segmented leg fully extended in horizontal roundhouse kick RIGHT, supporting foot planted','kicking leg bends down, body untwists'),
 ('Low Sweep','deep squat with one leg coiled underneath','very low crouch, one long leg fully sweeps along floor toward RIGHT','stays low, extended leg retracts beneath torso'),
 ('High Jump Kick','deep knee bend with one knee chambered ready to leap','diagonal flying knee and foot kick high toward RIGHT, one leg fully extended, other folded back, whole body visible','landing anticipation, kicking leg bends and other foot reaches down')],
}

def poses(species):
    result = dict(COMMON)
    result.pop('idle_1'); result.pop('idle_2')
    for i, description in enumerate(['near foot steps RIGHT, far foot back LEFT', 'near foot planted under torso, far foot passing forward', 'far foot steps RIGHT, near foot back LEFT', 'far foot planted, near foot passing forward'],1):
        result[f'walk_{i}'] = f'Walking pose, {description}. Keep face RIGHT and body height steady. Arms or scythes counter-swing subtly.'
    result['block'] = 'Defensive standing guard against an attack from RIGHT. Bend knees slightly and protect face and torso with forearms.'
    result['crouch_block'] = 'Deep low defensive crouch against RIGHT. Protect torso with forearms, keep head full size and compress by bending legs.'
    result['victory'] = 'Triumphant recognizable victory pose, face RIGHT, chest proud, one arm raised.'
    if species == 'scyther':
        result['block'] = 'Guard facing RIGHT, two ivory scythe forearms crossed protectively in front of torso, knees bent.'
        result['crouch_block'] = 'Deep crouching guard facing RIGHT, both scythes crossed low in front of torso, wings folded.'
    if species == 'blastoise':
        result['block'] = 'Defensive brace facing RIGHT, shell slightly presented to threat, forearms protect head, cannon barrels remain attached above shoulders.'
    for i,(move,*phases) in enumerate(MOVES[species],1):
        for phase,brief in zip(('windup','strike','recover'),phases):
            result[f'move{i}_{phase}'] = f'{move} {phase}: {brief}. Creature body only, effects will be separate. Face RIGHT.'
    return result

def jobs():
    result=[]
    for species in IDENTITIES:
        for name,pose in poses(species).items():
            prompt=STYLE.format(identity=IDENTITIES[species],pose=pose)
            prompt=prompt.replace('GREEN background RGB(0,255,0)', 'MAGENTA background RGB(255,0,255)')
            result.append(dict(fighter=species,name=name,prompt=prompt,
                references=[str(ROOT/'references'/species/'guide.png')],
                destination=str(RAW/species/f'{name}.png')))
    return sorted(result,key=lambda job:(job['name']!='move4_strike',job['name']!='move3_strike'))

if __name__=='__main__':
    (ROOT/'jobs.json').write_text(json.dumps(jobs(),indent=2))
    print('Wrote 100 pose jobs')
