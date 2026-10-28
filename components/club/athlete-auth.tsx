"use client";
import { ratingPattern, ratingHint } from "@/lib/rating";
import { useState, type FormEvent } from "react";
import { ArrowRight, UserPlus, LogIn, Check, ChevronLeft } from "lucide-react";
import type { AuthData, Tournament } from "@/lib/types";
import { ProfilePhotoInput } from "./profile-photo";
import { isDoubles, pairingLabel } from "@/lib/events";
import { api, Modal, Badge } from "./shared";
export function ProfileFields({
  defaults = {},
}: {
  defaults?: Record<string, any>;
}) {
  return (
    <>
      <div className="form-grid">
        <label>
          Họ và tên VĐV *
          <input
            name="name"
            defaultValue={defaults.name || ""}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Nguyễn Văn An"
          />
        </label>
        <label>
          Số điện thoại *
          <input
            name="phone"
            defaultValue={defaults.phone || ""}
            required
            type="tel"
            autoComplete="tel"
            placeholder="09xxxxxxxx"
          />
        </label>
        <label>
          Giới tính *
          <select name="gender" required defaultValue={defaults.gender || ""}>
            <option value="">Chọn Nam / Nữ</option>
            <option>Nam</option>
            <option>Nữ</option>
          </select>
        </label>
        <label>
          Năm sinh
          <input
            name="birthYear"
            defaultValue={defaults.birthYear || ""}
            type="number"
            min={1920}
            max={new Date().getFullYear()}
            placeholder="Ví dụ: 1980"
          />
        </label>
        <label>
          Email
          <input
            name="email"
            defaultValue={defaults.email || ""}
            type="email"
            autoComplete="email"
            placeholder="Không bắt buộc"
          />
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
            defaultValue={defaults.rating || ""}
            placeholder="Ví dụ: 3.5 hoặc 3.45"
          />
        </label>
      </div>
      <p className="muted footnote">{ratingHint}</p>
      <ProfilePhotoInput initial={defaults.photoData || ""} />
      <label>
        Khu vực sinh sống
        <input
          name="address"
          defaultValue={defaults.address || ""}
          maxLength={200}
          placeholder="Xã / phường, tỉnh / thành phố"
        />
      </label>
      <div className="form-grid">
        <label>
          Mật khẩu *
          <input
            name="password"
            defaultValue={defaults.password || ""}
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            placeholder="Ít nhất 8 ký tự"
          />
        </label>
        <label>
          Nhập lại mật khẩu *
          <input
            name="confirmPassword"
            defaultValue={defaults.confirmPassword || ""}
            type="password"
            required
            minLength={8}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input
          name="consent"
          type="checkbox"
          required
          defaultChecked={!!defaults.consent}
        />
        <span>
          Tôi đồng ý để CLB lưu thông tin, xét duyệt hồ sơ; họ tên và điểm trình
          có thể xuất hiện trên bảng xếp hạng khi hồ sơ được duyệt.
        </span>
      </label>
    </>
  );
}
function formObject(form: HTMLFormElement) {
  const f = new FormData(form);
  return { ...Object.fromEntries(f), consent: f.has("consent") };
}
export function LoginFields() {
  return (
    <>
      <label>
        Số điện thoại *
        <input
          name="identifier"
          required
          autoComplete="username"
          placeholder="Nhập số điện thoại đã đăng ký"
        />
      </label>
      <label>
        Mật khẩu *
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>
    </>
  );
}
export function AccountAccess({
  onAuthenticated,
}: {
  onAuthenticated: (role: string) => void;
}) {
  const [mode, setMode] = useState<"login" | "new">("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const b = formObject(e.currentTarget) as Record<string, any>;
    if (mode === "new" && b.password !== b.confirmPassword) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      const d = await api(mode === "login" ? "/api/auth" : "/api/signup", b);
      onAuthenticated(d.account?.role || "user");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-access">
      <div className="tabs">
        <button
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={mode === "login" ? "active" : ""}
        >
          Đăng nhập
        </button>
        <button
          onClick={() => {
            setMode("new");
            setError("");
          }}
          className={mode === "new" ? "active" : ""}
        >
          Tạo hồ sơ VĐV
        </button>
      </div>
      <h1>
        {mode === "login" ? "Chào bạn trở lại." : "Tạo hồ sơ vận động viên"}
      </h1>
      <p className="muted">
        {mode === "login"
          ? "Đăng nhập bằng số điện thoại và mật khẩu đã tạo."
          : "Mỗi SĐT có một hồ sơ duy nhất. Bạn sẽ dùng lại hồ sơ này cho các giải sau."}
      </p>
      <form className="form-stack" onSubmit={submit}>
        {mode === "login" ? <LoginFields /> : <ProfileFields />}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="btn full" disabled={busy}>
          {busy
            ? "Đang xử lý…"
            : mode === "login"
              ? "Đăng nhập"
              : "Gửi hồ sơ xét duyệt"}
          <ArrowRight size={21} />
        </button>
      </form>
    </div>
  );
}
export function EventRegistration({
  t,
  auth,
  refreshAuth,
  onClose,
  onSubmitted,
}: {
  t: Tournament;
  auth: AuthData;
  refreshAuth: () => Promise<AuthData>;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [mode, setMode] = useState<
      "choice" | "login" | "new" | "entry" | "done"
    >(auth.account?.role === "user" ? "entry" : "choice"),
    [newAthlete, setNewAthlete] = useState<Record<string, any> | null>(null),
    [category, setCategory] = useState(t.categories[0]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [newProfile, setNewProfile] = useState(false);
  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("/api/auth", formObject(e.currentTarget));
      await refreshAuth();
      if (r.account.role !== "user")
        throw new Error(
          "Tài khoản này dành cho điều hành. Hãy dùng tài khoản hồ sơ VĐV để thi đấu.",
        );
      setNewAthlete(null);
      setMode("entry");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function prepare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = formObject(e.currentTarget) as Record<string, any>;
    if (d.password !== d.confirmPassword) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setError("");
    setNewAthlete(d);
    setMode("entry");
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/registrations", {
        ...formObject(e.currentTarget),
        tournamentId: t.id,
        newAthlete,
      });
      setNewProfile(result.newProfile);
      await refreshAuth();
      setMode("done");
      onSubmitted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Đăng ký giải đấu" onClose={onClose} wide={mode === "new"}>
      <h2>{mode === "done" ? "Đã nhận đăng ký!" : t.title}</h2>
      {mode !== "done" && (
        <p className="form-subtitle">
          {mode === "entry"
            ? "Mỗi đơn đăng ký một nội dung. Muốn thi đấu nội dung khác, bạn gửi thêm một đơn; thông tin cá nhân được lấy từ hồ sơ VĐV."
            : "Đăng nhập hồ sơ có sẵn hoặc tạo hồ sơ VĐV mới."}
        </p>
      )}
      {auth.account && auth.account.role !== "user" ? (
        <div className="notice">
          Bạn đang dùng tài khoản điều hành. Hãy đăng xuất và dùng tài khoản VĐV
          để đăng ký giải.
        </div>
      ) : (
        <>
          {mode === "choice" && (
            <div className="auth-choices">
              <button onClick={() => setMode("login")}>
                <LogIn size={29} />
                <strong>Đăng nhập hồ sơ</strong>
                <span>Tôi đã có hồ sơ tại CLB</span>
                <ArrowRight />
              </button>
              <button onClick={() => setMode("new")}>
                <UserPlus size={29} />
                <strong>Tạo hồ sơ VĐV mới</strong>
                <span>Đây là lần đầu tôi đăng ký</span>
                <ArrowRight />
              </button>
            </div>
          )}
          {mode === "login" && (
            <form className="form-stack" onSubmit={signIn}>
              <LoginFields />
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="btn full" disabled={busy}>
                {busy ? "Đang đăng nhập…" : "Đăng nhập & tiếp tục"}
                <ArrowRight />
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setMode("new");
                  setError("");
                }}
              >
                Chưa có hồ sơ? Tạo hồ sơ mới
              </button>
            </form>
          )}
          {mode === "new" && (
            <form className="form-stack" onSubmit={prepare}>
              <p className="notice">
                Bước 1/2 · Tạo hồ sơ VĐV. Hồ sơ được gửi cùng đăng ký giải ở
                bước tiếp theo.
              </p>
              <ProfileFields defaults={newAthlete || undefined} />
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="btn full">
                Tiếp tục chọn hạng mục <ArrowRight />
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Đã có hồ sơ? Đăng nhập
              </button>
            </form>
          )}
          {mode === "entry" && (
            <form className="form-stack" onSubmit={submit}>
              <div className="profile-summary">
                <strong>{newAthlete?.name || auth.athlete?.name}</strong>
                <span>
                  {newAthlete
                    ? "Hồ sơ mới · Chờ BTC xét duyệt"
                    : auth.athlete?.phone}
                </span>
                {auth.athlete && <Badge status={auth.athlete.status} />}
              </div>
              {newAthlete && (
                <p className="notice">
                  Bước 2/2 · BTC sẽ nhận 2 hồ sơ: hồ sơ VĐV mới và đăng ký giải
                  đấu này.
                </p>
              )}
              {auth.registrations.some((r) => r.tournamentId === t.id) && (
                <p className="notice">
                  Bạn đã đăng ký:{" "}
                  {auth.registrations
                    .filter((r) => r.tournamentId === t.id)
                    .map((r) => r.category)
                    .join(" · ")}
                  . Hãy chọn nội dung khác nếu muốn gửi thêm đơn.
                </p>
              )}
              <label>
                Hạng mục đăng ký *
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {t.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
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
                  defaultValue={
                    newAthlete?.rating || auth.athlete?.rating || ""
                  }
                  placeholder="Ví dụ: 3.5 hoặc 3.45"
                />
              </label>
              <p className="muted footnote">{ratingHint}</p>
              {isDoubles(category) && t.pairingMode !== "singles" && (
                <p className="notice">
                  Hình thức ghép cặp: {pairingLabel(t.pairingMode)}
                </p>
              )}
              {isDoubles(category) && t.pairingMode === "self" && (
                <label>
                  Họ tên đồng đội *
                  <input
                    name="partner"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Tên VĐV thi đấu cùng bạn"
                  />
                </label>
              )}
              {isDoubles(category) && t.pairingMode === "draw" && (
                <p className="notice">
                  BTC bốc thăm ghép cặp sau khi kết thúc đăng ký. Bạn không cần
                  nhập đồng đội.
                </p>
              )}
              <label>
                Lời nhắn cho BTC
                <textarea
                  className="registration-note"
                  name="note"
                  rows={2}
                  maxLength={1000}
                  placeholder={
                    isDoubles(category) && t.pairingMode === "draw"
                      ? "Đồng đội mong muốn của bạn…"
                      : "Lời nhắn của bạn…"
                  }
                />
              </label>
              <label className="checkbox-label">
                <input name="consent" type="checkbox" required />
                <span>
                  Tôi đồng ý gửi hồ sơ đến BTC và hiển thị họ tên, hạng mục,
                  trạng thái trong danh sách đăng ký giải.
                </span>
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="btn full" disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi đăng ký thi đấu"}
                <ArrowRight />
              </button>
              {newAthlete && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setMode("new")}
                >
                  <ChevronLeft />
                  Sửa thông tin hồ sơ mới
                </button>
              )}
            </form>
          )}
          {mode === "done" && (
            <div className="success-state">
              <span className="success-icon">
                <Check size={35} />
              </span>
              <p>
                {newProfile
                  ? "BTC đã nhận hồ sơ VĐV mới và hồ sơ đăng ký giải."
                  : "BTC đã nhận hồ sơ đăng ký giải của bạn."}
              </p>
              <p className="muted">
                Bạn có thể xem trạng thái trong Hồ sơ của tôi hoặc danh sách VĐV
                của giải. Kết quả duyệt tạm có thể thay đổi trước khi BTC chốt
                danh sách.
              </p>
              <a className="btn full" href="/ho-so">
                Xem hồ sơ của tôi <ArrowRight />
              </a>
              <button className="text-link" onClick={onClose}>
                Tiếp tục xem giải đấu
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
