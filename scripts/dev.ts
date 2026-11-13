// Runs the arena service and the web app together. Ctrl+C stops both.
const root = new URL("..", import.meta.url).pathname;

const children = [
  Bun.spawn(["bun", "--watch", "packages/arena-service/src/main.ts"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  }),
  Bun.spawn(["bun", "run", "--cwd", "apps/web", "dev"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  }),
];

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await Promise.race(children.map((c) => c.exited));
stop();
