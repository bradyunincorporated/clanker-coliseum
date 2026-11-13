"""Alignment and timing suggestions for the four animation packs."""
from new_jobs import MOVES

SPECS = {
 'blastoise': dict(color=0x4D93C9,accent=0xF3D9A0,pixels=94,types=['water'],
     standing=[[-48,0,96,70],[-55,60,110,80],[-38,125,76,40]],
     crouching=[[-60,0,120,45],[-58,35,116,70]],airborne=[[-50,25,100,130]],
     times=[[5,4,14],[14,10,27],[12,6,25],[20,10,28]],
     boxes=[[35,90,65,50],[45,65,140,85],[15,0,155,45],[55,85,140,65]]),
 'raichu': dict(color=0xEFA432,accent=0xFFE46C,pixels=100,types=['electric'],
     standing=[[-35,0,70,50],[-43,35,86,85],[-35,110,70,45]],
     crouching=[[-50,0,100,40],[-48,30,96,65]],airborne=[[-40,20,80,125]],
     times=[[4,4,14],[14,10,27],[10,6,24],[17,8,30]],
     boxes=[[25,40,70,70],[40,50,150,90],[15,0,165,45],[25,30,140,100]]),
 'scyther': dict(color=0x6C9F48,accent=0xF2E7BE,pixels=94,types=['bug','flying'],
     standing=[[-35,0,70,60],[-38,45,76,85],[-30,115,60,40]],
     crouching=[[-48,0,96,40],[-45,30,90,70]],airborne=[[-38,20,76,130]],
     times=[[4,4,15],[12,7,26],[10,6,24],[17,7,30]],
     boxes=[[30,55,80,60],[35,65,145,75],[20,0,150,45],[30,45,145,115]]),
 'hitmonlee': dict(color=0xA88566,accent=0xE4DAB1,pixels=107,types=['fighting'],
     standing=[[-28,0,56,95],[-42,80,84,80]],
     crouching=[[-45,0,90,40],[-48,25,96,80]],airborne=[[-35,25,70,135]],
     times=[[5,5,15],[12,7,28],[10,6,25],[18,6,32]],
     boxes=[[30,55,85,55],[40,70,150,55],[15,0,170,40],[35,85,125,110]]),
}

def box(values):
    return dict(zip(('x','y','w','h'),values))

def config(species, duration):
    spec=SPECS[species]
    actions=['idle','walkForward','walkBack','jump','jumpForward','crouch','block',
        'crouchBlock','hitstun','blockstun','knockdown','stagger','ko','victory']
    return dict(id=species,name=species.title(),types=spec['types'],sprites=dict(
        sheet=f'/fighters/{species}/{species}.json',animations={a:a for a in actions},
        loops={'idle':duration},moves={f'move{i}':{p:f'move{i}_{p}' for p in
            ('windup','strike','recover')} for i in range(1,5)},
        effects={f'move{i}':dict(animation=f'move{i}_fx',linger=6) for i in (2,3,4)},
        anchor={'x':0.5,'y':0.9},scale=0.5,color=spec['color'],accent=spec['accent']),
        artGuides=dict(status='Suggested alignment and preview timings. Gameplay balance requires tuning.',
            hurtboxes={s:[box(v) for v in spec[s]] for s in ('standing','crouching','airborne')},
            moves={f'move{i}':dict(name=move[0],startup=t[0],active=t[1],recovery=t[2],hitbox=box(b))
                for i,(move,t,b) in enumerate(zip(MOVES[species],spec['times'],spec['boxes']),1)}))
