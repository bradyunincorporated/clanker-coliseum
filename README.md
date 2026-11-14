[Play Clanker Coliseum](https://clanker-coliseum.dylanbadmin.workers.dev)

# Clanker Coliseum

An AI-powered arcade fighter where you choose fighters, coaches, and a game plan, then call tactics during 40-second battles. Decision models choose each fighter’s actions once per second while the server simulates combat and streams the match to your browser.

Gemini was used extensively across gameplay and art production. Gemini Decision 1 powers real-time combat decisions and was used to evaluate coaching prompts. Gemini image models generated the painted environments, menus, and HUD artwork, and expanded reference sprites into fighter portraits, combat poses, and move effects.

Each fighter independently uses **Gemini Decision 1**, **TypeSafe Jev**, or **Cloudflare Clef**, enabling head-to-head model matchups. All three receive the same game rules, raw state, legal actions, coaching instructions, and decision deadline. The post-match Backstage report lets you inspect their decisions.
