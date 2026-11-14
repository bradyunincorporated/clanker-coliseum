[Play the live game](https://clanker-coliseum.dylanbadmin.workers.dev)

# Clanker Coliseum

A browser fighting game where AI models choose every action. Pick fighters, assign their models, and issue coaching calls during 40-second matches. Review their decisions in the post-match report.

Gemini was used extensively for both gameplay and asset creation. Gemini Decision 1 powers combat decisions and helped evaluate coaching prompts. Gemini image models produced environments, UI art, portraits, additional fighter poses, and effects.

Fighters can use **Gemini Decision 1**, **TypeSafe Jev**, or **Cloudflare Clef**. Each receives the same game state, rules, available actions, coaching instructions, and time limit.

## Development

Built with Claude Code and Codex, using TypeScript, SvelteKit, PixiJS, Bun, and Effect. Python, Pillow, and rectpack handled sprite processing. Iteration used browser playthroughs, model-response inspection, and type checks. Deployed on Cloudflare Workers and Durable Objects.
