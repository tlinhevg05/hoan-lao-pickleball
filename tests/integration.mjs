import { articleSections } from "../lib/articles.ts";
import assert from "node:assert/strict";
import {
  deadlineAt,
  eventStatus,
  nextEventTransitionDelay,
} from "../lib/events.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const base = process.env.HL_TEST_URL,
  state = process.env.HL_TEST_STATE_DIR;
if (!base || !state || !state.startsWith("work/integration-state"))
  throw new Error(
    "Run npm run test:integration to use the disposable database.",
  );
const vars = `ADMIN_PASSWORD="${process.env.HL_TEST_ADMIN_PASSWORD}"\nSTAFF_PASSWORD="${process.env.HL_TEST_STAFF_PASSWORD}"`,
  adminPassword = vars.match(/ADMIN_PASSWORD="([^"]+)"/)[1],
  staffPassword = vars.match(/STAFF_PASSWORD="([^"]+)"/)?.[1] || "Staff@2026!",
  password = "QA-Athlete-2026!";
let checks = 0;
const check = (value, label) => {
  assert.ok(value, label);
  checks++;
  console.log("PASS " + label);
};
async function req(path, body, cookie = "", method, origin = true) {
  const response = await fetch(base + path, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(origin ? { Origin: base } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return {
    response,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
const post = (body, cookie) => req("/api/admin", body, cookie);
const site = async () => (await req("/api/site")).data;
const adminData = async () => (await req("/api/admin", undefined, admin)).data;
async function login(
  identifier,
  p = identifier === "admin"
    ? adminPassword
    : ["staff", "staff2"].includes(identifier)
      ? staffPassword
      : password,
) {
  const r = await req("/api/auth", { identifier, password: p });
  assert.equal(r.response.status, 200, JSON.stringify(r.data));
  assert.match(r.response.headers.get("set-cookie"), /; Secure(?:;|$)/, "Production sessions require Secure cookies");
  return r.cookie;
}
const profile = (n) => ({
  name: "QA Athlete " + n,
  phone: "09099000" + String(n).padStart(2, "0"),
  gender: n === 2 ? "Nữ" : "Nam",
  birthYear: "1970",
  email: "",
  address: "Hồ sơ kiểm thử",
  rating: n === 3 ? "2.15" : "3.25",
  ...(n === 1
    ? {
        photoData:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+1cAAAAASUVORK5CYII=",
      }
    : {}),
  password,
  consent: true,
});
const event = {
  title: "Giải thử nhiều đợt",
  subtitle: "QA",
  date: "2099-11-22",
  opensAt: "2020-01-01",
  deadline: "2099-11-15",
  location: "Hoàn Lão",
  categories: ["Đơn nam 3.0"],
  categorySlots: { "Đơn nam 3.0": 2 },
  feeAmount: "300000",
  feeUnit: "athlete",
  pairingMode: "self",
  description: "Thể lệ kiểm thử",
  image: "/pickleball-court.jpg",
  posters: ["/pickleball-court.jpg"],
  status: "open",
  featured: false,
  demo: true,
};
const article = {
  title: "Bài định dạng thử nghiệm",
  category: "Chủ đề mới QA",
  date: "2099-01-01",
  excerpt: "Bài thực hành biên tập",
  body: "## Tiêu đề cỡ lớn\n\nMột đoạn **in đậm**, _in nghiêng_ và chữ vừa.\n\n<script>window.bad=1</script>",
  image: "/pickleball-court.jpg",
  demo: true,
};
const album = {
  title: "Album nhiều ảnh",
  date: "2099-01-01",
  description: "Album mẫu",
  cover: "/pickleball-court.jpg",
  photoLinks: "https://example.com/anh-1\nhttps://example.com/anh-2",
  videoLinks: "https://example.com/video-1\nhttps://example.com/video-2",
  photos: [
    { url: "/pickleball-court.jpg", description: "Toàn cảnh sân" },
    { url: "/pickleball-ball.jpg", description: "Khoảnh khắc buổi tập" },
  ],
  demo: true,
};
let r = await req("/api/admin");
check(r.response.status === 401, "Operator data requires login");
let admin = await login("admin");
const staff = await login("staff"),
  staff2 = await login("staff2");
r = await req("/api/auth", undefined, admin);
check(
  r.data.account.role === "admin",
  "Admin identity is supplied by the server",
);
r = await post({ action: "save", kind: "settings", data: {} }, staff);
check(r.response.status === 403, "Staff cannot change club settings");
r = await req(
  "/api/admin",
  { action: "save", kind: "article", data: article },
  admin,
  "POST",
  false,
);
check(r.response.status === 403, "Unsafe cross-origin write rejected");
r = await post(
  { action: "save", kind: "tournament", id: "qa-event", data: event },
  admin,
);
check(r.response.ok, "Admin can create a tournament with manual content names");
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-event",
    data: { ...event, title: "Giải do admin chỉnh sửa" },
  },
  admin,
);
check(
  r.response.ok,
  "Admin can edit tournament details with full operator permissions",
);
r = (await site()).tournaments.find((t) => t.id === "qa-event");
check(
  r.fee === "300.000 đồng/VĐV" && r.feeAmount === "300000",
  "Athlete fee is normalized for display",
);
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-pair-event",
    data: {
      ...event,
      feeUnit: "pair",
      categories: ["Đơn nam 3.0", "Đôi nam 3.0"],
      categorySlots: { "Đơn nam 3.0": 3, "Đôi nam 3.0": 3 },
    },
  },
  admin,
);
check(r.response.ok, "Admin can create multiple categories in one tournament");
check(
  (await site()).tournaments.find((t) => t.id === "qa-pair-event").fee ===
    "300.000 đồng/cặp",
  "Pair fee is normalized for display",
);
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-bad-fee",
    data: { ...event, feeAmount: "300k" },
  },
  admin,
);
check(r.response.status === 400, "Invalid money input rejected");
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-bad-dates",
    data: { ...event, opensAt: "2099-12-01" },
  },
  admin,
);
check(r.response.status === 400, "Registration dates must be ordered");
const users = [],
  people = [];
