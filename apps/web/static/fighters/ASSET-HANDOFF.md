# Development fighter asset handoff

Copy fighters/ into apps/web/static/. Each fighter-art.json contains a sprites object ready for the v4.1 loader. Set nearest-neighbor sampling. Ground point is (400,468), source size 800x520, anchor (0.5,0.9), scale 0.5.

Cinderhound has a 3600 ms idle loop. Grinshade has a 4600 ms idle loop. Repeated frames preserve the source timing. Each has 27 key poses, 12 effect cels, a portrait, and a packed PixiJS atlas. Every atlas is at most 4096 pixels per side.

Four moves are ordered as defined in fighter-art.json. sprites.moves is phase-aware. sprites.effects uses full-strength effect cels during active frames. Effect source cells are centered at (400,260). The engine places their centers on the hitbox.

The artGuides collision boxes and timings are suggestions for alignment and previewing, requiring gameplay tuning. Cinderhound is a quadruped. Grinshade is compact and round with squash-and-stretch crouches. The user will do most manual verification. The art is ready for integration by the game agent.
