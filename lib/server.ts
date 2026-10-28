import { env } from "cloudflare:workers";
import type {
  Account,
  Athlete,
  Registration,
  SiteData,
  Tournament,
  Submission,
  Message,
  Role,
} from "./types";
import {
  compareEvents,
  eventStatus,
  rejectionsPublished,
  feeAmountOf,
  formatFee,
} from "./events";
import { ratingText, numericRating, validRating, ratingHint } from "./rating";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (message: string, status = 400): never => {
  throw new HttpError(status, message);
};
export function db() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new Error("Storage unavailable");
  return env.BUCKET;
}
export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof SyntaxError)
      return json({ error: "Dữ liệu gửi lên không hợp lệ." }, 400);
    console.error("Request failed", e);
    return json({ error: "Có lỗi khi xử lý dữ liệu. Vui lòng thử lại." }, 500);
  }
}
export const clean = (v: unknown, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
export const phone = (v: unknown) =>
  clean(v, 30)
    .replace(/[\s.()-]/g, "")
    .replace(/^\+84/, "0");
export function validPhone(v: string) {
  return /^0[35789]\d{8}$/.test(v);
}
export function safeUrl(v: unknown) {
  const s = clean(v, 1600);
  if (
    s.startsWith("/") &&
    !s.startsWith("//") &&
    !s.includes("\\") &&
    !/[\x00-\x20]/.test(s)
  )
    return s;
  try {
    return new URL(s).protocol === "https:" ? s : "";
  } catch {
    return "";
  }
}
export function validDate(v: unknown) {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(new Date(v).getTime()) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function assertOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    fail("Yêu cầu không hợp lệ.", 403);
}
export async function digest(v: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function passwordHash(
  password: string,
  salt = crypto.randomUUID(),
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bytes = await crypto.subtle.deriveBits(
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
    [...new Uint8Array(bytes)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
export async function verifyPassword(password: string, hash: string) {
  const salt = hash.split(":")[0];
  if (!salt) return false;
  const other = await passwordHash(password, salt);
  let diff = hash.length ^ other.length;
  for (let i = 0; i < hash.length; i++)
    diff |= hash.charCodeAt(i) ^ (other.charCodeAt(i) || 0);
  return diff === 0;
}
export function validatePassword(v: unknown) {
  if (typeof v !== "string" || v.length < 8 || v.length > 128)
    fail("Mật khẩu cần có từ 8 đến 128 ký tự.");
  return v as string;
}
export async function rateLimit(key: string, max: number, minutes = 15) {
  const now = Date.now();
  await db()
    .prepare(
      "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END",
    )
    .bind(key, now + minutes * 60000, now, now)
    .run();
  const row = await db()
    .prepare("SELECT count FROM rate_limits WHERE key=?")
    .bind(key)
    .first<{ count: number }>();
  if ((row?.count || 0) > max)
    fail("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.", 429);
}
export function mapAccount(r: Record<string, any>): Account {
  return {
    id: r.id,
    phone: r.phone,
    username: r.username,
    role: r.role,
    disabled: !!r.disabled,
    createdAt: r.created_at,
  };
}
export async function getAccount(request: Request): Promise<Account | null> {
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|; )hl_session=([^;]+)/)?.[1];
  if (!token) return null;
  const row = await db()
    .prepare(
      "SELECT a.* FROM accounts a JOIN sessions s ON s.account_id=a.id WHERE s.token=? AND s.expires>? AND a.disabled=0",
    )
    .bind(await digest(token), Date.now())
    .first<Record<string, any>>();
  return row ? mapAccount(row) : null;
}
export async function requireAccount(
  request: Request,
  roles: Role[] = ["admin", "staff", "user"],
) {
  const a = await getAccount(request);
  if (!a) fail("Vui lòng đăng nhập.", 401);
  if (a!.role !== "admin" && !roles.includes(a!.role))
    fail("Tài khoản không có quyền thực hiện thao tác này.", 403);
  return a!;
}
export async function sessionResponse(
  accountId: string,
  request: Request,
  extra: Record<string, unknown> = {},
) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await db()
    .prepare("INSERT INTO sessions (token,expires,account_id) VALUES (?,?,?)")
    .bind(await digest(token), Date.now() + 7 * 86400000, accountId)
    .run();
  return Response.json(
    { ok: true, ...extra },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `hl_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
      },
    },
  );
}
export function profileData(d: Record<string, unknown>, validate = true) {
  const p = {
    photo: /^\/api\/files\/[a-f0-9-]+\.(jpg|png|webp)$/.test(String(d.photo))
      ? String(d.photo)
      : "",
    name: clean(d.name, 100),
    email: clean(d.email, 150),
    gender: clean(d.gender, 10) as "Nam" | "Nữ",
    birthYear: clean(d.birthYear, 4),
    address: clean(d.address, 200),
    rating: typeof d.rating === "string" ? d.rating : ratingText(d),
  };
  if (p.name.length < 2 || !["Nam", "Nữ"].includes(p.gender))
    fail("Vui lòng nhập họ tên và giới tính Nam/Nữ hợp lệ.");
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
    fail("Email không hợp lệ.");
  if (
    p.birthYear &&
    (!/^\d{4}$/.test(p.birthYear) ||
      Number(p.birthYear) < 1920 ||
      Number(p.birthYear) > new Date().getFullYear())
  )
    fail("Năm sinh không hợp lệ.");
  if (validate && !validRating(p.rating))
    fail("Điểm trình là bắt buộc. " + ratingHint);
  return p;
}
export async function athleteRows(): Promise<Athlete[]> {
  const { results } = await db()
    .prepare(
      "SELECT p.*,a.phone FROM athletes p JOIN accounts a ON p.id=a.id ORDER BY p.created_at DESC",
    )
    .all<Record<string, any>>();
  return results.map((r) => ({
    ...profileData(JSON.parse(r.data), false),
    id: r.id,
    phone: r.phone,
    status: r.status,
    note: r.note,
    rating: ratingText(JSON.parse(r.data)),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
export async function getAthlete(id: string): Promise<Athlete | null> {
  const r = await db()
    .prepare(
      "SELECT p.*,a.phone FROM athletes p JOIN accounts a ON p.id=a.id WHERE p.id=?",
    )
    .bind(id)
    .first<Record<string, any>>();
  return r
    ? {
        ...profileData(JSON.parse(r.data), false),
        id: r.id,
        phone: r.phone,
        status: r.status,
        note: r.note,
        rating: ratingText(JSON.parse(r.data)),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    : null;
}
export async function getContent(kind: string) {
  const { results } = await db()
    .prepare(
      "SELECT id,data FROM content WHERE kind=? ORDER BY created_at DESC,id",
    )
    .bind(kind)
    .all<{ id: string; data: string }>();
  return results.map((r) => ({ ...JSON.parse(r.data), id: r.id }));
}
export async function registrationRows(
  accountId?: string,
): Promise<Registration[]> {
  const { results } = await db()
    .prepare(
      `SELECT r.*,p.data AS profile,p.status AS profile_status,p.points,a.phone AS current_phone FROM registrations r JOIN athletes p ON p.id=r.athlete_id JOIN accounts a ON a.id=p.id ${accountId ? "WHERE r.athlete_id=?" : ""} ORDER BY r.created_at DESC,r.id`,
    )
    .bind(...(accountId ? [accountId] : []))
    .all<Record<string, any>>();
  return results.map((r) => {
    const p = JSON.parse(r.profile);
    return {
      category: JSON.parse(r.data).category,
      partner: JSON.parse(r.data).partner || "",
      note: JSON.parse(r.data).note || "",
      id: r.id,
      tournamentId: r.tournament_id,
      athleteId: r.athlete_id,
      name: p.name,
      phone: r.current_phone,
      email: p.email,
      gender: p.gender,
      rating:
        typeof JSON.parse(r.data).rating === "string"
          ? JSON.parse(r.data).rating
          : ratingText(p),
      profileStatus: r.profile_status,
      status: r.status,
      adminNote: r.note,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      publishedStatus: r.published_status,
      publishedNote: r.published_note,
    };
  });
}
export async function siteData(operator = false): Promise<SiteData> {
  const [tournaments, articles, albums, settings] = await Promise.all(
    ["tournament", "article", "album", "settings"].map(getContent),
  );
  const { results: states } = await db()
    .prepare(
      "SELECT tournament_id,finalized_at,official_at,publication_version FROM event_state",
    )
    .all<{
      tournament_id: string;
      finalized_at: string | null;
      official_at: string | null;
      publication_version: number;
    }>();
  const { results: counts } = await db()
    .prepare(
      "SELECT tournament_id,category,status,published_status,COUNT(*) AS total FROM registrations GROUP BY tournament_id,category,status,published_status",
    )
    .all<{
      tournament_id: string;
      category: string;
      status: string;
      published_status: string;
      total: number;
    }>();
  const { results: cats } = await db()
    .prepare("SELECT name FROM categories ORDER BY created_at,name")
    .all<{ name: string }>();
  const { results: topics } = await db()
    .prepare("SELECT name FROM article_topics ORDER BY created_at,name")
    .all<{ name: string }>();
  const { results: ranking } = await db()
    .prepare(
      "SELECT p.id,p.data FROM athletes p JOIN accounts a ON a.id=p.id WHERE p.status='approved' AND a.disabled=0",
    )
    .all<{ id: string; data: string }>();
  const latest = (items: any[]) =>
    items
      .sort(
        (a, b) =>
          (b.publishedAt || b.date).localeCompare(a.publishedAt || a.date) ||
          b.id.localeCompare(a.id),
      )
      .slice(0, 20);
  return {
    tournaments: tournaments
      .map((t) => {
        const state = states.find((s) => s.tournament_id === t.id);
        const publishedAt = state?.finalized_at || null;
        const officialAt = state?.official_at || null;
        const visible = rejectionsPublished({ ...t, officialAt });
        const c: Record<string, any> = Object.fromEntries(
          t.categories.map((cat: string) => [
            cat,
            { pending: 0, provisional: 0, approved: 0, rejected: 0 },
          ]),
        );
        for (const r of counts.filter((r) => r.tournament_id === t.id)) {
          let status = operator ? r.status : r.published_status;
          if (!operator && status === "rejected" && !visible)
            status = "pending";
          if (c[r.category]) c[r.category][status] += r.total;
        }
        return {
          ...t,
          status:
            eventStatus(t) === "finalized"
              ? "closed"
              : (eventStatus(t) as Tournament["status"]),
          feeAmount: feeAmountOf(t),
          feeUnit: t.feeUnit === "pair" ? "pair" : "athlete",
          fee: formatFee(
            feeAmountOf(t),
            t.feeUnit === "pair" ? "pair" : "athlete",
          ),
          counts: c,
          publishedAt,
          officialAt,
          publicationVersion: state?.publication_version || 0,
          rejectionsPublished: visible,
          approved: Object.values(c).reduce(
            (sum: number, r: any) => sum + r.approved,
            0,
          ),
          provisional: Object.values(c).reduce(
            (sum: number, r: any) => sum + r.provisional,
            0,
          ),
        };
      })
      .sort(compareEvents),
    articles: latest(articles),
    albums: latest(albums),
    settings: {
      ...settings[0],
      sponsors: settings[0]?.sponsors || [],
      facebookName: settings[0]?.facebookName || "",
      contacts: settings[0]?.contacts || [
        {
          name: settings[0]?.contact || "Vũ Trịnh Thanh",
          phone: settings[0]?.phone || "",
        },
        { name: "", phone: "" },
      ],
    },
    categories: cats.map((c) => c.name),
    topics: topics.map((t) => t.name),
    ranking: ranking
      .map((r) => {
        const a = JSON.parse(r.data);
        return {
          id: r.id,
          name: a.name,
          gender: a.gender,
          rating: ratingText(a),
          address: a.address,
        };
      })
      .sort(
        (a, b) =>
          (numericRating(b.rating) ?? -Infinity) -
            (numericRating(a.rating) ?? -Infinity) ||
          a.name.localeCompare(b.name, "vi"),
      ),
  };
}
export async function getTournament(id: string): Promise<Tournament | null> {
  return (await siteData()).tournaments.find((t) => t.id === id) || null;
}
export function registrationOpen(t: Tournament) {
  return eventStatus(t) === "open";
}
export function publicRegistration(r: Registration, t: Tournament) {
  const status =
    r.publishedStatus === "rejected" && !t.rejectionsPublished
      ? "pending"
      : r.publishedStatus;
  return {
    ...r,
    status,
    adminNote: status === "pending" ? "" : r.publishedNote,
    publishedStatus: status,
    publishedNote: status === "pending" ? "" : r.publishedNote,
    reviewedAt: null,
  };
}
export async function submissionRows(account: Account): Promise<Submission[]> {
  const { results } = await db()
    .prepare(
      `SELECT s.*,COALESCE(a.username,a.phone,'Nhân sự') AS author FROM submissions s JOIN accounts a ON a.id=s.created_by ${account.role === "staff" ? "WHERE s.created_by=?" : ""} ORDER BY s.created_at DESC`,
    )
    .bind(...(account.role === "staff" ? [account.id] : []))
    .all<Record<string, any>>();
  return results.map((r) => ({
    id: r.id,
    kind: r.kind,
    targetId: r.target_id,
    operation: r.operation === "edit" ? "edit" : "create",
    data: JSON.parse(r.data),
    status: r.status,
    createdBy: r.created_by,
    author: r.author,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    note: r.note,
  }));
}
export async function messageRows(): Promise<Message[]> {
  const { results } = await db()
    .prepare("SELECT * FROM messages ORDER BY created_at DESC")
    .all<Record<string, any>>();
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    body: r.body,
    read: !!r.read,
    createdAt: r.created_at,
  }));
}