for (let n = 1; n <= 3; n++) {
  r = await req("/api/signup", profile(n));
  check(r.response.ok, "Athlete profile " + n + " created");
  users.push(r.cookie);
  const p = (await req("/api/auth", undefined, r.cookie)).data.athlete;
  people.push(p);
}
r = await req("/api/signup", { ...profile(1), phone: "+84909900001" });
check(
  r.response.status === 409,
  "Phone normalization prevents duplicate profile",
);
r = await req("/api/signup", { ...profile(4), gender: "Khác" });
check(r.response.status === 400, "Gender remains Nam or Nữ");
for (const rating of ["", "3,45", "abc", "123.4", "3.456", "3"]) {
  r = await req("/api/signup", { ...profile(50), rating });
  check(
    r.response.status === 400,
    "Invalid or missing decimal rating rejected: " + JSON.stringify(rating),
  );
}
const photo = people[0].photo;
check(!!photo, "Optional personal photo saved with new profile");
check(
  (await fetch(base + photo)).status === 404,
  "Personal photo is not public",
);
check(
  (await fetch(base + photo, { headers: { Cookie: users[1] } })).status === 404,
  "Another athlete cannot read the photo",
);
let photoResponse = await fetch(base + photo, {
  headers: { Cookie: users[0] },
});
check(
  photoResponse.ok &&
    photoResponse.headers.get("cache-control").includes("private"),
  "Athlete can read own photo without public caching",
);
check(
  (await fetch(base + photo, { headers: { Cookie: staff } })).ok,
  "Staff can view a personal photo for review",
);
check(
  (
    await fetch(base + "/api/admin/tournaments/qa-event/export", {
      headers: { Cookie: admin },
    })
  ).status === 409,
  "Excel export is blocked before official finalization",
);
const ids = [];
for (let n = 0; n < 3; n++) {
  r = await req(
    "/api/registrations",
    {
      tournamentId: "qa-event",
      category: "Đơn nam 3.0",
      rating: profile(n + 1).rating,
      consent: true,
    },
    users[n],
  );
  check(
    r.response.status === 201,
    "Athlete " + (n + 1) + " submits event entry",
  );
  ids.push(r.data.id);
}
r = await post({ action: "review", id: ids[0], status: "provisional" }, staff);
check(r.response.status === 400, "Review requires approved athlete profile");
for (const p of people) {
  r = await post(
    { action: "profile", id: p.id, data: { ...p, status: "approved" } },
    staff,
  );
  assert.ok(r.response.ok);
}
check(true, "Staff can approve all athlete profiles");
r = await req("/api/site");
check(
  r.data.ranking.some((p) => p.id === people[2].id && p.rating === "2.15"),
  "Decimal rating is retained in approved ranking",
);
r = await post(
  {
    action: "profile",
    id: people[0].id,
    data: { ...people[0], phone: people[1].phone, status: "approved" },
  },
  admin,
);
check(r.response.status === 409, "Admin cannot assign a duplicate phone");
r = await post({ action: "review", id: ids[0], status: "provisional" }, staff);
check(r.response.ok, "Staff selects athlete A");
r = await post(
  {
    action: "review",
    id: ids[1],
    status: "rejected",
    note: "Private review reason",
  },
  admin,
);
check(r.response.ok, "Admin can reject internally");
let publicRows = (await req("/api/participants/qa-event")).data.participants;
check(
  publicRows.every((p) => p.status === "pending"),
  "Unpublished reviews stay pending publicly",
);
let ownRows = (await req("/api/participants/qa-event", undefined, users[0]))
  .data.participants;
