import { articleSections, articleBody } from "./articles";
import { feeAmountOf, formatFee, isDoubles, eventStatus } from "./events";
import { clean, db, fail, safeUrl, validDate } from "./server";
export async function validateContent(
  kind: string,
  d: Record<string, any>,
  id?: string,
): Promise<Record<string, any>> {
  if (kind === "tournament") {
    const categories = [
      ...new Set(
        (Array.isArray(d.categories) ? d.categories : [])
          .map((v: unknown) => clean(v, 100))
          .filter(Boolean),
      ),
    ] as string[];
    const categorySlots: Record<string, number> = Object.create(null);
    for (const cat of categories) {
      const n = Number(d.categorySlots?.[cat]);
      if (!Number.isInteger(n) || n < 1 || n > 5000)
        fail("Mỗi hạng mục cần có số suất từ 1 đến 5.000.");
      categorySlots[cat] = n;
    }
    if (
      !clean(d.title) ||
      !validDate(d.date) ||
      !validDate(d.deadline) ||
      !validDate(d.opensAt) ||
      d.opensAt > d.deadline ||
      d.deadline > d.date ||
      !categories.length ||
      categories.length > 30 ||
      !["open", "soon", "closed"].includes(d.status)
    )
      fail("Kiểm tra tên giải, ngày thi đấu, hạn đăng ký và hạng mục.");
    if (!["self", "draw", "singles"].includes(d.pairingMode))
      fail("Chọn hình thức ghép cặp hợp lệ.");
    if (d.pairingMode === "singles" && categories.some(isDoubles))
      fail("Không có nội dung đôi: chỉ tạo các nội dung đơn.");
    if (id) {
      const { results } = await db()
        .prepare(
          "SELECT category,COUNT(*) AS total FROM registrations WHERE tournament_id=? GROUP BY category",
        )
        .bind(id)
        .all<{ category: string; total: number }>();
      if (results.some((r) => !categories.includes(r.category)))
        fail("Hạng mục đã có hồ sơ, không thể gỡ khỏi giải.");
      if (results.length) {
        const current = await db()
          .prepare("SELECT data FROM content WHERE id=? AND kind='tournament'")
          .bind(id)
          .first<{ data: string }>();
        if (
          current &&
          (JSON.parse(current.data).pairingMode || "self") !== d.pairingMode
        )
          fail("Giải đã có hồ sơ, không thể thay đổi cách ghép cặp.");
      }
      const { results: chosen } = await db()
        .prepare(
          "SELECT category,COUNT(*) AS total FROM registrations WHERE tournament_id=? AND status IN ('provisional','approved') GROUP BY category",
        )
        .bind(id)
        .all<{ category: string; total: number }>();
      if (chosen.some((r) => r.total > categorySlots[r.category]))
        fail("Số suất không thể thấp hơn số hồ sơ đã duyệt.");
    }
    const posters = (Array.isArray(d.posters) ? d.posters : [])
      .map(safeUrl)
      .filter(Boolean)
      .slice(0, 10);
    const image = posters[0] || safeUrl(d.image) || "/pickleball-court.jpg";
    const feeAmount = feeAmountOf(d),
      feeUnit = d.feeUnit === "pair" ? "pair" : "athlete";
    if (
      feeAmount &&
      (!/^\d+$/.test(feeAmount) || !Number.isSafeInteger(Number(feeAmount)))
    )
      fail("Lệ phí cần là số tiền nguyên không âm.");
    return {
      title: clean(d.title, 150),
      subtitle: clean(d.subtitle, 500),
      date: d.date,
      opensAt: d.opensAt,
      deadline: d.deadline,
      location: clean(d.location, 300),
      categories,
      categorySlots,
      capacity: Object.values(categorySlots).reduce((a, b) => a + b, 0),
      feeAmount,
      feeUnit,
      fee: formatFee(feeAmount, feeUnit),
      pairingMode: d.pairingMode,
      description: clean(d.description, 20000),
      image,
      posters: posters.length ? posters : [image],
      status: eventStatus({
        status: d.status,
        opensAt: d.opensAt,
        deadline: d.deadline,
      }),
      featured: !!d.featured,
      demo: false,
    };
  }
  if (kind === "article") {
    const sections = articleSections(d.body, d.sections).map((s) => ({
      heading: clean(s.heading, 300),
      body: clean(s.body, 25000),
    }));
    const body = articleBody(sections);
    if (!clean(d.title) || !body.trim())
      fail("Điền tiêu đề và ít nhất một đoạn nội dung bài viết.");
    if (sections.length > 100 || body.length > 50000)
      fail("Bài viết tối đa 100 đoạn và 50.000 ký tự.");
    const publishedAt = await publicationTime("article", id);
    return {
      title: clean(d.title, 200),
      category: clean(d.category, 100) || "Hoạt động CLB",
      publishedAt,
      date: publicationDate(publishedAt),
      excerpt: clean(d.excerpt, 700),
      body,
      sections,
      image: safeUrl(d.image),
      demo: false,
    };
  }
  if (kind === "album") {
    const parseLinks = (value: unknown) => {
      const all = (
        Array.isArray(value)
          ? value
          : typeof value === "string"
            ? value.split(/\r?\n/)
            : []
      )
        .map((v) => clean(v, 1600))
        .filter(Boolean);
      if (all.some((url) => !safeUrl(url) || !url.startsWith("https://")))
        fail("Mỗi đường link cần bắt đầu bằng https://, mỗi dòng một link.");
      return [...new Set(all)];
    };
    const photos = (Array.isArray(d.photos) ? d.photos : []).map(
      (photo: any) => ({
        url: safeUrl(photo.url),
        description: clean(photo.description, 3000),
      }),
    );
    if (
      !clean(d.title) ||
      !safeUrl(d.cover) ||
      photos.some((photo: any) => !photo.url)
    )
      fail("Điền tiêu đề, ảnh bìa và đường dẫn ảnh album hợp lệ.");
    const publishedAt = await publicationTime("album", id);
    return {
      title: clean(d.title, 200),
      date: publicationDate(publishedAt),
      publishedAt,
      description: clean(d.description, 7000),
      cover: safeUrl(d.cover),
      photoLinks: parseLinks(d.photoLinks),
      videoLinks: parseLinks(d.videoLinks),
      photos,
      demo: false,
    };
  }
  if (kind === "settings") {
    if (d.sponsors != null && !Array.isArray(d.sponsors))
      fail("Danh sách nhà tài trợ không hợp lệ.");
    if (d.sponsors?.length > 50) fail("Tối đa 50 nhà tài trợ.");
    const sponsors = (d.sponsors || [])
      .map((sponsor: any) => ({
        name: clean(sponsor?.name, 120),
        url: clean(sponsor?.url, 1000),
      }))
      .filter((sponsor: { name: string; url: string }) => sponsor.name || sponsor.url);
    for (const sponsor of sponsors) {
      if (!sponsor.name) fail("Điền tên cho mỗi nhà tài trợ.");
      if (sponsor.url) {
        try {
          const url = new URL(sponsor.url);
          if (url.protocol !== "https:" || url.username || url.password)
            throw new Error("Invalid sponsor URL");
        } catch {
          fail("Link nhà tài trợ cần có dạng https://…");
        }
      }
    }
    const zalo = clean(d.zaloUrl, 1000);
    const contacts = (
      Array.isArray(d.contacts)
        ? d.contacts
        : [
            { name: d.contact, phone: d.phone },
            { name: "", phone: "" },
          ]
    )
      .slice(0, 2)
      .map((v: any) => ({
        name: clean(v.name, 100),
        phone: clean(v.phone, 30),
      }));
    if (contacts.length !== 2) fail("Cần hai đầu mối liên hệ.");
    if (!clean(d.clubName) || !contacts[0].name)
      fail("Điền tên CLB và người liên hệ.");
    if (zalo) {
      try {
        const u = new URL(zalo);
        if (
          u.protocol !== "https:" ||
          !["zalo.me", "www.zalo.me"].includes(u.hostname)
        )
          fail("Link nhóm Zalo cần có dạng https://zalo.me/g/…");
      } catch {
        fail("Link nhóm Zalo không hợp lệ.");
      }
    }
    const facebook = clean(d.facebookUrl, 1000);
    if (facebook) {
      try {
        const u = new URL(facebook);
        if (
          u.protocol !== "https:" ||
          ![
            "facebook.com",
            "www.facebook.com",
            "m.facebook.com",
            "fb.com",
            "www.fb.com",
            "fb.me",
          ].includes(u.hostname)
        )
          fail("Link fanpage cần có dạng https://www.facebook.com/…");
      } catch {
        fail("Link fanpage Facebook không hợp lệ.");
      }
    }
    return {
      clubName: clean(d.clubName, 100),
      logoImage: safeUrl(d.logoImage) || "/favicon.svg",
      contacts,
      contact: contacts[0].name,
      phone: contacts[0].phone,
      address: clean(d.address, 200),
      zaloUrl: zalo,
      facebookUrl: facebook,
      facebookName: clean(d.facebookName, 120),
      sponsors,
      clubBannerImage: safeUrl(d.clubBannerImage) || "/pickleball-court.jpg",
      demo: false,
    };
  }
  fail("Loại nội dung không hợp lệ.");
  return {};
}
export function contentStatements(
  kind: string,
  id: string,
  data: Record<string, any>,
  gate?: { submissionId: string },
) {
  const now = new Date().toISOString();
  const condition = gate
    ? " WHERE EXISTS (SELECT 1 FROM submissions WHERE id=? AND status='pending')"
    : "";
  const args: any[] = [id, kind, JSON.stringify(data), now];
  if (gate) args.push(gate.submissionId);
  const finalGuard =
    kind === "tournament"
      ? " WHERE NOT EXISTS(SELECT 1 FROM registrations r WHERE r.tournament_id=content.id AND NOT EXISTS(SELECT 1 FROM json_each(excluded.data,'$.categories') c WHERE c.value=r.category)) AND NOT EXISTS(SELECT 1 FROM registrations r WHERE r.tournament_id=content.id AND r.status IN ('provisional','approved') GROUP BY r.category HAVING COUNT(*)>COALESCE((SELECT value FROM json_each(excluded.data,'$.categorySlots') q WHERE q.key=r.category),0))"
      : "";
  const statements = [
    db()
      .prepare(
        `INSERT INTO content (id,kind,data,created_at) SELECT ?,?,?,?${condition} ON CONFLICT(id) DO UPDATE SET data=excluded.data${finalGuard}`,
      )
      .bind(...args),
  ];
  if (kind === "tournament") {
    if (data.featured)
      statements.push(
        db()
          .prepare(
            "UPDATE content SET data=json_set(data,'$.featured',json('false')) WHERE kind='tournament' AND id<>? AND EXISTS(SELECT 1 FROM content WHERE id=? AND data=?)",
          )
          .bind(id, id, JSON.stringify(data)),
      );
    const stateArgs: any[] = [id];
    if (gate) stateArgs.push(gate.submissionId);
    statements.push(
      db()
        .prepare(
          `INSERT OR IGNORE INTO event_state (tournament_id) SELECT ?${condition}`,
        )
        .bind(...stateArgs),
    );
  }
  return statements;
}
export async function saveCategories(data: Record<string, any>) {
  if (typeof data.category === "string" && data.category.trim())
    await db()
      .prepare(
        "INSERT OR IGNORE INTO article_topics(name,created_at) VALUES (?,?)",
      )
      .bind(data.category.trim(), new Date().toISOString())
      .run();
  if (Array.isArray(data.categories))
    await db().batch(
      data.categories.map((name: string) =>
        db()
          .prepare(
            "INSERT OR IGNORE INTO categories (name,created_at) VALUES (?,?)",
          )
          .bind(name, new Date().toISOString()),
      ),
    );
}

