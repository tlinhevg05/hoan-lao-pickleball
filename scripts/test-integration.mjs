/** A disposable local D1/R2 environment. Never tests retention against the user's dev data. */
import { spawn, spawnSync } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  openSync,
  readFileSync,
  writeFileSync,
  closeSync,
} from "node:fs";
import { createServer } from "node:net";
const run = (args) => {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(result.stdout + "\n" + result.stderr);
  return result.stdout;
};
mkdirSync("work", { recursive: true });
if (process.env.HL_SKIP_BUILD !== "1")
  run(["scripts/run-framework.mjs", "build"]);
const state = "work/integration-state";
rmSync(state, { recursive: true, force: true });
const wrangler = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
];
const db = [
  "d1",
  "execute",
  "DB",
  "--local",
  "--config",
  "dist/server/wrangler.json",
  "--persist-to",
  state,
];
for (const file of [
  "drizzle/0000_tearful_james_howlett.sql",
  "drizzle/0001_dry_luminals.sql",
  "drizzle/0002_amused_vision.sql",
  "drizzle/0003_wild_ender_wiggin.sql",
  "drizzle/0004_flimsy_wolfsbane.sql",
])
  run([...wrangler, ...db, "--file", file]);
run(["scripts/seed.mjs", "--reset"]);
run(["scripts/seed-training.mjs"]);
run([...wrangler, ...db, "--file", "work/seed.sql"]);
const port = await new Promise((resolve) => {
  const server = createServer();
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
const base = "http://127.0.0.1:" + port,
  log = openSync("work/integration-server.log", "w");
const server = spawn(
  process.execPath,
  [
    ...wrangler,
    "dev",
    "--config",
    "dist/server/wrangler.json",
    "--local",
    "--persist-to",
    state,
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--inspector-port",
    "0",
  ],
  { stdio: ["ignore", log, log] },
);
let stopping = false;
const stop = () => {
  stopping = true;
  server.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) break;
    try {
      ready = (await fetch(base + "/api/site")).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready)
    throw new Error(
      "QA server failed:\n" +
        readFileSync("work/integration-server.log", "utf8"),
    );
  console.log("Isolated QA server: " + base);
  writeFileSync("work/integration-url.txt", base);
  const tests = spawn(process.execPath, ["tests/integration.mjs"], {
    stdio: "inherit",
    env: { ...process.env, HL_TEST_URL: base, HL_TEST_STATE_DIR: state },
  });
  const code = await new Promise((resolve) => tests.on("exit", resolve));
  if (code !== 0) throw new Error("Integration tests failed.");
  if (process.env.HL_TEST_KEEP_SERVER === "1") {
    console.log("QA server retained for UI checks; interrupt to stop.");
    while (!stopping) await new Promise((r) => setTimeout(r, 200));
  }
} finally {
  server.kill("SIGTERM");
  closeSync(log);
}