check(
  ownRows.filter((p) => p.isMe).length === 1 &&
    ownRows.find((p) => p.isMe).id === ids[0],
  "Public roster identifies only the signed-in athlete for highlighting",
);
check(
  publicRows.every((p) => !p.isMe && !("photo" in p)),
  "Anonymous roster exposes neither ownership nor private photo",
);
check(
  publicRows.every((p) => !("phone" in p) && !("email" in p)),
  "Public roster excludes contact data",
);
r = await post(
  {
    action: "publish-provisional",
    id: "qa-event",
    confirm: false,
    expectedVersion: 0,
  },
  staff,
);
check(r.response.status === 400, "Publication requires explicit confirmation");
r = await post(
  {
    action: "publish-provisional",
    id: "qa-event",
    confirm: true,
    expectedVersion: 0,
  },
  staff,
);
check(
  r.response.ok && r.data.publicationVersion === 1,
  "First checkpoint works with only one of two slots filled",
);
publicRows = (await req("/api/participants/qa-event")).data.participants;
check(
  publicRows.find((p) => p.id === ids[0]).status === "approved" &&
    publicRows.find((p) => p.id === ids[1]).status === "pending",
  "Checkpoint publishes A officially while rejection B stays pending",
);
r = (await site()).tournaments.find((t) => t.id === "qa-event");
check(
  r.approved === 1 && r.capacity === 2 && r.status === "open",
  "Public capacity shows only official 1/2 and checkpoint keeps registration open",
);
r = await req("/api/auth", undefined, users[1]);
check(
  r.data.registrations.find((e) => e.id === ids[1]).status === "pending" &&
    !r.data.registrations.find((e) => e.id === ids[1]).adminNote,
  "Athlete account hides unpublished rejection and its private note",
);
r = await post({ action: "review", id: ids[1], status: "provisional" }, admin);
check(
  r.response.ok,
  "Rejected entry can be reconsidered before the next checkpoint",
);
check(
  (await req("/api/participants/qa-event")).data.participants.find(
    (p) => p.id === ids[1],
  ).status === "pending",
  "Draft reconsideration does not leak before publication",
);
r = await post(
  {
    action: "publish-provisional",
    id: "qa-event",
    confirm: true,
    expectedVersion: 1,
  },
  admin,
);
check(
  r.response.ok && r.data.publicationVersion === 2,
  "Admin can publish a second checkpoint",
);
check(
  (await site()).tournaments.find((t) => t.id === "qa-event").approved === 2,
  "Second checkpoint updates public approved count to 2/2",
);
r = await post({ action: "review", id: ids[0], status: "rejected" }, staff);
check(
  r.response.ok,
  "Operator may change a previously official entry internally",
);
check(
  (await req("/api/participants/qa-event")).data.participants.find(
    (p) => p.id === ids[0],
  ).status === "approved",
  "Previous public snapshot stays official until republished",
);
r = await post(
  {
    action: "publish-provisional",
    id: "qa-event",
    confirm: true,
    expectedVersion: 2,
  },
  staff,
);
check(
  r.response.ok,
  "Third checkpoint can update a previously published roster",
);
check(
  (await req("/api/participants/qa-event")).data.participants.find(
    (p) => p.id === ids[0],
  ).status === "pending",
  "Pre-deadline rejection is still masked after repeated checkpoints",
);
r = await post(
  {
    action: "publish-provisional",
    id: "qa-event",
    confirm: true,
    expectedVersion: 3,
  },
  admin,
);
check(
  r.response.ok,
  "Repeated publication is supported even when roster is unchanged",
);
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-event",
    data: { ...event, deadline: "2020-02-01" },
  },
  admin,
);
check(
  r.response.ok,
  "Admin can edit event information after earlier publications",
);
check(
  (await req("/api/participants/qa-event")).data.participants.find(
    (p) => p.id === ids[0],
  ).status === "pending",
  "Passing deadline alone does not disclose an unannounced rejection",
);
r = await req(
  "/api/registrations",
  { tournamentId: "qa-event", category: "Đơn nam 3.0", consent: true },
  users[0],
);
check(r.response.status === 400, "Registration is blocked after the deadline");
r = await post(
  { action: "finalize", id: "qa-event", confirm: true, expectedVersion: 4 },
  staff,
);
check(
  r.response.ok && r.data.rejectionsPublished,
  "Post-deadline checkpoint publishes actual rejections",
);
let finalizedEvent = (await site()).tournaments.find(
  (t) => t.id === "qa-event",
);
check(
  !!finalizedEvent.officialAt && eventStatus(finalizedEvent) === "finalized",
  "Finalization changes effective event status",
);
r = await post(
  {
    action: "publish-provisional",
    id: "qa-event",
    confirm: true,
    expectedVersion: 5,
  },
  staff,
);
check(
  r.response.status === 409,
  "Cannot replace official list with a provisional publication",
);
const exportPath = "/api/admin/tournaments/qa-event/export";
check(
  (await fetch(base + exportPath)).status === 401,
  "Official Excel requires operator login",
);
check(
  (await fetch(base + exportPath, { headers: { Cookie: users[0] } })).status ===
    403,
  "Athletes cannot export private official records",
);
const excel = await fetch(base + exportPath, { headers: { Cookie: staff } }),
  excelBytes = new Uint8Array(await excel.arrayBuffer());
