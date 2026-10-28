/** Append deterministic, fictional training scenarios to a freshly prepared local seed. */
import { readFileSync, writeFileSync } from "node:fs";
import { pbkdf2Sync, randomUUID } from "node:crypto";
const q = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const js = (v) => q(JSON.stringify(v));
const sql = [];
const now = "2026-10-24T10:00:00.000Z";
const profileCreated = "2026-10-12T08:00:00.000Z";
const password = "TapDuyet@2026!";
const hash = (p) => {
  const salt = randomUUID();
  return salt + ":" + pbkdf2Sync(p, salt, 100000, 32, "sha256").toString("hex");
};
const albumData = (data) => ({
  title: data.title,
  date: (data.month || "2026-10") + "-01",
  description: "Album thực hành quản trị.",
  cover:
    data.type === "image"
      ? data.url
      : data.thumbnail || "/pickleball-court.jpg",
  photoLinks: [],
  videoLinks: data.type === "video" ? [data.url] : [],
  photos:
    data.type === "image" ? [{ url: data.url, description: data.title }] : [],
  demo: true,
});
const insertContent = (id, kind, data) =>
  sql.push(
    `INSERT INTO content(id,kind,data,created_at) VALUES(${q(id)},${q(kind === "media" ? "album" : kind)},${js(kind === "media" ? albumData(data) : data)},${q(now)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data;`,
  );
