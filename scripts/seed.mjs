import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const settings = {
  clubName: "Hoàn Lão Pickleball",
  logoImage: "/favicon.svg",
  contact: "Vũ Trịnh Thanh",
  phone: "",
  address: "Xã Hoàn Lão",
  zaloUrl: "",
  facebookUrl: "",
  clubBannerImage: "/pickleball-court.jpg",
  demo: true,
};
const tournaments = [
  {
    id: "hoan-lao-open-2026",
    title: "Hoàn Lão Open 2026",
    subtitle: "Cùng đồng đội tạo nên những đường bóng đáng nhớ.",
    date: "2026-11-22",
    deadline: "2026-11-15",
    location: "Xã Hoàn Lão · Sân sẽ công bố",
    categories: ["Đôi nam", "Đôi nữ", "Đôi nam nữ"],
    categorySlots: { "Đôi nam": 12, "Đôi nữ": 8, "Đôi nam nữ": 12 },
    capacity: 32,
    featured: true,
    pairingMode: "self",
    fee: "Sẽ cập nhật",
    description:
      "GIẢI ĐẤU MINH HỌA\nLịch thi đấu và các nội dung dưới đây dùng để trải nghiệm chức năng website, chưa phải thông báo chính thức của CLB.\n\nNỘI DUNG DỰ KIẾN\nĐôi nam, đôi nữ và đôi nam nữ. Mỗi hồ sơ tương ứng một cặp thi đấu trong một nội dung.\n\nCÁCH ĐĂNG KÝ\nMột VĐV đại diện cặp điền thông tin cá nhân, nội dung thi đấu và tên đồng đội. Ban tổ chức sẽ xem xét và phê duyệt từng hồ sơ.\n\nLần đầu, tạo hồ sơ VĐV rồi chọn hạng mục thi đấu. Lần sau, đăng nhập bằng SĐT và mật khẩu để sử dụng lại hồ sơ. Theo dõi kết quả ở Hồ sơ của tôi hoặc Danh sách VĐV của giải.\n\nTHÔNG TIN SẼ BỔ SUNG\nĐịa điểm sân, khung giờ, lệ phí, điều kiện trình độ, thể thức, quy định và cơ cấu giải thưởng sẽ được CLB công bố trước ngày thi đấu.",
    image: "/pickleball-court.jpg",
    status: "open",
    demo: true,
  },
  {
    id: "giao-luu-thang-12",
    title: "Giao lưu cuối tuần · Tháng 12",
    subtitle: "Một buổi gặp gỡ dành cho những người yêu pickleball.",
    date: "2026-12-13",
    deadline: "2026-12-10",
    location: "Xã Hoàn Lão",
    categories: ["Đôi nam nữ"],
    categorySlots: { "Đôi nam nữ": 24 },
    capacity: 24,
    featured: false,
    pairingMode: "self",
    fee: "Sẽ cập nhật",
    description:
      "NỘI DUNG MINH HỌA\nĐây là lịch mẫu để giới thiệu cách hiển thị một sự kiện sắp diễn ra. CLB sẽ công bố thông tin chính thức sau.\n\nTheo dõi website để cập nhật lịch giao lưu, địa điểm và thời điểm mở đăng ký.",
    image: "/pickleball-paddle.jpg",
    status: "soon",
    demo: true,
  },
];
const articles = [
  {
    id: "nhung-cuoc-hen-moi",
    title: "Sân mới, những cuộc hẹn mới",
    category: "Hoạt động CLB",
    date: "2026-10-24",
    excerpt:
      "Một khoảng sân, vài cây vợt và thật nhiều câu chuyện đang chờ được bắt đầu.",
    body: "BÀI VIẾT MẪU\nNội dung này minh họa chuyên mục tin hoạt động của Hoàn Lão Pickleball. Hình ảnh là ảnh tham khảo, không phải hình ảnh thực tế của CLB.\n\nCó những kết nối bắt đầu rất đơn giản: một lời rủ ra sân, một đường bóng qua lưới, một cái chạm vợt sau trận.\n\nHoàn Lão Pickleball mong muốn trở thành nơi những người cùng yêu thể thao gặp nhau, rèn luyện và có thêm những người bạn mới.\n\nLịch sinh hoạt, địa điểm sân và những hoạt động đầu tiên sẽ được CLB cập nhật tại đây. Hẹn gặp bạn trên sân!",
    image: "/pickleball-court.jpg",
    demo: true,
  },
  {
    id: "chuan-bi-giao-luu",
    title: "Sẵn sàng cho cuộc hẹn đầu tiên",
    category: "Tin giải đấu",
    date: "2026-10-22",
    excerpt:
      "Cách đăng ký, theo dõi hồ sơ và chuẩn bị cùng đồng đội trước ngày giao lưu.",
    body: "BÀI VIẾT MẪU\n\nĐể đăng ký một giải đấu đang mở, vào mục Giải đấu, chọn giải và nhấn Đăng ký thi đấu. Điền đúng họ tên, số điện thoại, nội dung thi đấu và thông tin đồng đội.\n\nLần đầu bạn sẽ tạo hồ sơ VĐV bằng SĐT và mật khẩu; hồ sơ VĐV cùng đăng ký giải được gửi đến BTC. Lần sau chỉ cần đăng nhập hồ sơ có sẵn và chọn hạng mục.\n\nBan tổ chức duyệt hồ sơ VĐV rồi duyệt tạm đăng ký giải. Khi đủ suất, BTC chốt danh sách chính thức. Xem trạng thái trong Hồ sơ của tôi hoặc danh sách VĐV theo từng hạng mục.\n\nLịch thi đấu chính thức sẽ được CLB công bố sau.",
    image: "/pickleball-paddle.jpg",
    demo: true,
  },
  {
    id: "lan-dau-ra-san",
    title: "Trong túi vợt của người mới có gì?",
    category: "Góc sân",
    date: "2026-10-20",
    excerpt:
      "Một chút chuẩn bị để buổi chơi đầu tiên thoải mái và nhiều niềm vui hơn.",
    body: "BÀI VIẾT MẪU\n\nVợt, bóng, một đôi giày thể thao phù hợp, bình nước cá nhân và khăn nhỏ là những món đồ bạn có thể chuẩn bị cho buổi chơi đầu tiên.\n\nNếu chưa có vợt hoặc chưa rõ cách tham gia, hãy trao đổi với đầu mối liên hệ của CLB trước khi đến sân.\n\nĐến sớm một chút để làm quen với sân, khởi động và gặp đồng đội. Không cần bắt đầu bằng những cú đánh hoàn hảo — một tinh thần cởi mở đã là khởi đầu rất tốt.",
    image: "/pickleball-ball.jpg",
    demo: true,
  },
];
const media = [
  {
    id: "album-court",
    title: "Những đường bóng kết nối",
    type: "image",
    url: "/pickleball-court.jpg",
    thumbnail: "",
    month: "2026-10",
    expiresAt: "2026-11-24T16:59:59.000Z",
    demo: true,
  },
  {
    id: "album-paddle",
    title: "Chạm vợt, bắt đầu cuộc hẹn",
    type: "image",
    url: "/pickleball-paddle.jpg",
    thumbnail: "",
    month: "2026-10",
    expiresAt: "2026-11-24T16:59:59.000Z",
    demo: true,
  },
  {
    id: "album-ball",
    title: "Sẵn sàng cho điểm số mới",
    type: "image",
    url: "/pickleball-ball.jpg",
    thumbnail: "",
    month: "2026-10",
    expiresAt: "2026-11-24T16:59:59.000Z",
    demo: true,
  },
];
for (const t of tournaments) {
  t.posters = [t.image];
  t.opensAt = "2026-10-24";
  t.feeAmount = "";
  t.feeUnit = "athlete";
}
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const rows = [
  ["settings", "settings", settings],
  ...tournaments.map((x) => [x.id, "tournament", x]),
  ...articles.map((x) => [x.id, "article", x]),
  ...media.map((x) => [
    x.id,
    "album",
    {
      title: x.title,
      date: x.month + "-01",
      description: "Album ảnh minh họa CLB.",
      cover:
        x.type === "image" ? x.url : x.thumbnail || "/pickleball-court.jpg",
      photos: x.type === "image" ? [{ url: x.url, description: x.title }] : [],
      photoLinks: [],
      videoLinks: x.type === "video" ? [x.url] : [],
      demo: true,
    },
  ]),
];
if (process.env.HL_TEST_FIXTURES !== "1") throw new Error("Fictional fixtures are restricted to the isolated test runner.");
const vars = `ADMIN_PASSWORD="${process.env.HL_TEST_ADMIN_PASSWORD}"\nSTAFF_PASSWORD="${process.env.HL_TEST_STAFF_PASSWORD}"`;
async function hash(password) {
  const salt = crypto.randomUUID();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return (
    salt +
    ":" +
    [...new Uint8Array(bits)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
const adminPassword = vars.match(/ADMIN_PASSWORD="([^"]+)"/)?.[1];
if (!adminPassword) throw new Error("Configure ADMIN_PASSWORD in .dev.vars.");
const staffPassword =
  vars.match(/STAFF_PASSWORD="([^"]+)"/)?.[1] || "Staff@2026!";
const statements = [];
if (process.argv.includes("--reset"))
  for (const table of [
    "registrations",
    "sessions",
    "submissions",
    "messages",
    "athletes",
    "accounts",
    "event_state",
    "categories",
    "content",
    "rate_limits",
    "uploads",
    "article_topics",
  ])
    statements.push("DELETE FROM " + table + ";");
statements.push(
  ...rows.map(
    ([id, kind, d]) =>
      `INSERT OR IGNORE INTO content (id,kind,data,created_at) VALUES (${quote(id)},${quote(kind)},${quote(JSON.stringify(d))},'2026-10-24T12:00:00.000Z');`,
  ),
);
for (const t of tournaments)
  statements.push(
    `INSERT OR IGNORE INTO event_state (tournament_id) VALUES (${quote(t.id)});`,
  );
for (const topic of ["Hoạt động CLB", "Tin giải đấu", "Góc sân"])
  statements.push(
    `INSERT OR IGNORE INTO article_topics(name,created_at) VALUES (${quote(topic)},'2026-10-25');`,
  );
for (const name of ["Đơn nam", "Đơn nữ", "Đôi nam", "Đôi nữ", "Đôi nam nữ"])
  statements.push(
    `INSERT OR IGNORE INTO categories (name,created_at) VALUES (${quote(name)},'2026-10-24');`,
  );
for (const [id, username, password, role] of [
  ["local-admin", "admin", adminPassword, "admin"],
  ["local-staff", "staff", staffPassword, "staff"],
])
  statements.push(
    `INSERT OR IGNORE INTO accounts (id,phone,username,password_hash,role,disabled,created_at) VALUES (${quote(id)},NULL,${quote(username)},${quote(await hash(password))},${quote(role)},0,'2026-10-24T12:00:00.000Z');`,
  );
for (const kind of ["article", "album"])
  statements.push(
    `DELETE FROM content WHERE kind='${kind}' AND id NOT IN(SELECT id FROM content WHERE kind='${kind}' ORDER BY json_extract(data,'$.date') DESC,created_at DESC,id DESC LIMIT 20);`,
  );
mkdirSync("work", { recursive: true });
writeFileSync("work/seed.sql", statements.join("\n"));
console.log(
  process.argv.includes("--reset")
    ? "Prepared local reset and original demo content."
    : "Prepared seed content; existing edits preserved.",
);