check(
  excel.ok &&
    excel.headers.get("content-type").includes("spreadsheetml") &&
    excelBytes[0] === 80 &&
    excelBytes[1] === 75,
  "Staff exports a real XLSX workbook",
);
writeFileSync("work/export-v5.xlsx", excelBytes);
const excelCheck = spawnSync(
  "python3",
  [
    "-c",
    `import zipfile,xml.etree.ElementTree as E,json
z=zipfile.ZipFile('work/export-v5.xlsx');assert z.testzip() is None
root=E.fromstring(z.read('xl/worksheets/sheet1.xml'));ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
rows=[[t.text or '' for t in row.findall('.//s:t',ns)] for row in root.findall('.//s:row',ns)]
print(json.dumps(rows))`,
  ],
  { encoding: "utf8" },
);
assert.equal(excelCheck.status, 0, excelCheck.stderr);
const exportedRows = JSON.parse(excelCheck.stdout);
check(
  exportedRows.length === 2 && exportedRows[1][1] === people[1].name,
  "Excel contains only published official athletes",
);
publicRows = (await req("/api/participants/qa-event")).data.participants;
check(
  publicRows.find((p) => p.id === ids[0]).status === "rejected" &&
    publicRows.find((p) => p.id === ids[2]).status === "pending",
  "Only explicitly rejected entries become rejected; undecided entries remain pending",
);
check(
  publicRows[0].status === "approved" &&
    publicRows.at(-1).status === "rejected",
  "Official entries appear before rejected entries",
);
r = await post({ action: "review", id: ids[0], status: "provisional" }, admin);
check(r.response.ok, "Rejections may be reconsidered after deadline");
r = await post(
  { action: "finalize", id: "qa-event", confirm: true, expectedVersion: 5 },
  admin,
);
check(r.response.ok, "Further post-deadline publication is permitted");
check(
  (await req("/api/participants/qa-event")).data.participants.find(
    (p) => p.id === ids[0],
  ).status === "approved",
  "Republished reconsideration becomes official",
);
r = await post({ action: "review", id: ids[2], status: "provisional" }, staff);
check(
  r.response.status === 409,
  "Quota still prevents overbooking after several publications",
);
const race = await Promise.all([
  post(
    { action: "finalize", id: "qa-event", confirm: true, expectedVersion: 6 },
    admin,
  ),
  post(
    { action: "finalize", id: "qa-event", confirm: true, expectedVersion: 6 },
    staff,
  ),
]);
check(
  race.filter((r) => r.response.ok).length === 1 &&
    race.filter((r) => r.response.status === 409).length === 1,
  "Same-version concurrent publication only succeeds once",
);
r = await post(
  {
    action: "review",
    id: ids[1],
    status: "rejected",
    note: "Private after extension",
  },
  admin,
);
assert.ok(r.response.ok);
r = await post(
  { action: "finalize", id: "qa-event", confirm: true, expectedVersion: 7 },
  admin,
);
check(
  r.response.ok,
  "Rejected result can be published in a later post-deadline checkpoint",
);
r = await post(
  { action: "save", kind: "tournament", id: "qa-event", data: event },
  admin,
);
check(r.response.ok, "Admin may extend the deadline after a publication");
check(
  (await req("/api/participants/qa-event")).data.participants.find(
    (p) => p.id === ids[1],
  ).status === "pending",
  "Extended deadline masks published rejection until deadline",
);
r = await req("/api/auth", undefined, users[1]);
const hidden = r.data.registrations.find((e) => e.id === ids[1]);
check(
  hidden.status === "pending" &&
    hidden.publishedStatus === "pending" &&
    !hidden.publishedNote &&
    !hidden.adminNote,
  "Athlete API also masks snapshot metadata after deadline extension",
);
check(
  (await site()).tournaments.find((t) => t.id === "qa-event").counts[
    "Đơn nam 3.0"
  ].rejected === 0,
  "Public counts do not leak a rejection after deadline extension",
);
const end = deadlineAt("2030-12-31"),
  boundary = { status: "open", opensAt: "2030-12-01", deadline: "2030-12-31" };