const event = (id, data, finalized = false) => {
  const t = {
    id,
    title: "Giải thực hành",
    subtitle: "Dữ liệu tập quản trị",
    date: "2026-11-01",
    deadline: "2026-10-29",
    location: "Xã Hoàn Lão, tỉnh Quảng Trị",
    categories: ["Đơn nam"],
    categorySlots: { "Đơn nam": 2 },
    capacity: 2,
    fee: "100.000 đồng/VĐV",
    pairingMode: "self",
    description:
      "DỮ LIỆU THỰC HÀNH\nCác hồ sơ và số suất dùng để tập xét duyệt website.",
    image: "/pickleball-court.jpg",
    posters: ["/pickleball-court.jpg"],
    status: "open",
    featured: false,
    demo: true,
    ...data,
  };
  t.opensAt = ["2026-10-12", t.deadline].sort()[0];
  t.feeAmount = String(t.fee).replace(/\D/g, "");
  t.feeUnit = "athlete";
  insertContent(id, "tournament", t);
  sql.push(
    `INSERT INTO event_state(tournament_id,finalized_at,finalized_by,finalization_id,publication_version) VALUES(${q(id)},${finalized ? q("2026-10-16T09:00:00.000Z") : "NULL"},${finalized ? q("local-admin") : "NULL"},${finalized ? q("training-finalization") : "NULL"},${finalized ? 1 : 0}) ON CONFLICT(tournament_id) DO UPDATE SET finalized_at=excluded.finalized_at,finalized_by=excluded.finalized_by,finalization_id=excluded.finalization_id,publication_version=excluded.publication_version;`,
  );
  return t;
};
sql.push(
  `UPDATE content SET data=json_set(data,'$.featured',json('false')) WHERE kind='tournament';`,
);
sql.push(
  `UPDATE content SET data=json_set(data,'$.address','Xã Hoàn Lão, tỉnh Quảng Trị','$.facebookUrl','','$.clubBannerImage','/pickleball-court.jpg') WHERE id='settings';`,
);
const featured = event("giao-luu-the-he-7x-2026", {
  title: "Giao lưu thế hệ 7X · Hoàn Lão 2026",
  subtitle: "Kết nối · Giao lưu · Lan tỏa đam mê",
  date: "2026-10-31",
  deadline: "2026-10-29",
  location: "Cụm sân Eco khu đô thị Bàu Ri",
  categories: ["Đôi nam"],
  categorySlots: { "Đôi nam": 6 },
  capacity: 6,
  fee: "500.000 đồng/VĐV",
  pairingMode: "draw",
  image: "/giao-luu-the-he-7x.png",
  posters: ["/giao-luu-the-he-7x.png"],
  featured: true,
  description:
    "GIẢI PICKLEBALL GIAO LƯU THẾ HỆ 7X\nNgày diễn ra: 31/10/2026. Địa điểm: Cụm sân Eco khu đô thị Bàu Ri.\n\nĐỐI TƯỢNG\nVĐV sinh năm 1979 trở về trước, đang sinh sống, làm việc hoặc công tác trên địa bàn huyện Bố Trạch cũ, theo điều lệ trên poster.\n\nNỘI DUNG\nĐôi nam. Sau khi kết thúc đăng ký, BTC bốc thăm ngẫu nhiên để ghép cặp. Lệ phí 500.000 đồng/VĐV.\n\nTHỂ THỨC & GIẢI THƯỞNG\nÁp dụng luật thi đấu pickleball. Thể thức chia bảng và tính thứ hạng được BTC quyết định theo số lượng đăng ký thực tế. Giải nhất, nhì và đồng giải ba: Cúp + Cờ + Quà tặng. Xem đầy đủ quy định trên poster.\n\nTHIẾT LẬP THỰC HÀNH\nHạn đăng ký 29/10 và 6 suất là dữ liệu mẫu để tập duyệt, không có trong poster gốc. Hồ sơ và danh sách đăng ký trên website là dữ liệu giả lập, chưa phải danh sách giải thực tế.",
});
const old = JSON.parse(
  readFileSync("work/seed.sql", "utf8")
    .match(/VALUES \('hoan-lao-open-2026','tournament','((?:''|[^'])*)'/)[1]
    .replaceAll("''", "'"),
);
const open = event("hoan-lao-open-2026", {
  ...old,
  featured: false,
  categorySlots: { "Đôi nam": 2, "Đôi nữ": 2, "Đôi nam nữ": 2 },
  capacity: 6,
  description:
    old.description +
    "\n\nBÀI TẬP CHỐT DANH SÁCH\nMỗi hạng mục có 2 suất và đã có đủ hồ sơ được duyệt tạm. Có thể thử chốt rồi xem kết quả ở giao diện công khai.",
});
const finished = event(
  "giao-luu-thang-10-da-chot",
  {
    title: "Giao lưu tháng 10 · Đã công bố",
    date: "2026-10-18",
    deadline: "2026-10-15",
    categories: ["Đơn nam", "Đơn nữ"],
    categorySlots: { "Đơn nam": 2, "Đơn nữ": 2 },
    capacity: 4,
    status: "closed",
    image: "/pickleball-paddle.jpg",
    posters: ["/pickleball-paddle.jpg"],
  },
  true,
);
const expired = event("giao-luu-het-han-cho-chot", {
  title: "Giao lưu cuối tháng · Hết hạn đăng ký",
  date: "2026-10-28",
  deadline: "2026-10-23",
  description:
    "DỮ LIỆU THỰC HÀNH\nGiải đã qua hạn đăng ký nhưng chưa chốt. BTC vẫn có thể xét duyệt, bổ sung đủ 2 suất và chốt. Người xem không thể đăng ký mới.",
});
const people = [
  ["Nguyễn Văn Hòa", "Nam", "1968", "3.25", "approved"],
  ["Trần Đức Bình", "Nam", "1972", "3.0", "approved"],
  ["Lê Quốc Thành", "Nam", "1975", "2.75", "approved"],
  ["Phạm Văn Sơn", "Nam", "1969", "3.5", "approved"],
  ["Hoàng Anh Dũng", "Nam", "1978", "3.25", "approved"],
  ["Nguyễn Hữu Nam", "Nam", "1971", "2.5", "approved"],
  ["Võ Minh Hải", "Nam", "1976", "3,10", "pending"],
  ["Lê Văn Phúc", "Nam", "1979", "2.8", "pending"],
  ["Trần Thanh Tùng", "Nam", "1985", "Chờ đánh giá", "rejected"],
  ["Nguyễn Thị Lan", "Nữ", "1970", "3.1", "approved"],
  ["Trần Ngọc Mai", "Nữ", "1977", "2.9", "approved"],
  ["Phạm Thị Hạnh", "Nữ", "1980", "3.5", "approved"],
  ["Lê Thanh Hà", "Nữ", "1982", "3.0", "approved"],
  ["Hoàng Thị Yến", "Nữ", "1975", "Mới chơi", "pending"],
  ["Võ Thị Hoa", "Nữ", "1979", "2.25", "pending"],
  ["Đặng Văn Khánh", "Nam", "1967", "4.0", "approved"],
  ["Bùi Đức An", "Nam", "1974", "3.4", "approved"],
];
const athlete = (i) => "training-athlete-" + String(i).padStart(2, "0");
const mobile = (i) => "09090000" + String(i).padStart(2, "0");
for (let i = 1; i <= people.length; i++) {
  const [name, gender, birthYear, rating, status] = people[i - 1];
  const data = {
    name,
    gender,
    birthYear,
    rating,
    email: "",
    address: "Hoàn Lão · Hồ sơ thực hành",
  };
  sql.push(
    `INSERT INTO accounts(id,phone,username,password_hash,role,disabled,created_at) VALUES(${q(athlete(i))},${q(mobile(i))},NULL,${q(hash(password))},'user',0,${q(profileCreated)});`,
  );
  sql.push(
    `INSERT INTO athletes(id,data,status,note,points,created_at,updated_at) VALUES(${q(athlete(i))},${js(data)},${q(status)},${q(status === "rejected" ? "Hồ sơ mẫu cần BTC xem lại điều kiện tham gia." : status === "pending" ? "Hồ sơ mới, chờ xác minh thông tin." : "")},${Number(rating.replace(",", ".")) || 0},${q(profileCreated)},${q(now)});`,
  );
}
const vars = readFileSync(".dev.vars", "utf8");
const staffPassword =
  vars.match(/STAFF_PASSWORD="([^"]+)"/)?.[1] || "Staff@2026!";
