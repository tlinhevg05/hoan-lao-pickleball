"use client";
import { ratingPattern, ratingHint } from "@/lib/rating";
import { useState, useId, type FormEvent } from "react";
import { Check } from "lucide-react";
import type { Athlete, Registration } from "@/lib/types";
import { Modal, api, Badge } from "./shared";
export function AthleteEditor({
  p,
  onClose,
  onSaved,
}: {
  p: Athlete;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin", {
        action: "profile",
        id: p.id,
        data: Object.fromEntries(new FormData(e.currentTarget)),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title="Hồ sơ vận động viên"
      onClose={onClose}
      error={error}
      footer={
        <button
          type="submit"
          form={formId}
          className="btn full"
          disabled={busy}
        >
          {busy ? "Đang lưu…" : "Lưu hồ sơ & kết quả xét duyệt"}
          <Check size={21} />
        </button>
      }
    >
      {p.photo && (
        <img
          className="athlete-photo"
          src={p.photo}
          alt={"Ảnh cá nhân của " + p.name}
        />
      )}
      <h2>{p.name}</h2>
      <p className="form-subtitle">
        Chỉnh sửa thông tin và xét duyệt hồ sơ VĐV.
      </p>
      <form id={formId} className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Họ và tên *
            <input name="name" required minLength={2} defaultValue={p.name} />
          </label>
          <label>
            Số điện thoại *
            <input name="phone" required type="tel" defaultValue={p.phone} />
          </label>
          <label>
            Giới tính *
            <select name="gender" defaultValue={p.gender}>
              <option>Nam</option>
              <option>Nữ</option>
            </select>
          </label>
          <label>
            Năm sinh
            <input
              name="birthYear"
              type="number"
              min={1920}
              max={new Date().getFullYear()}
              defaultValue={p.birthYear}
            />
          </label>
          <label>
            Email
            <input name="email" type="email" defaultValue={p.email} />
          </label>
          <label>
            Khu vực
            <input name="address" defaultValue={p.address} />
          </label>
          <label>
            Điểm trình *
            <input
              name="rating"
              required
              inputMode="decimal"
              pattern={ratingPattern}
              title={ratingHint}
              type="text"
              defaultValue={p.rating}
              placeholder="Ví dụ: 3.5 hoặc 3.45"
            />
          </label>
        </div>
        <label>
          Xét duyệt hồ sơ
          <select name="status" defaultValue={p.status}>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Cấp quyền VĐV · Đã duyệt</option>
            <option value="rejected">Chưa đạt yêu cầu</option>
          </select>
        </label>
        <label>
          Ghi chú cho VĐV
          <textarea name="note" defaultValue={p.note} rows={3} />
        </label>
        <p className="notice">
          Điểm trình dùng để xếp hạng Nam/Nữ khi hồ sơ được duyệt. Thay SĐT cũng
          thay SĐT dùng để đăng nhập.
        </p>
      </form>
    </Modal>
  );
}
export function EntryReview({
  r,
  onClose,
  onSaved,
  onEditProfile,
}: {
  r: Registration;
  onClose: () => void;
  onSaved: () => void;
  onEditProfile: () => void;
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin", {
        action: "review",
        id: r.id,
        ...Object.fromEntries(new FormData(e.currentTarget)),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Xét duyệt đăng ký giải"
      onClose={onClose}
      error={error}
      footer={
        <button
          type="submit"
          form={formId}
          className="btn full"
          disabled={busy}
        >
          {busy ? "Đang lưu…" : "Lưu kết quả xét duyệt"}
          <Check size={21} />
        </button>
      }
    >
      <h2>{r.name}</h2>
      <div className="review-profile">
        <Badge
          status={r.profileStatus}
          label={
            "Hồ sơ VĐV: " +
            (r.profileStatus === "approved"
              ? "Đã duyệt"
              : r.profileStatus === "pending"
                ? "Chờ duyệt"
                : "Chưa đạt")
          }
        />
        <button className="text-link" onClick={onEditProfile}>
          Xem / sửa hồ sơ VĐV
        </button>
      </div>
      <dl className="review-details">
        {[
          ["SĐT", r.phone],
          ["Hạng mục", r.category],
          ["Điểm trình", r.rating || "Chưa cập nhật"],
          ["Đồng đội", r.partner || "—"],
          ["Lời nhắn", r.note || "—"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <form id={formId} onSubmit={submit} className="form-stack">
        <label>
          Kết quả xét duyệt
          <select
            name="status"
            defaultValue={r.status === "approved" ? "provisional" : r.status}
          >
            <option value="pending">Chờ duyệt</option>
            <option
              value="provisional"
              disabled={r.profileStatus !== "approved"}
            >
              Duyệt tạm
            </option>
            <option value="rejected">Từ chối</option>
          </select>
        </label>
        {r.profileStatus !== "approved" && (
          <p className="notice">
            Cần duyệt hồ sơ VĐV trước khi chọn vào danh sách dự kiến.
          </p>
        )}
        <label>
          Ghi chú cho VĐV
          <textarea name="note" rows={3} defaultValue={r.adminNote} />
        </label>
      </form>
    </Modal>
  );
}

export function AthleteDetails({
  p,
  entry,
  onClose,
  onEdit,
}: {
  p: Athlete;
  entry: Registration;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Modal wide title="Chi tiết hồ sơ VĐV" onClose={onClose}>
      <p className="eyebrow">CHI TIẾT HỒ SƠ VẬN ĐỘNG VIÊN</p>
      {p.photo && (
        <img
          className="athlete-photo"
          src={p.photo}
          alt={"Ảnh cá nhân của " + p.name}
        />
      )}
      <h2>{p.name}</h2>
      <Badge status={p.status} />
      <dl className="review-details">
        {[
          ["Số điện thoại", p.phone],
          ["Giới tính", p.gender],
          ["Năm sinh", p.birthYear],
          ["Email", p.email],
          ["Khu vực", p.address],
          ["Điểm trình", p.rating],
          ["Ghi chú hồ sơ", p.note],
          ["Ngày tạo hồ sơ", new Date(p.createdAt).toLocaleString("vi-VN")],
          ["Hạng mục đăng ký", entry.category],
          ["Điểm trình đăng ký", entry.rating],
          ["Đồng đội", entry.partner],
          ["Lời nhắn đăng ký", entry.note],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "Chưa cập nhật"}</dd>
          </div>
        ))}
      </dl>
      <button className="btn" onClick={onEdit}>
        Chỉnh sửa hồ sơ <Check size={21} />
      </button>
    </Modal>
  );
}