check(
  eventStatus(boundary, end) === "open",
  "Last millisecond of 23:59 remains within registration period",
);
check(
  eventStatus(boundary, end + 1) === "closed",
  "Next day closes registration exactly after 23:59",
);
check(
  eventStatus(boundary, new Date("2030-11-30T23:59:59.999+07:00").getTime()) ===
    "soon",
  "Opening date uses Vietnam midnight",
);
check(
  eventStatus(boundary, new Date("2030-12-01T00:00:00+07:00").getTime()) ===
    "open",
  "Registration opens at midnight of selected date",
);
const otherCategoryIds = [];
for (const category of ["Đơn nam 3.0", "Đôi nam 3.0"]) {
  r = await req(
    "/api/registrations",
    {
      tournamentId: "qa-pair-event",
      category,
      partner: "Đồng đội mẫu",
      rating: "3.25",
      consent: true,
    },
    users[0],
  );
  check(
    r.response.status === 201,
    "Same athlete submits separate entry for " + category,
  );
  otherCategoryIds.push(r.data.id);
}
check(
  new Set(otherCategoryIds).size === 2,
  "Each category creates its own entry ID",
);
r = await req(
  "/api/registrations",
  {
    tournamentId: "qa-pair-event",
    category: "Đơn nam 3.0",
    rating: "3.25",
    consent: true,
  },
  users[0],
);
check(
  r.response.status === 409,
  "Duplicate same athlete/event/category entry remains blocked",
);
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-future",
    data: { ...event, opensAt: "2099-01-01" },
  },
  admin,
);
check(
  r.response.ok,
  "Event with future registration opening date can be saved",
);
r = await req(
  "/api/registrations",
  { tournamentId: "qa-future", category: "Đơn nam 3.0", consent: true },
  users[0],
);
check(
  r.response.status === 400,
  "Future opening date blocks early registrations",
);
const stages = { open: 0, soon: 1, closed: 2, finalized: 3 };
const ts = (await site()).tournaments.map((t) => eventStatus(t));
check(
  ts.every((s, i) => i === 0 || stages[ts[i - 1]] <= stages[s]),
  "Events sort open, soon, closed",
);
r = await post(
  { action: "save", kind: "article", id: "qa-rich-article", data: article },
  staff,
);
check(
  r.response.ok && r.data.pending,
  "Staff rich article enters approval queue",
);
let proposal = r.data.id;
check(
  !(await site()).articles.some((a) => a.id === "qa-rich-article"),
  "Staff article is absent from public feed before approval",
);
check(
  (await site()).topics.includes("Chủ đề mới QA"),
  "New topic is persisted for future single-topic selection",
);
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-rich-article",
    submissionId: proposal,
    data: { ...article, title: "Staff khác sửa" },
  },
  staff2,
);
check(r.response.status === 403, "Staff cannot edit another staff proposal");
r = await post(
  {
    action: "publish",
    submissionId: proposal,
    data: { ...article, title: "Bài định dạng được admin duyệt" },
  },
  admin,
);
check(r.response.ok, "Admin edits and publishes staff rich article");
check(
  (await site()).articles.find((a) => a.id === "qa-rich-article").body ===
    article.body,
  "Bold italic and paragraph size markup is preserved",
);
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-rich-article",
    data: { ...article, title: "Bản sửa chưa duyệt" },
  },
  staff,
);
proposal = r.data.id;
check(
  r.response.ok &&
    (await site()).articles.find((a) => a.id === "qa-rich-article").title ===
      "Bài định dạng được admin duyệt",
  "Staff edit leaves published article intact",
);
r = await post(
  { action: "reject-submission", id: proposal, note: "Bổ sung thông tin" },
  admin,
);
check(r.response.ok, "Admin may return staff content");
r = await post({ action: "publish", submissionId: proposal }, staff);
check(r.response.status === 403, "Staff cannot self-publish");
const blob = new Blob([readFileSync("public/pickleball-court.jpg")], {
    type: "image/jpeg",
  }),
  form = new FormData();
form.append("file", blob, "court.jpg");
let upload = await fetch(base + "/api/upload", {
  method: "POST",
  headers: { Origin: base, Cookie: admin },
  body: form,
});
let asset = await upload.json();
check(upload.ok, "Admin has image upload permission");
check(
  (await fetch(base + asset.url)).status === 404,
  "Unpublished upload remains private",
);
r = await post(
  {
    action: "save",
    kind: "album",
    id: "qa-album",
    data: {
      ...album,
      cover: asset.url,
      photos: [...album.photos, { url: asset.url, description: "Ảnh upload" }],
    },
  },
  staff,
);
check(
  r.response.ok && r.data.pending,
  "Staff album with multiple images enters approval queue",
);
proposal = r.data.id;
check(
  !(await site()).albums.some((a) => a.id === "qa-album"),
  "Pending album is not public",
);
r = await post({ action: "publish", submissionId: proposal }, admin);
check(r.response.ok, "Admin can publish an album");
const publicAlbum = (await site()).albums.find((a) => a.id === "qa-album");
check(
  publicAlbum.photoLinks.length === 2 && publicAlbum.videoLinks.length === 2,
  "Newline image and video links become separate arrays",
);
check(
  publicAlbum.photos.length === 3 &&
    publicAlbum.photos[1].description === "Khoảnh khắc buổi tập",
  "Album stores multiple photos and individual descriptions",
);
check(
  (await fetch(base + asset.url)).status === 200,
  "Album upload becomes public after approval",
);
check(
  (await fetch(base + asset.url, { headers: { Range: "bytes=0-99" } }))
    .status === 206,
  "Published uploads support byte ranges",
);
check(
  (await fetch(base + asset.url, { headers: { Range: "bytes=999999999-" } })).status === 416,
  "VPS storage rejects unsatisfiable byte ranges with HTTP 416",
);
check(
  (await fetch(base + asset.url, { headers: { Range: "bytes=0-99", "If-Range": "stale-etag" } })).status === 200,
  "Stale If-Range returns the complete file",
);
r = await post(
  {
    action: "save",
    kind: "album",
    id: "qa-invalid-album",
    data: { ...album, photoLinks: "javascript:alert(1)" },
  },
  admin,
);
check(r.response.status === 400, "Unsafe album links rejected");
r = await post({ action: "save", kind: "media", data: {} }, admin);
check(r.response.status === 400, "Obsolete image/video content kind removed");
check(
  !!publicAlbum.publishedAt &&
    publicAlbum.date !== "2099-01-01" &&
    Math.abs(Date.now() - new Date(publicAlbum.publishedAt).getTime()) < 60000,
  "Album uses actual server publication time instead of a supplied date",
);
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-singles",
    data: { ...event, pairingMode: "singles" },
  },
  admin,
);
check(r.response.ok, "Singles-only pairing mode can be created");
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-invalid-singles",
    data: {
      ...event,
      pairingMode: "singles",
      categories: ["Đôi nam"],
      categorySlots: { "Đôi nam": 4 },
    },
  },
  admin,
);
check(
  r.response.status === 400,
  "Singles-only mode rejects doubles categories",
);
for (const mode of ["self", "draw"]) {
  const tournamentId = "qa-pair-" + mode,
    category = "Đôi nam 3.0";
  r = await post(
    {
      action: "save",
      kind: "tournament",
      id: tournamentId,
      data: {
        ...event,
        pairingMode: mode,
        categories: [category],
        categorySlots: { [category]: 8 },
      },
    },
    admin,
  );
  assert.ok(r.response.ok);
  r = await req(
    "/api/registrations",
    { tournamentId, category, rating: "3.5", consent: true },
    users[0],
  );
  check(
    mode === "self" ? r.response.status === 400 : r.response.status === 201,
    "Partner requirement matches pairing mode: " + mode,
  );
}
r = await req(
  "/api/registrations",
  {
    tournamentId: "qa-singles",
    category: event.categories[0],
    rating: "3,5",
    consent: true,
  },
  users[0],
);
check(
  r.response.status === 400,
  "Event entry validates decimal rating on server",
);
const settings = (await site()).settings;
check(Array.isArray(settings.sponsors) && settings.sponsors.length === 0,
  "Existing settings default to an empty sponsor list");