sql.push(
  `INSERT INTO accounts(id,phone,username,password_hash,role,disabled,created_at) VALUES('local-staff-2',NULL,'staff2',${q(hash(staffPassword))},'staff',0,${q(now)});`,
);
let sequence = 0;
function entry(t, i, category, status, partner = "", note = "") {
  const id = "TRAIN-" + String(++sequence).padStart(3, "0");
  const data = { category, rating: people[i - 1][3], partner, note };
  const created = `2026-10-${String(20 + Math.floor(sequence / 10)).padStart(2, "0")}T${String(8 + (sequence % 10)).padStart(2, "0")}:00:00.000Z`;
  sql.push(
    `INSERT INTO registrations(id,tournament_id,phone,category,data,status,note,created_at,athlete_id,reviewed_at,published_status,published_note) VALUES(${q(id)},${q(t.id)},${q(mobile(i))},${q(category)},${js(data)},${q(status)},${q(status === "rejected" ? "Chưa phù hợp danh sách dự kiến." : "")},${q(created)},${q(athlete(i))},${status === "pending" ? "NULL" : q(now)},${q(t.id === finished.id ? status : "pending")},'');`,
  );
}
for (const i of [1, 2, 3, 4]) entry(featured, i, "Đôi nam", "provisional");
for (const i of [5, 6, 7, 8])
  entry(
    featured,
    i,
    "Đôi nam",
    "pending",
    "",
    i === 7 ? "Tôi mới tạo hồ sơ, nhờ BTC xét duyệt." : "",
  );
for (const i of [9, 16])
  entry(
    featured,
    i,
    "Đôi nam",
    "rejected",
    "",
    i === 9 ? "Hồ sơ mẫu không đáp ứng độ tuổi giải 7X." : "",
  );
for (const [i, cat, partner] of [
  [1, "Đôi nam", "Nguyễn Văn Lâm (đồng đội mẫu)"],
  [5, "Đôi nam", "Trần Văn Long (đồng đội mẫu)"],
  [10, "Đôi nữ", "Lê Thị Thảo (đồng đội mẫu)"],
  [11, "Đôi nữ", "Hoàng Ngọc Hà (đồng đội mẫu)"],
  [3, "Đôi nam nữ", "Trần Thị Thu (đồng đội mẫu)"],
  [12, "Đôi nam nữ", "Nguyễn Văn Minh (đồng đội mẫu)"],
])
  entry(open, i, cat, "provisional", partner);
entry(open, 16, "Đôi nam", "pending", "Võ Văn Tân (đồng đội mẫu)");
entry(open, 17, "Đôi nam nữ", "rejected", "Lê Thị Hồng (đồng đội mẫu)");
for (const [i, cat, status] of [
  [2, "Đơn nam", "approved"],
  [6, "Đơn nam", "approved"],
  [12, "Đơn nữ", "approved"],
  [13, "Đơn nữ", "approved"],
  [16, "Đơn nam", "rejected"],
  [15, "Đơn nữ", "rejected"],
  [9, "Đơn nam", "rejected"],
])
  entry(finished, i, cat, status);
