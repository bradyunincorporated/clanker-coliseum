"""Shared source-pack conventions retained from the original fighter pipeline."""

COMMON = {
    "idle_1": "Combat idle, relaxed ready stance, looking at an opponent to the RIGHT.",
    "idle_2": "Second breathing idle cel. Same stance as reference, chest slightly expanded, head one pixel higher, relaxed limbs.",
    "jump_rise": "Jump rising pose, legs tucked upward, slightly leaning forward, entire body visible. No jump trajectory or ground.",
    "jump_fall": "Jump landing anticipation pose, legs extending below the body, entire body visible.",
    "crouch": "Deep compact low crouch, body substantially shorter, looking right. Keep the head its normal size, bend the limbs.",
    "hit": "Recoil after being struck from the RIGHT. Head snaps left/back, shocked expression, body off balance. Face remains oriented toward the right.",
    "knockdown_fall": "Tumbling backward toward the LEFT after being hit from the RIGHT, entire body tilted diagonally with feet up. Readable hurt pose.",
    "knockdown_ground": "Defeated lying on its side on the floor, head toward the RIGHT, eyes squeezed shut, limbs relaxed. Full body visible, very low horizontal silhouette.",
}

STYLE = """Create ONE animation cel for a 2D fighter. Use the supplied Pokemon Generation 5 Black and White animated sprite as strict identity, proportions, palette and pixel-art reference. {identity}
Draw this precise pose: {pose}
The character faces RIGHT in three-quarter side view throughout. Preserve the same body volume, head size, pixel scale, markings and lighting as the reference. Changes in silhouette must come from articulation. Render true coarse Nintendo DS sprite pixel art, chunky square pixels, dark pixel outline, restrained flat-color clusters, hard stair-step edges. Full body and all extremities visible. Center the complete character with ample margin. One character only. Perfect uniform chroma GREEN background RGB(0,255,0). No text, grid, labels, multiple panels, shadows, scenery, motion trails or attack effects. No soft painting or antialiasing. The output is an enlarged pixel sprite, retaining roughly 60-80 logical pixels of character detail. The first image is the canonical idle reference and the second, if supplied, is the original palette reference."""