r = await post(
  {
    action: "save",
    kind: "settings",
    data: {
      ...settings,
      contacts: [
        { name: "Liên hệ A", phone: "0901234567" },
        { name: "Liên hệ B", phone: "0902345678" },
      ],
      zaloUrl: "https://zalo.me/g/qa",
      facebookUrl: "https://www.facebook.com/qa",
      facebookName: "Fanpage CLB QA",
      clubBannerImage: "/pickleball-ball.jpg",
      sponsors: [
        { name: "Nhà tài trợ A", url: "https://example.com/a" },
        { name: "Nhà tài trợ B", url: "" },
      ],
    },
  },
  admin,
);
check(
  r.response.ok,
  "Admin retains exclusive club and social settings permissions",
);
const sponsorSettings = (await site()).settings;
check(sponsorSettings.facebookName === "Fanpage CLB QA" &&
  sponsorSettings.facebookUrl === "https://www.facebook.com/qa",
  "Facebook display name persists independently from the fanpage link");
check(sponsorSettings.sponsors.length === 2 &&
  sponsorSettings.sponsors[0].name === "Nhà tài trợ A" &&
  sponsorSettings.sponsors[0].url === "https://example.com/a" &&
  sponsorSettings.sponsors[1].name === "Nhà tài trợ B" &&
  sponsorSettings.sponsors[1].url === "",
  "Sponsor names, optional links and display order persist to the public API");
for (const [sponsors, label] of [
  [[{ name: "Unsafe", url: "javascript:alert(1)" }], "Unsafe sponsor links rejected"],
  [[{ name: "", url: "https://example.com" }], "Sponsor links require a name"],
  ["invalid", "Malformed sponsor list rejected"],
  [Array.from({ length: 51 }, () => ({ name: "Sponsor", url: "" })), "Sponsor list size is bounded"],
]) {
  r = await post({ action: "save", kind: "settings", data: { ...sponsorSettings, sponsors } }, admin);
  check(r.response.status === 400, label);
}
r = await post({ action: "save", kind: "settings", data: { ...sponsorSettings, sponsors: [] } }, staff);
check(r.response.status === 403, "Staff cannot edit footer sponsors");
check(JSON.stringify((await site()).settings.sponsors) === JSON.stringify(sponsorSettings.sponsors),
  "Rejected sponsor updates preserve the published sponsor list");
