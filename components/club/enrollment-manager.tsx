"use client";
import { useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Users,
  Download,
  Search,
  Check,
} from "lucide-react";
import type { AdminData, Registration } from "@/lib/types";
import {
  api,
  Badge,
  dateLabel,
  deadlineLabel,
  eventStatus,
  DeadlineBadge,
  Empty,
  Modal,
} from "./shared";
export function EnrollmentManager({
  data,
  onReview,
  onDetail,
  onSaved,
}: {
  data: AdminData;
  onReview: (r: Registration) => void;
  onDetail: (r: Registration) => void;
  onSaved: () => void;
}) {
  const [eventId, setEventId] = useState(""),
    [category, setCategory] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [confirm, setConfirm] = useState<"temporary" | "official" | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const t = data.tournaments.find((t) => t.id === eventId);
  if (!t)
    return (
      <div className="event-admin-list">
        {data.tournaments.map((t) => {
          const entries = data.registrations.filter(
            (r) => r.tournamentId === t.id,
          );
          return (
            <button
              className="event-admin-card"
              key={t.id}
              onClick={() => {
                setEventId(t.id);
                setCategory(t.categories[0]);
                setFilter("all");
                setSearch("");
              }}
            >
              <img src={t.image} alt="" />
              <div>
                <div className="entry-badges">
                  <Badge status={eventStatus(t)} />
                  <DeadlineBadge t={t} />
                </div>
                <h2>{t.title}</h2>
                <p>
                  <strong>{dateLabel(t.date)}</strong> · Hạn:{" "}
                  {deadlineLabel(t.deadline)}
                </p>
                <p>
                  {entries.length} đơn ·{" "}
                  {entries.filter((r) => r.status === "pending").length} chờ
                  duyệt · {t.publicationVersion} đợt công bố
                </p>
              </div>
              <ArrowRight size={27} />
            </button>
          );
        })}
        {!data.tournaments.length && <Empty text="Chưa có giải đấu." />}
      </div>
    );
  const cat = category || t.categories[0],
    all = data.registrations.filter((r) => r.tournamentId === t.id),
    chosen = all.filter((r) => ["provisional", "approved"].includes(r.status)),
    expected = chosen.filter((r) => r.category === cat),
    published = all.filter((r) => r.publishedStatus === "approved"),
    listed = all.filter(
      (r) =>
        r.category === cat &&
        (filter === "all" || r.status === filter) &&
        [r.name, r.phone, r.partner]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")),
    );
  async function publish() {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin", {
        action: confirm === "temporary" ? "publish-provisional" : "finalize",
        id: t!.id,
        confirm: true,
        expectedVersion: t!.publicationVersion,
      });
      setConfirm(null);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportExcel() {
    setError("");
    try {
      const response = await fetch(
        "/api/admin/tournaments/" + t!.id + "/export",
      );
      if (!response.ok) {
        const result = (await response.json()) as { error: string };
        throw new Error(result.error);
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = t!.id + "-danh-sach-chinh-thuc.xlsx";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <button className="text-link back-link" onClick={() => setEventId("")}>
        <ChevronLeft size={21} />
        Các giải đấu
      </button>
      <div className="event-review-heading">
        <div>
          <div className="entry-badges">
            <Badge status={eventStatus(t)} />
            <DeadlineBadge t={t} />
          </div>
          <h2>{t.title}</h2>
          <p>
            Hạn đăng ký: <strong>{deadlineLabel(t.deadline)}</strong>
          </p>
          <p className="muted">
            {t.publishedAt
              ? `Đã công bố ${t.publicationVersion} đợt · Lần gần nhất: ${new Date(t.publishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
              : "Chưa công bố danh sách chính thức"}
          </p>
        </div>
        <button
          className="btn outline"
          disabled={!t.officialAt}
          title={
            !t.officialAt
              ? "Cần chốt danh sách chính thức trước khi xuất"
              : "Xuất danh sách chính thức đã công bố"
          }
          onClick={exportExcel}
        >
          <Download size={20} />
          Xuất Excel · Chính thức
        </button>
      </div>
      <div className="tabs category-tabs">
        {t.categories.map((c) => (
          <button
            key={c}
            className={c === cat ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c}{" "}
            <span>
              {chosen.filter((r) => r.category === c).length}/
              {t.categorySlots[c]}
            </span>
          </button>
        ))}
      </div>
      <div className="event-review-layout">
        <div className="admin-panel">
          <div className="panel-heading">
            <h3>Hồ sơ đăng ký · {cat}</h3>
          </div>
          <div className="admin-filters">
            <label className="search-input">
              <Search size={21} />
              <input
                aria-label="Tìm hồ sơ đăng ký"
                placeholder="Tìm tên, SĐT, đồng đội…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="tabs admin-tabs">
            {[
              [
                "approved",
                t.officialAt ? "Chính thức" : "Chính thức · Chưa chốt",
              ],
              ["pending", "Chờ duyệt"],
              ["rejected", "Từ chối"],
              ["all", "Tất cả"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {listed.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Xét duyệt</th>
                    <th>Vận động viên</th>
                    <th>Điểm trình / đồng đội</th>
                    <th>Trạng thái nội bộ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {listed.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button
                          className="btn small"
                          onClick={() => onReview(r)}
                        >
                          Xét duyệt
                        </button>
                      </td>
                      <td>
                        <strong>{r.name}</strong>
                        <small>{r.phone}</small>
                        <small>
                          Hồ sơ VĐV:{" "}
                          {r.profileStatus === "approved"
                            ? "Đã duyệt"
                            : r.profileStatus === "pending"
                              ? "Chờ duyệt"
                              : "Chưa đạt"}
                        </small>
                      </td>
                      <td>
                        {r.rating || "Chưa cập nhật"}
                        <small>{r.partner || "—"}</small>
                      </td>
                      <td>
                        <Badge
                          status={r.status}
                          label={
                            r.status === "approved"
                              ? t.officialAt
                                ? "Chính thức"
                                : "Đã được duyệt"
                              : undefined
                          }
                        />
                        {r.publishedStatus === "approved" &&
                          r.status !== "approved" && (
                            <small>
                              Đang được duyệt trên website · chờ công bố lại
                            </small>
                          )}
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => onDetail(r)}
                        >
                          Chi tiết
                          <ArrowRight size={19} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="Chưa có hồ sơ phù hợp trong nội dung này." />
          )}
        </div>
        <aside className="expected-roster">
          <div className="panel-heading">
            <Users size={24} />
            <h3>Danh sách chọn</h3>
          </div>
          <p className="roster-category">
            {cat} ·{" "}
            <strong>
              {expected.length}/{t.categorySlots[cat]} suất
            </strong>
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>VĐV / cặp được chọn</th>
                </tr>
              </thead>
              <tbody>
                {expected.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>
                      <button
                        className="roster-name"
                        onClick={() => onReview(r)}
                      >
                        {r.name}
                      </button>
                      {r.partner && <small>{r.partner}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!expected.length && (
            <p className="roster-empty">
              Duyệt hồ sơ để thêm vào danh sách chọn.
            </p>
          )}
          <div className="roster-summary">
            {t.categories.map((c) => (
              <div key={c}>
                <span>{c}</span>
                <strong>
                  {chosen.filter((r) => r.category === c).length}/
                  {t.categorySlots[c]}
                </strong>
              </div>
            ))}
          </div>
          <p className="roster-category">
            Đã công bố:{" "}
            <strong>
              {published.length}/{t.capacity}
            </strong>
          </p>
          {!t.officialAt && (
            <button
              className="btn outline full"
              onClick={() => {
                setError("");
                setConfirm("temporary");
              }}
            >
              Công bố danh sách duyệt tạm
            </button>
          )}
          <button
            className={
              "btn full" + (t.officialAt ? " official-roster-action" : "")
            }
            onClick={() => {
              setError("");
              setConfirm("official");
            }}
          >
            {t.officialAt
              ? "Thay đổi danh sách chính thức"
              : "Chốt danh sách VĐV"}
            <Check size={21} />
          </button>
          <p className="muted footnote">
            {t.officialAt ? (
              <>
                Bất kể thay đổi nào về danh sách chính thức đã được công bố đều
                cần <strong>LIÊN HỆ TRỰC TIẾP</strong> với vận động viên bị thay
                đổi.
              </>
            ) : (
              "Duyệt tạm có thể công bố nhiều lần và vẫn nhận đăng ký. Chốt chính thức sẽ đóng đăng ký và mở xuất Excel."
            )}
          </p>
          {error && !confirm && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </aside>
      </div>
      {confirm && (
        <Modal
          title="Xác nhận công bố danh sách"
          onClose={() => setConfirm(null)}
        >
          <h2>
            {confirm === "temporary"
              ? "Công bố danh sách duyệt tạm?"
              : t.officialAt
                ? "Thay đổi danh sách chính thức?"
                : "Chốt danh sách VĐV?"}
          </h2>
          <p>{t.title}</p>
          <div className="roster-summary">
            {t.categories.map((c) => (
              <div key={c}>
                <span>{c}</span>
                <strong>
                  {chosen.filter((r) => r.category === c).length}/
                  {t.categorySlots[c]}
                </strong>
              </div>
            ))}
          </div>
          <p className="notice">
            {confirm === "temporary"
              ? "Danh sách được chọn sẽ hiển thị là đã được duyệt tạm. Hồ sơ bị từ chối vẫn hiển thị chờ xét duyệt; giải tiếp tục nhận đăng ký nếu còn hạn."
              : t.officialAt
                ? "Danh sách chính thức trên website và file Excel sẽ được cập nhật. Bạn cần liên hệ trực tiếp với các VĐV bị thay đổi."
                : "Giải sẽ chuyển sang Đã chốt danh sách VĐV và ngừng nhận đăng ký. Hồ sơ bị từ chối chỉ công khai kết quả sau hạn đăng ký. Hồ sơ chưa xét vẫn giữ trạng thái chờ duyệt."}
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="btn outline" onClick={() => setConfirm(null)}>
              Hủy
            </button>
            <button className="btn" disabled={busy} onClick={publish}>
              {busy
                ? "Đang công bố…"
                : confirm === "temporary"
                  ? "Xác nhận công bố"
                  : "Xác nhận chốt"}
              <Check size={21} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
