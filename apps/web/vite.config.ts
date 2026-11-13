import node from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The arena service (packages/arena-service) runs matches and holds the Gemini key; /api goes there.
const arena = `http://127.0.0.1:${process.env.ARENA_PORT ?? 8787}`;

export default defineConfig({
  plugins: [tailwindcss(), sveltekit({ adapter: node() })],
  server: { proxy: { "/api": arena } },
  preview: { proxy: { "/api": arena } },
});