export function retentionStatements(kind: string) {
  if (!["article", "album"].includes(kind)) return [];
  return [
    db()
      .prepare(
        "DELETE FROM content WHERE kind=? AND id NOT IN(SELECT id FROM content WHERE kind=? ORDER BY COALESCE(json_extract(data,'$.publishedAt'),json_extract(data,'$.date')) DESC,created_at DESC,id DESC LIMIT 20)",
      )
      .bind(kind, kind),
  ];
}

const publicationDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
async function publicationTime(kind: string, id?: string) {
  const old = id
    ? await db()
        .prepare("SELECT data FROM content WHERE id=? AND kind=?")
        .bind(id, kind)
        .first<{ data: string }>()
    : null;
  if (old) {
    const data = JSON.parse(old.data);
    if (
      typeof data.publishedAt === "string" &&
      Number.isFinite(new Date(data.publishedAt).getTime())
    )
      return data.publishedAt;
    if (validDate(data.date))
      return new Date(data.date + "T00:00:00+07:00").toISOString();
  }
  return new Date().toISOString();
}
export function approvalLogRetention() {
  return db().prepare(
    "DELETE FROM submissions WHERE status='approved' AND id NOT IN(SELECT id FROM submissions WHERE status='approved' ORDER BY reviewed_at DESC,created_at DESC,id DESC LIMIT 30)",
  );
}