entry(expired, 16, "Đơn nam", "provisional");
entry(expired, 17, "Đơn nam", "pending");
// Finalized event records precede that event's publication and competition dates.
sql.push(
  `UPDATE registrations SET created_at='2026-10-13T08:00:00.000Z',reviewed_at='2026-10-16T09:00:00.000Z' WHERE tournament_id=${q(finished.id)};`,
);
const newArticle = {
  title: "Hẹn nhau trên sân cuối tuần",
  category: "Hoạt động CLB",
  date: "2026-10-24",
  excerpt: "Bản nháp để admin tập chỉnh sửa và đăng bài.",
  body: "BÀI VIẾT THỰC HÀNH\nStaff đề xuất một buổi giao lưu cuối tuần. Admin có thể sửa tiêu đề, nội dung rồi duyệt đăng.",
  image: "/pickleball-court.jpg",
  demo: true,
};
const editArticle = {
  ...newArticle,
  title: "Sân mới, những cuộc hẹn mới — bản staff đề xuất",
  body: "BẢN CHỈNH SỬA CHỜ DUYỆT\nNội dung gốc vẫn được giữ trên website cho đến khi admin duyệt bản này.",
};
const proposedEvent = {
  ...featured,
  id: undefined,
  title: "Giao lưu mở rộng · Đề xuất của staff",
  date: "2026-12-20",
  deadline: "2026-12-15",
  featured: false,
  pairingMode: "self",
  categories: ["Đôi nam 50+", "Đôi nữ"],
  categorySlots: { "Đôi nam 50+": 4, "Đôi nữ": 4 },
  capacity: 8,
  image: "/pickleball-paddle.jpg",
  posters: ["/pickleball-paddle.jpg"],
  status: "soon",
};
for (const name of ["Đôi nam 50+"])
  sql.push(
    `INSERT OR IGNORE INTO categories(name,created_at) VALUES(${q(name)},${q(now)});`,
  );
const media = {
  title: "Khoảnh khắc buổi tập — ảnh chờ duyệt",
  type: "image",
  url: "/pickleball-ball.jpg",
  thumbnail: "",
  month: "2026-10",
  expiresAt: "2026-11-24T16:59:59.000Z",
  demo: true,
};
const proposals = [
  [
    "training-submit-article",
    "article",
    "training-new-article",
    newArticle,
    "pending",
    "local-staff",
    "",
  ],
  [
    "training-submit-edit",
    "article",
    "nhung-cuoc-hen-moi",
    editArticle,
    "pending",
    "local-staff-2",
    "",
  ],
  [
    "training-submit-event",
    "tournament",
    "training-proposed-event",
    proposedEvent,
    "pending",
    "local-staff",
    "",
  ],
  [
    "training-submit-image",
    "media",
    "training-proposed-image",
    media,
    "pending",
    "local-staff-2",
    "",
  ],
  [
    "training-submit-returned",
    "article",
    "training-returned-article",
    { ...newArticle, title: "Tin giao lưu cần bổ sung thông tin" },
    "rejected",
    "local-staff",
    "Bổ sung địa điểm và thời gian trước khi gửi lại.",
  ],
  [
    "training-submit-published",
    "article",
    "training-published-article",
    { ...newArticle, title: "Lịch tập mẫu đã được duyệt" },
    "approved",
    "local-staff-2",
    "Admin đã chỉnh sửa và đăng.",
  ],
];
for (const [id, rawKind, target, rawData, status, author, note] of proposals) {
  const kind = rawKind === "media" ? "album" : rawKind,
    data = rawKind === "media" ? albumData(rawData) : rawData;
  sql.push(
    `INSERT INTO submissions(id,kind,target_id,data,status,created_by,created_at,reviewed_at,note) VALUES(${q(id)},${q(kind)},${q(target)},${js(data)},${q(status)},${q(author)},${q(now)},${status === "pending" ? "NULL" : q(now)},${q(note)});`,
  );
  if (status === "approved") insertContent(target, kind, data);
}
insertContent("training-expired-image", "media", {
  ...media,
  title: "Album tháng 9 · Đã tự ẩn",
  month: "2026-09",
  expiresAt: "2026-10-01T16:59:59.000Z",
});
insertContent("training-video", "media", {
  ...media,
  title: "Video mẫu để tập quản lý thư viện",
  type: "video",
  url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  thumbnail: "/pickleball-paddle.jpg",
});
for (const [i, name, body, read] of [
  [1, "Khách thực hành 01", "Tôi mới chơi, muốn hỏi lịch sinh hoạt CLB.", 0],
  [2, "Khách thực hành 02", "Giải 7X có bốc thăm ghép cặp không?", 0],
  [3, "Khách thực hành 03", "Tôi muốn đăng ký giao lưu tháng 12.", 1],
])
  sql.push(
    `INSERT INTO messages(id,name,phone,body,read,created_at) VALUES(${q("training-message-" + i)},${q(name)},${q("090900009" + i)},${q(body)},${read},${q(now)});`,
  );
writeFileSync(
  "work/seed.sql",
  readFileSync("work/seed.sql", "utf8") + "\n" + sql.join("\n"),
);
console.log(
  "Prepared training dataset: 1 admin + 2 staff + 17 athlete users, 5 tournaments, 27 entries and content review cases.",
);
