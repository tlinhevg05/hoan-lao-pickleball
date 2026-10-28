import { deadlinePassed } from "./events";
import { numericRating } from "./rating";
import type { Account } from "./types";
import {
  db,
  fail,
  clean,
  phone,
  validPhone,
  profileData,
  getAthlete,
  getTournament,
  validatePassword,
  passwordHash,
} from "./server";
import {
  validateContent,
  contentStatements,
  saveCategories,
  retentionStatements,
  approvalLogRetention,
} from "./content";
const onlyAdmin = (a: Account) => {
  if (a.role !== "admin") fail("Chỉ admin được thực hiện thao tác này.", 403);
};
export async function operate(a: Account, b: Record<string, any>) {
  const now = new Date().toISOString();
  if (b.action === "profile") {
    const id = clean(b.id),
      old = await getAthlete(id);
    if (!old) fail("Không tìm thấy hồ sơ VĐV.", 404);
    const d = b.data || {},
      p = profileData({ ...d, photo: old!.photo }),
      mobile = phone(d.phone);
    if (
      !validPhone(mobile) ||
      !["pending", "approved", "rejected"].includes(d.status)
    )
      fail("Kiểm tra SĐT và trạng thái hồ sơ.");
    try {
      const writes = [
        db()
          .prepare(
            "UPDATE athletes SET data=?,status=?,note=?,points=?,updated_at=? WHERE id=?",
          )
          .bind(
            JSON.stringify(p),
            d.status,
            clean(d.note, 1000),
            numericRating(p.rating) ?? 0,
            now,
            id,
          ),
        db().prepare("UPDATE accounts SET phone=? WHERE id=?").bind(mobile, id),
        db()
          .prepare("UPDATE registrations SET phone=? WHERE athlete_id=?")
          .bind(mobile, id),
      ];
      if (d.status !== "approved")
        writes.push(
          db()
            .prepare(
              "UPDATE registrations SET status='pending',note='Hồ sơ VĐV cần được duyệt lại.',reviewed_at=? WHERE athlete_id=? AND status IN ('approved','provisional')",
            )
            .bind(now, id),
        );
      await db().batch(writes);
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        fail("Số điện thoại đã thuộc hồ sơ khác.", 409);
      throw e;
    }
    return { ok: true };
  }
  if (b.action === "review") {
    if (!["pending", "provisional", "rejected"].includes(b.status))
      fail("Trạng thái xét duyệt không hợp lệ.");
    const row = await db()
      .prepare("SELECT * FROM registrations WHERE id=?")
      .bind(clean(b.id))
      .first<Record<string, any>>();
    if (!row) fail("Không tìm thấy đăng ký.", 404);
    const t = await getTournament(row!.tournament_id);
    if (!t) fail("Không tìm thấy giải đấu.", 404);
    if (
      b.status === "provisional" &&
      (await getAthlete(row!.athlete_id))?.status !== "approved"
    )
      fail("Cần phê duyệt hồ sơ VĐV trước khi duyệt suất thi đấu.");
    const result = await db()
      .prepare(
        "UPDATE registrations SET status=?,note=?,reviewed_at=? WHERE id=? AND (?<>'provisional' OR (EXISTS(SELECT 1 FROM athletes WHERE id=registrations.athlete_id AND status='approved') AND (SELECT COUNT(*) FROM registrations r WHERE r.tournament_id=? AND r.category=? AND r.status IN ('provisional','approved') AND r.id<>?)<?))",
      )
      .bind(
        b.status,
        clean(b.note, 1000),
        now,
        row!.id,
        b.status,
        t!.id,
        row!.category,
        row!.id,
        t!.categorySlots[row!.category] || 0,
      )
      .run();
    if (!result.meta.changes)
      fail(
        "Hạng mục đã đủ suất. Hãy điều chỉnh danh sách trước khi duyệt thêm.",
        409,
      );
    return { ok: true };
  }
  if (["finalize", "publish-provisional"].includes(b.action)) {
    const t = await getTournament(clean(b.id));
    if (!t) fail("Không tìm thấy giải đấu.", 404);
    if (b.confirm !== true) fail("Cần xác nhận công bố danh sách.");
    if (
      !Number.isInteger(b.expectedVersion) ||
      b.expectedVersion !== t!.publicationVersion
    )
      fail(
        "Danh sách vừa được công bố ở phiên khác. Hãy tải lại trước khi chốt tiếp.",
        409,
      );
    const official = b.action === "finalize";
    if (!official && t!.officialAt)
      fail("Danh sách đã chốt. Hãy dùng Thay đổi danh sách chính thức.", 409);
    const token = crypto.randomUUID();
    const clauses: string[] = [],
      args: any[] = [
        now,
        official ? 1 : 0,
        now,
        a.id,
        token,
        t!.id,
        b.expectedVersion,
        t!.id,
        JSON.stringify(t!.categories),
        JSON.stringify(t!.categorySlots),
        t!.deadline,
      ];
    for (const cat of t!.categories) {
      clauses.push(
        "(SELECT COUNT(*) FROM registrations WHERE tournament_id=? AND category=? AND status IN ('provisional','approved'))<=?",
      );
      args.push(t!.id, cat, t!.categorySlots[cat]);
    }
    args.push(t!.id);
    const guard = db()
      .prepare(
        `UPDATE event_state SET finalized_at=?,official_at=CASE WHEN ?=1 THEN COALESCE(official_at,?) ELSE official_at END,finalized_by=?,finalization_id=?,publication_version=publication_version+1 WHERE tournament_id=? AND publication_version=? AND EXISTS(SELECT 1 FROM content WHERE id=? AND json_extract(data,'$.categories')=? AND json_extract(data,'$.categorySlots')=? AND json_extract(data,'$.deadline')=?) AND ${clauses.join(" AND ")} AND NOT EXISTS(SELECT 1 FROM registrations r JOIN athletes p ON p.id=r.athlete_id WHERE r.tournament_id=? AND r.status IN ('provisional','approved') AND p.status<>'approved')`,
      )
      .bind(...args);
    const snapshot = db()
      .prepare(
        "UPDATE registrations SET published_status=CASE WHEN status IN ('provisional','approved') THEN 'approved' WHEN status='rejected' AND ?=1 THEN 'rejected' ELSE 'pending' END,published_note=CASE WHEN status IN ('provisional','approved') OR (status='rejected' AND ?=1) THEN note ELSE '' END,status=CASE WHEN status='provisional' THEN 'approved' ELSE status END WHERE tournament_id=? AND EXISTS(SELECT 1 FROM event_state WHERE tournament_id=? AND finalization_id=?)",
      )
      .bind(official ? 1 : 0, official ? 1 : 0, t!.id, t!.id, token);
    const result = await db().batch([guard, snapshot]);
    if (!result[0].meta.changes)
      fail(
        "Danh sách đã thay đổi, vượt số suất hoặc có hồ sơ chưa hợp lệ. Hãy tải lại để kiểm tra.",
        409,
      );
    return {
      ok: true,
      publicationVersion: b.expectedVersion + 1,
      publishedAt: now,
      officialAt: official ? t!.officialAt || now : null,
      rejectionsPublished: official && deadlinePassed(t!),
    };
  }
  if (b.action === "message-read") {
    await db()
      .prepare("UPDATE messages SET read=? WHERE id=?")
      .bind(b.read ? 1 : 0, clean(b.id))
      .run();
    return { ok: true };
  }
  if (b.action === "staff-create") {
    onlyAdmin(a);
    const username = clean(b.username, 50).toLowerCase();
    if (!/^[a-z][a-z0-9._-]{2,49}$/.test(username))
      fail(
        "Tên staff: 3–50 ký tự, bắt đầu bằng chữ, chỉ dùng chữ/số/dấu chấm/gạch.",
      );
    const hash = await passwordHash(validatePassword(b.password));
    try {
      await db()
        .prepare(
          "INSERT INTO accounts (id,phone,username,password_hash,role,disabled,created_at) VALUES (?,NULL,?,?,'staff',0,?)",
        )
        .bind(crypto.randomUUID(), username, hash, now)
        .run();
    } catch (e) {
      if (String(e).includes("UNIQUE")) fail("Tên đăng nhập đã tồn tại.", 409);
      throw e;
    }
    return { ok: true };
  }
  if (["staff-update", "account-update"].includes(b.action)) {
    onlyAdmin(a);
    const id = clean(b.id),
      username = clean(b.username, 50).toLowerCase();
    if (!/^[a-z][a-z0-9._-]{2,49}$/.test(username))
      fail(
        "Tên đăng nhập: 3–50 ký tự, bắt đầu bằng chữ, chỉ dùng chữ/số/dấu chấm/gạch.",
      );
    const old = await db()
      .prepare(
        "SELECT * FROM accounts WHERE id=? AND role IN ('admin','staff')",
      )
      .bind(id)
      .first<Record<string, any>>();
    if (!old || (b.action === "staff-update" && old.role !== "staff"))
      fail("Không tìm thấy tài khoản được phép chỉnh sửa.", 404);
    const hasPassword = typeof b.password === "string" && b.password.length > 0;
    const hash = hasPassword
      ? await passwordHash(validatePassword(b.password))
      : old!.password_hash;
    try {
      const writes = [
        db()
          .prepare(
            "UPDATE accounts SET username=?,password_hash=? WHERE id=? AND role IN ('admin','staff')",
          )
          .bind(username, hash, id),
      ];
      if (hasPassword || username !== old!.username)
        writes.push(
          db().prepare("DELETE FROM sessions WHERE account_id=?").bind(id),
        );
      await db().batch(writes);
    } catch (e) {
      if (String(e).includes("UNIQUE")) fail("Tên đăng nhập đã tồn tại.", 409);
      throw e;
    }
    return {
      ok: true,
      renewSession: id === a.id && (hasPassword || username !== old!.username),
    };
  }
  if (b.action === "staff-status") {
    onlyAdmin(a);
    const id = clean(b.id);
    const changed = await db()
      .prepare("UPDATE accounts SET disabled=? WHERE id=? AND role='staff'")
      .bind(b.disabled ? 1 : 0, id)
      .run();
    if (!changed.meta.changes)
      fail("Chỉ được khóa hoặc mở khóa tài khoản staff.", 403);
    if (b.disabled)
      await db()
        .prepare("DELETE FROM sessions WHERE account_id=?")
        .bind(id)
        .run();
    return { ok: true };
  }
  if (b.action === "delete") {
    onlyAdmin(a);
    const kind = clean(b.kind),
      id = clean(b.id);
    if (kind === "submission") {
      await db().prepare("DELETE FROM submissions WHERE id=?").bind(id).run();
      return { ok: true };
    }
    if (!["tournament", "article", "album"].includes(kind))
      fail("Không thể xóa mục này.");
    if (kind === "tournament") {
      const r = await db()
        .prepare("SELECT id FROM registrations WHERE tournament_id=? LIMIT 1")
        .bind(id)
        .first();
      if (r) fail("Giải đã có đăng ký. Hãy đóng giải thay vì xóa.");
    }
    await db().batch([
      db().prepare("DELETE FROM content WHERE id=? AND kind=?").bind(id, kind),
      db().prepare("DELETE FROM event_state WHERE tournament_id=?").bind(id),
      db()
        .prepare(
          "UPDATE submissions SET status='rejected',note='Nội dung gốc đã bị admin xóa.',reviewed_at=? WHERE target_id=? AND status='pending'",
        )
        .bind(now, id),
    ]);
    return { ok: true };
  }
  if (b.action === "reject-submission") {
    onlyAdmin(a);
    const r = await db()
      .prepare(
        "UPDATE submissions SET status='rejected',note=?,reviewed_at=? WHERE id=? AND status='pending'",
      )
      .bind(
        clean(b.note, 1000) || "Vui lòng chỉnh sửa nội dung rồi gửi lại.",
        now,
        clean(b.id),
      )
      .run();
    if (!r.meta.changes) fail("Đề xuất này đã được xử lý.", 409);
    return { ok: true };
  }
  if (b.action === "publish") {
    onlyAdmin(a);
    const s = await db()
      .prepare("SELECT * FROM submissions WHERE id=? AND status='pending'")
      .bind(clean(b.submissionId))
      .first<Record<string, any>>();
    if (!s) fail("Không tìm thấy nội dung đang chờ duyệt.", 404);
    const data = await validateContent(
      s!.kind,
      b.data || JSON.parse(s!.data),
      s!.target_id,
    );
    await saveCategories(data);
    const writes = contentStatements(s!.kind, s!.target_id, data, {
      submissionId: s!.id,
    });
    writes.push(
      db()
        .prepare(
          "UPDATE submissions SET status='approved',data=?,note=?,reviewed_at=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM content WHERE id=? AND data=?)",
        )
        .bind(
          JSON.stringify(data),
          clean(b.note, 1000),
          now,
          s!.id,
          s!.target_id,
          JSON.stringify(data),
        ),
    );
    const approvalIndex = writes.length - 1;
    writes.push(...retentionStatements(s!.kind), approvalLogRetention());
    const result = await db().batch(writes);
    if (!result[approvalIndex].meta.changes)
      fail("Đề xuất vừa được xử lý bởi người khác.", 409);
    return { ok: true };
  }
  if (b.action === "save" || !b.action) {
    const kind = clean(b.kind);
    if (kind === "settings") onlyAdmin(a);
    if (!["tournament", "article", "album", "settings"].includes(kind))
      fail("Nội dung không hợp lệ.");
    const id =
      kind === "settings" ? "settings" : clean(b.id) || crypto.randomUUID();
    const existing = await db()
      .prepare("SELECT kind FROM content WHERE id=?")
      .bind(id)
      .first<{ kind: string }>();
    if (existing && existing.kind !== kind) fail("ID không hợp lệ.");
    const data = await validateContent(kind, b.data || {}, id);
    await saveCategories(data);
    if (a.role === "staff") {
      if (b.submissionId) {
        const result = await db()
          .prepare(
            "UPDATE submissions SET data=?,created_at=? WHERE id=? AND created_by=? AND kind=? AND target_id=? AND status='pending'",
          )
          .bind(
            JSON.stringify(data),
            now,
            clean(b.submissionId),
            a.id,
            kind,
            id,
          )
          .run();
        if (!result.meta.changes)
          fail("Chỉ được sửa đề xuất đang chờ duyệt của chính bạn.", 403);
        return { ok: true, pending: true };
      }
      const sid = crypto.randomUUID();
      await db()
        .prepare(
          "INSERT INTO submissions (id,kind,target_id,operation,data,status,created_by,created_at,note) VALUES (?,?,?,?,?,'pending',?,?,'')",
        )
        .bind(
          sid,
          kind,
          id,
          existing ? "edit" : "create",
          JSON.stringify(data),
          a.id,
          now,
        )
        .run();
      return { ok: true, pending: true, id: sid };
    }
    const written = await db().batch([
      ...contentStatements(kind, id, data),
      ...retentionStatements(kind),
    ]);
    if (!written[0].meta.changes)
      fail(
        "Giải vừa thay đổi danh sách hoặc số suất. Hãy tải lại trước khi sửa.",
        409,
      );
    return { ok: true, id };
  }
  fail("Thao tác không hợp lệ.");
  return {};
}
