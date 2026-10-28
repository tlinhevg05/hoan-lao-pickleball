/** Local setup only. Never connects to a hosted database. */
import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const run = (args, options = {}) => {
  const r = spawnSync(process.execPath, args, { stdio: "inherit", ...options });
  if (r.status !== 0)
    throw new Error("Local setup failed. " + (r.stderr || ""));
  return r;
};
if (!existsSync(".dev.vars"))
  writeFileSync(
    ".dev.vars",
    'ADMIN_PASSWORD="HoanLao@2026!"\nSTAFF_PASSWORD="Staff@2026!"\n',
    { mode: 0o600 },
  );
run(["scripts/run-framework.mjs", "build"]);
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
  process.env.HL_LOCAL_STATE_DIR || ".wrangler/state",
];
const hasTable = (name) =>
  /"name"\s*:/.test(
    run(
      [
        ...wrangler,
        ...db,
        "--command",
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`,
        "--json",
      ],
      { encoding: "utf8", stdio: "pipe" },
    ).stdout,
  );
if (!hasTable("content"))
  run([...wrangler, ...db, "--file", "drizzle/0000_tearful_james_howlett.sql"]);
if (!hasTable("accounts"))
  run([...wrangler, ...db, "--file", "drizzle/0001_dry_luminals.sql"]);
if (!hasTable("article_topics"))
  run([...wrangler, ...db, "--file", "drizzle/0002_amused_vision.sql"]);
const hasOfficial = /"name"\s*:\s*"official_at"/.test(
  run(
    [
      ...wrangler,
      ...db,
      "--command",
      "PRAGMA table_info(event_state)",
      "--json",
    ],
    { encoding: "utf8", stdio: "pipe" },
  ).stdout,
);
if (!hasOfficial)
  run([...wrangler, ...db, "--file", "drizzle/0003_wild_ender_wiggin.sql"]);
const hasOperation = /"name"\s*:\s*"operation"/.test(
  run(
    [
      ...wrangler,
      ...db,
      "--command",
      "PRAGMA table_info(submissions)",
      "--json",
    ],
    { encoding: "utf8", stdio: "pipe" },
  ).stdout,
);
if (!hasOperation)
  run([...wrangler, ...db, "--file", "drizzle/0004_flimsy_wolfsbane.sql"]);
run([
  process.argv.includes("--training")
    ? "scripts/seed.mjs"
    : "scripts/seed-empty.mjs",
  ...(process.argv.includes("--reset") ? ["--reset"] : []),
]);
if (process.argv.includes("--training")) run(["scripts/seed-training.mjs"]);
run([...wrangler, ...db, "--file", "work/seed.sql"]);
console.log(
  "Local database ready. Run npm run dev and open http://localhost:5173",
);