r = await req("/api/messages", {
  name: "Khách QA",
  phone: "0909900099",
  body: "Lời nhắn kiểm thử",
});
check(r.response.status === 201, "Contact form still stores messages");
let message = (await adminData()).messages.find((m) => m.name === "Khách QA");
r = await post({ action: "message-read", id: message.id, read: true }, staff);
check(r.response.ok, "Staff can read club messages");
r = await post(
  { action: "staff-create", username: "qa.staff", password },
  admin,
);
check(r.response.ok, "Admin can create staff");
let newStaff = (await adminData()).accounts.find(
  (a) => a.username === "qa.staff",
);
const oldSession = await login("qa.staff");
r = await post(
  {
    action: "staff-update",
    id: newStaff.id,
    username: "qa.staff.new",
    password: "New-QA-Password!",
  },
  admin,
);
check(r.response.ok, "Admin can edit staff username and password");
check(
  !(await req("/api/auth", undefined, oldSession)).data.account,
  "Staff credential change revokes old session",
);
await login("qa.staff.new", "New-QA-Password!");
r = await post(
  { action: "staff-status", id: newStaff.id, disabled: true },
  staff,
);
check(r.response.status === 403, "Staff cannot manage other staff accounts");
r = await post(
  { action: "staff-status", id: newStaff.id, disabled: true },
  admin,
);
check(r.response.ok, "Admin can disable staff accounts");
check(
  (await site()).settings.contacts.length === 2 &&
    (await site()).settings.contacts[1].name === "Liên hệ B",
  "Admin stores two contact people",
);
// Pruning tests intentionally run only in the disposable DB, never localhost:5173 state.
for (let i = 1; i <= 22; i++) {
  const date = "2099-02-" + String(i).padStart(2, "0");
  r = await post(
    {
      action: "save",
      kind: "article",
      id: "qa-retain-article-" + i,
      data: { ...article, date, title: "Tin " + i },
    },
    admin,
  );
  assert.ok(r.response.ok, JSON.stringify(r.data));
  r = await post(
    {
      action: "save",
      kind: "album",
      id: "qa-retain-album-" + i,
      data: { ...album, date, title: "Album " + i },
    },
    admin,
  );
  assert.ok(r.response.ok, JSON.stringify(r.data));
}
let data = await site();
check(
  data.articles.length === 20 && data.albums.length === 20,
  "Public feed keeps exactly latest 20 articles and 20 albums",
);
check(
  data.articles[0].id === "qa-retain-article-22" &&
    !data.articles.some((a) => a.id === "qa-retain-article-1"),
  "Article retention keeps latest by actual publication time",
);
check(
  data.albums[0].id === "qa-retain-album-22" &&
    !data.albums.some((a) => a.id === "qa-retain-album-1"),
  "Album retention keeps latest by actual publication time",
);
const command = spawnSync(
  process.execPath,
  [
    "tests/sql.mjs",
    "SELECT kind,COUNT(*) AS total FROM content WHERE kind IN ('article','album') GROUP BY kind",
  ],
  { encoding: "utf8" },
);
assert.equal(command.status, 0, command.stderr);
const totals = JSON.parse(command.stdout)[0].results;
check(
  totals.every((t) => t.total === 20) && totals.length === 2,
  "Database physically removes older published records instead of only hiding them",
);
// Leave examples for optional UI QA without changing the 20 item cap.
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-retain-article-22",
    data: {
      ...article,
      date: "2099-02-22",
      title: "Bài định dạng được admin duyệt",
    },
  },
  admin,
);
assert.ok(r.response.ok);
r = await post(
  {
    action: "save",
    kind: "album",
    id: "qa-retain-album-22",
    data: { ...album, date: "2099-02-22" },
  },
  admin,
);
assert.ok(r.response.ok);

const structuredArticle = {
  ...article,
  title: "Bài viết chia đoạn",
  sections: [
    {
      heading: "Tiêu đề đoạn đầu",
      body: "Văn bản thường của đoạn đầu.\n\nĐây vẫn thuộc đoạn đầu.",
    },
    { heading: "Tiêu đề đoạn hai", body: "Văn bản của đoạn thứ hai." },
  ],
};
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-sections",
    data: structuredArticle,
  },
  admin,
);
check(r.response.ok, "Article accepts explicit heading/body sections");
let publishedArticle = (await site()).articles.find(
  (a) => a.id === "qa-sections",
);
check(
  publishedArticle.sections.length === 2 &&
    publishedArticle.sections[1].heading === "Tiêu đề đoạn hai" &&
    publishedArticle.sections[0].body.includes("\n\n"),
  "Ordered article sections retain their headings and long text",
);
check(
  publishedArticle.date !== "2099-01-01" &&
    Math.abs(Date.now() - Date.parse(publishedArticle.publishedAt)) < 60000,
  "Article publication time comes from the server",
);
const firstArticleTime = publishedArticle.publishedAt;
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-sections",
    data: {
      ...structuredArticle,
      publishedAt: "2099-01-01T00:00:00Z",
      date: "2099-01-01",
    },
  },
  admin,
);
check(
  r.response.ok &&
    (await site()).articles.find((a) => a.id === "qa-sections").publishedAt ===
      firstArticleTime,
  "Editing preserves first publication time and ignores forged dates",
);
check(
  articleSections("## Đoạn cũ\n\nNội dung cũ\n\n## Đoạn tiếp\n\nNội dung tiếp")
    .length === 2,
  "Existing article format remains editable as sections",
);
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-empty-sections",
    data: { ...article, body: "", sections: [{ heading: "", body: "" }] },
  },
  admin,
);
check(r.response.status === 400, "An entirely empty article body is rejected");
const opening = new Date("2030-12-01T00:00:00+07:00").getTime();
check(
  eventStatus({ ...boundary, status: "soon" }, opening) === "open",
  "Stored soon status automatically opens at Vietnam midnight",
);
check(
  nextEventTransitionDelay([boundary], opening - 1000) === 1050,
  "An open browser schedules the next registration boundary",
);
r = await post(
  {
    action: "save",
    kind: "tournament",
    id: "qa-auto-past",
    data: {
      ...event,
      status: "soon",
      description: "",
      categorySlots: { [event.categories[0]]: 100 },
    },
  },
  admin,
);
check(r.response.ok, "Tournament rules/details are optional");
let autoEvent = (await site()).tournaments.find((t) => t.id === "qa-auto-past");
check(
  autoEvent.status === "open" && autoEvent.capacity === 100,
  "Creating a tournament during its registration window opens it automatically",
);
const legacyWrite = spawnSync(
  process.execPath,
  [
    "tests/sql.mjs",
    "UPDATE content SET data=json_set(data,'$.status','soon') WHERE id='qa-auto-past'",
  ],
  { encoding: "utf8" },
);
assert.equal(legacyWrite.status, 0, legacyWrite.stderr);
check(
  (await site()).tournaments.find((t) => t.id === "qa-auto-past").status ===
    "open",
  "Legacy scheduled tournaments open without a database rewrite",
);
r = await req(
  "/api/registrations",
  {
    tournamentId: "qa-auto-past",
    category: event.categories[0],
    rating: "3.5",
    consent: true,
  },
  users[0],
);
check(
  r.response.status === 201,
  "Atomic registration insert accepts automatically opened legacy tournaments",
);
// Only admin can change an admin account; credential tests stay in this disposable state.
const adminAccount = (await adminData()).account,
  previousAdminCookie = admin;
