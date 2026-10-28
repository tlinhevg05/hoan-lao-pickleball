/** Empty club installation. --reset removes local content but preserves existing admin credentials. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pbkdf2Sync, randomUUID } from "node:crypto";
const q = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const vars = readFileSync(".dev.vars", "utf8"),
  password = vars.match(/ADMIN_PASSWORD="([^"]+)"/)?.[1];
if (!password) throw new Error("Configure ADMIN_PASSWORD in .dev.vars.");
const salt = randomUUID(),
  hash =
    salt +
    ":" +
    pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex"),
  now = new Date().toISOString();
const sql = [];
if (process.argv.includes("--reset")) {
  for (const table of [
    "registrations",
    "sessions",
    "submissions",
    "messages",
    "athletes",
    "event_state",
    "categories",
    "content",
    "rate_limits",
    "uploads",
    "article_topics",
  ])
    sql.push("DELETE FROM " + table + ";");
  sql.push("DELETE FROM accounts WHERE role<>'admin';");
}
const settings = {
  clubName: "Hoàn Lão Pickleball",
  logoImage: "/favicon.svg",
  contact: "Vũ Trịnh Thanh",
  phone: "",
  contacts: [
    { name: "Vũ Trịnh Thanh", phone: "" },
    { name: "", phone: "" },
  ],
  address: "Xã Hoàn Lão, tỉnh Quảng Trị",
  zaloUrl: "",
  facebookUrl: "",
  facebookName: "",
  sponsors: [],
  clubBannerImage: "/pickleball-court.jpg",
  demo: false,
};
sql.push(
  `INSERT OR IGNORE INTO content(id,kind,data,created_at) VALUES('settings','settings',${q(JSON.stringify(settings))},${q(now)});`,
);
sql.push(
  `INSERT OR IGNORE INTO accounts(id,username,password_hash,role,disabled,created_at) VALUES('local-admin','admin',${q(hash)},'admin',0,${q(now)});`,
);
mkdirSync("work", { recursive: true });
writeFileSync("work/seed.sql", sql.join("\n"));
