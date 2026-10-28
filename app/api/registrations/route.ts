import { validRating, ratingHint } from "@/lib/rating";
import { isDoubles } from "@/lib/events";
import {
  db,
  handle,
  json,
  assertOrigin,
  getAccount,
  getAthlete,
  getTournament,
  registrationOpen,
  clean,
  fail,
  rateLimit,
  sessionResponse,
} from "@/lib/server";
import { prepareAthlete, duplicateError } from "@/lib/registration";

export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const b = (await request.json()) as Record<string, any>;
    const t = await getTournament(clean(b.tournamentId));
    if (!t || !registrationOpen(t))
      fail("Giải chưa mở hoặc đã hết hạn đăng ký.");
    const category = clean(b.category, 100),
      partner =
        t!.pairingMode === "self" && isDoubles(category)
          ? clean(b.partner, 100)
          : "",
      note = clean(b.note, 1000);
    if (!t!.categories.includes(category)) fail("Vui lòng chọn đúng hạng mục.");
    if (t!.pairingMode === "self" && isDoubles(category) && partner.length < 2)
      fail("Điền họ tên đồng đội cho nội dung đôi.");
    if (b.consent !== true)
      fail(
        "Vui lòng đồng ý gửi thông tin đăng ký và hiển thị tên trong danh sách giải.",
      );
    if (!validRating(b.rating)) fail("Điểm trình là bắt buộc. " + ratingHint);
    let account = await getAccount(request);
    let newcomer: Awaited<ReturnType<typeof prepareAthlete>> | null = null;
    if (!account) {
      if (!b.newAthlete)
        fail("Vui lòng đăng nhập hồ sơ hoặc tạo hồ sơ VĐV mới.", 401);
      newcomer = await prepareAthlete(b.newAthlete);
      account = {
        id: newcomer.id,
        phone: newcomer.mobile,
        username: null,
        role: "user",
        disabled: false,
        createdAt: new Date().toISOString(),
      };
    }
    if (account.role !== "user")
      fail("Vui lòng dùng tài khoản hồ sơ VĐV để đăng ký thi đấu.", 403);
    const athlete = newcomer ? null : await getAthlete(account.id);
    if (!newcomer && !athlete) fail("Tài khoản chưa có hồ sơ VĐV.");
    if (athlete?.status === "rejected")
      fail(
        "Hồ sơ VĐV chưa đạt yêu cầu. Vui lòng liên hệ BTC để được cập nhật.",
      );
    await rateLimit("registration:" + account.id, 20);
    const id =
      "HL-" +
      crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    const now = new Date().toISOString();
    const mobile = account.phone!;
    const localDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    const insert = db()
      .prepare(
        "INSERT INTO registrations (id,tournament_id,phone,category,data,status,note,created_at,athlete_id) VALUES (?,?,?,CASE WHEN EXISTS (SELECT 1 FROM content c LEFT JOIN event_state s ON s.tournament_id=c.id WHERE c.id=? AND s.official_at IS NULL AND c.kind='tournament' AND json_extract(c.data,'$.status') IN ('open','soon') AND json_extract(c.data,'$.deadline')>=? AND COALESCE(json_extract(c.data,'$.opensAt'),'1900-01-01')<=? AND EXISTS (SELECT 1 FROM json_each(c.data,'$.categories') WHERE value=?)) THEN ? ELSE NULL END,?,'pending','',?,?)",
      )
      .bind(
        id,
        t!.id,
        mobile,
        t!.id,
        localDate,
        localDate,
        category,
        category,
        JSON.stringify({
          category,
          rating: typeof b.rating === "string" ? b.rating : "",
          partner,
          note,
        }),
        now,
        account.id,
      );
    // D1 batch is transactional: duplicate phone or duplicate entry rolls back both new profile and entry.
    try {
      const results = await db().batch([
        ...(newcomer?.statements || []),
        insert,
      ]);
      if (!results[results.length - 1].meta.changes)
        fail("Giải vừa đóng đăng ký. Vui lòng chọn giải đấu khác.", 409);
    } catch (e) {
      await newcomer?.cleanup();
      if (String(e).includes("NOT NULL"))
        fail("Giải vừa được đóng hoặc thay đổi hạng mục. Hãy tải lại.", 409);
      duplicateError(e);
    }
    return newcomer
      ? sessionResponse(account.id, request, {
          id,
          status: "pending",
          newProfile: true,
        })
      : json({ id, status: "pending", newProfile: false }, 201);
  });
}