r = await post(
  {
    action: "account-update",
    id: adminAccount.id,
    username: "qa-admin",
    password: "QA-Admin-New-2026!",
  },
  staff,
);
check(r.response.status === 403, "Staff cannot edit admin credentials");
r = await post(
  {
    action: "account-update",
    id: adminAccount.id,
    username: "qa-admin",
    password: "QA-Admin-New-2026!",
  },
  admin,
);
check(
  r.response.ok && !!r.cookie,
  "Admin can update own credentials with a replacement session",
);
admin = r.cookie;
check(
  (await req("/api/admin", undefined, previousAdminCookie)).response.status ===
    401,
  "Old admin sessions are revoked after credential changes",
);
const changedAdmin = await login("qa-admin", "QA-Admin-New-2026!");
check(
  (await req("/api/auth", undefined, changedAdmin)).data.account.username ===
    "qa-admin",
  "New admin username and password work",
);
r = await post(
  { action: "delete", kind: "account", id: adminAccount.id },
  admin,
);
check(
  r.response.status === 400,
  "Admin account cannot be deleted through content operations",
);
r = await post(
  { action: "staff-status", id: adminAccount.id, disabled: true },
  admin,
);
check(
  r.response.status === 403 &&
    (await req("/api/auth", undefined, admin)).data.account?.role === "admin",
  "Admin account cannot be disabled as staff",
);
r = await post(
  {
    action: "account-update",
    id: adminAccount.id,
    username: "admin",
    password: adminPassword,
  },
  admin,
);
assert.ok(r.response.ok && r.cookie);
admin = r.cookie;
// Approval operation labels and a real cap on approved log records.
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-log-pending",
    data: structuredArticle,
  },
  staff,
);
const pendingLogId = r.data.id;
check(
  (await adminData()).submissions.find((s) => s.id === pendingLogId)
    .operation === "create",
  "New content request is labelled create",
);
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-log-rejected",
    data: structuredArticle,
  },
  staff,
);
const rejectedLogId = r.data.id;
await post(
  {
    action: "reject-submission",
    id: rejectedLogId,
    note: "Kiểm tra giữ bản trả về",
  },
  admin,
);
const approvedLogIds = [];
for (let i = 1; i <= 32; i++) {
  const target = "qa-log-" + i;
  r = await post(
    {
      action: "save",
      kind: "article",
      id: target,
      data: { ...structuredArticle, title: "Bài kiểm tra log " + i },
    },
    staff,
  );
  assert.ok(r.response.ok, JSON.stringify(r.data));
  approvedLogIds.push(r.data.id);
  r = await post({ action: "publish", submissionId: r.data.id }, admin);
  assert.ok(r.response.ok, JSON.stringify(r.data));
}
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-log-32",
    data: { ...structuredArticle, title: "Đề xuất chỉnh sửa đã đăng" },
  },
  staff,
);
const editLogId = r.data.id;
check(
  (await adminData()).submissions.find((s) => s.id === editLogId).operation ===
    "edit",
  "Editing existing content is labelled edit",
);
r = await post({ action: "publish", submissionId: editLogId }, admin);
assert.ok(r.response.ok);
const submissionLog = (await adminData()).submissions,
  approvedLogs = submissionLog.filter((s) => s.status === "approved");
check(
  approvedLogs.length === 30 &&
    !approvedLogs.some((s) => s.id === approvedLogIds[0]) &&
    approvedLogs.some((s) => s.id === editLogId),
  "Approved history keeps only the newest 30 approvals",
);
check(
  submissionLog.some((s) => s.id === pendingLogId && s.status === "pending") &&
    submissionLog.some(
      (s) => s.id === rejectedLogId && s.status === "rejected",
    ),
  "Approval retention preserves pending and rejected requests",
);
const logCount = spawnSync(
  process.execPath,
  [
    "tests/sql.mjs",
    "SELECT COUNT(*) AS total FROM submissions WHERE status='approved'",
  ],
  { encoding: "utf8" },
);
assert.equal(logCount.status, 0, logCount.stderr);
check(
  JSON.parse(logCount.stdout)[0].results[0].total === 30,
  "Approval history is physically capped in SQLite",
);
r = await post(
  {
    action: "save",
    kind: "article",
    id: "qa-retain-article-22",
    data: structuredArticle,
  },
  admin,
);
assert.ok(r.response.ok);
r = await post(
  { action: "save", kind: "album", id: "qa-retain-album-22", data: album },
  admin,
);
assert.ok(r.response.ok);
r = await req("/api/auth", undefined, admin, "DELETE");
check(
  r.response.ok && !(await req("/api/auth", undefined, admin)).data.account,
  "Logout still revokes operator session",
);
console.log(
  "\n" + checks + " integration checks passed in the isolated database.",
);
console.log(
  "UI fixtures: /tin-tuc/qa-retain-article-22 and /thu-vien/qa-retain-album-22",
);
