"use client";
import { useEffect, useState, useId, type FormEvent } from "react";
import {
  ArrowUpRight,
  LogOut,
  Users,
  Trophy,
  Newspaper,
  Images,
  Settings,
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  ClipboardCheck,
  MessageCircle,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import type {
  AdminData,
  Account,
  Athlete,
  Registration,
  AuthData,
  Submission,
} from "@/lib/types";
import {
  api,
  Logo,
  Modal,
  Empty,
  Badge,
  dateLabel,
  eventStatus,
  DeadlineBadge,
} from "@/components/club/shared";
import { AccountAccess } from "@/components/club/athlete-auth";
import {
  ContentEditor,
  blankContent,
  type ContentDraft,
} from "@/components/club/content-editor";
import {
  AthleteEditor,
  EntryReview,
  AthleteDetails,
} from "@/components/club/athlete-editor";
import { nextEventTransitionDelay } from "@/lib/events";
import { EnrollmentManager } from "@/components/club/enrollment-manager";
const tabs = [
  ["entries", "Hồ sơ đăng ký giải", Trophy],
  ["athletes", "Hồ sơ VĐV", Users],
  ["tournament", "Giải đấu", Trophy],
  ["article", "Tin tức", Newspaper],
  ["album", "Thư viện", Images],
  ["submissions", "Phê duyệt nội dung", ClipboardCheck],
  ["messages", "Lời nhắn", MessageCircle],
  ["settings", "Thông tin CLB", Settings],
  ["accounts", "Quản lý tài khoản", UserCog],
] as const;
export default function Admin() {
  const [account, setAccount] = useState<Account | null>(null),
    [checked, setChecked] = useState(false),
    [data, setData] = useState<AdminData | null>(null),
    [tab, setTab] = useState("entries"),
    [menu, setMenu] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [draft, setDraft] = useState<ContentDraft | null>(null),
    [athlete, setAthlete] = useState<Athlete | null>(null),
    [entry, setEntry] = useState<Registration | null>(null),
    [detail, setDetail] = useState<Registration | null>(null),
    [editStaff, setEditStaff] = useState<Account | null>(null),
    [deleting, setDeleting] = useState<{
      kind: string;
      id: string;
      title: string;
    } | null>(null),
    [reject, setReject] = useState<Submission | null>(null),
    [newStaff, setNewStaff] = useState(false),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [profileFilter, setProfileFilter] = useState("all"),
    [submissionFilter, setSubmissionFilter] = useState("pending"),
    [mediaFilter, setMediaFilter] = useState("active");
  async function refresh() {
    try {
      const d = await api<AdminData>("/api/admin");
      setData(d);
      setAccount(d.account);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const delay = nextEventTransitionDelay(data?.tournaments || []);
    if (delay === null) return;
    const timer = setTimeout(() => {
      void refresh();
    }, delay);
    return () => clearTimeout(timer);
  }, [data?.tournaments]);
  useEffect(() => {
    api<AuthData>("/api/auth")
      .then((d) => {
        setAccount(d.account);
        if (d.account && d.account.role !== "user") refresh();
      })
      .catch((e) => setError(e.message))
      .finally(() => setChecked(true));
  }, []);
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      api<AuthData>("/api/auth")
        .then((d) => {
          setAccount(d.account);
          if (!d.account || d.account.role === "user") {
            setDraft(null);
            setEntry(null);
            setAthlete(null);
            setDetail(null);
          } else refresh();
        })
        .catch(() => {});
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function logout() {
    try {
      await api("/api/auth", undefined, "DELETE");
      setAccount(null);
      setData(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saved(message = "Đã lưu thay đổi.") {
    setDraft(null);
    setAthlete(null);
    setEntry(null);
    setToast(message);
    await refresh();
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api("/api/admin", { action: "delete", ...deleting });
      setDeleting(null);
      await saved("Đã xóa nội dung.");
    } catch (e) {
      setError((e as Error).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  async function rejectSubmission(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reject) return;
    setBusy(true);
    try {
      await api("/api/admin", {
        action: "reject-submission",
        id: reject.id,
        ...Object.fromEntries(new FormData(e.currentTarget)),
      });
      setReject(null);
      await saved("Đã trả nội dung về staff.");
    } catch (e) {
      setError((e as Error).message);
      setReject(null);
    } finally {
      setBusy(false);
    }
  }
  if (!checked)
    return (
      <main className="loading">
        <Logo />
        <p>Đang kiểm tra phiên đăng nhập…</p>
      </main>
    );
  if (!account)
    return (
      <main className="admin-login">
        <a className="text-link" href="/">
          Về website <ArrowUpRight />
        </a>
        <AccountAccess
          onAuthenticated={(role) => {
            if (role === "user") location.href = "/ho-so";
            else refresh();
          }}
        />
        {error && <p className="form-error">{error}</p>}
      </main>
    );
  if (account.role === "user")
    return (
      <main className="loading">
        <Logo />
        <h1>Không gian điều hành</h1>
        <p>Tài khoản hiện tại là hồ sơ VĐV.</p>
        <a className="btn" href="/ho-so">
          Về hồ sơ của tôi
        </a>
      </main>
    );
  const admin = account.role === "admin",
    visibleTabs = tabs.filter(
      ([key]) => admin || !["settings", "accounts"].includes(key),
    );
  const count = (key: string) =>
    !data
      ? 0
      : key === "entries"
        ? data.registrations.filter((r) => r.status === "pending").length
        : key === "athletes"
          ? data.athletes.filter((r) => r.status === "pending").length
          : key === "submissions"
            ? data.submissions.filter((r) => r.status === "pending").length
            : key === "messages"
              ? data.messages.filter((m) => !m.read).length
              : 0;
  const filteredAthletes =
    data?.athletes.filter(
      (p) =>
        (profileFilter === "all" || p.status === profileFilter) &&
        [p.name, p.phone]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")),
    ) || [];
  return (
    <div className="admin-layout">
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"admin-sidebar " + (menu ? "open" : "")}>
        <div className="sidebar-brand">
          <Logo light />
          <button
            className="mobile-only icon-btn"
            aria-label="Đóng menu"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <p className="sidebar-label">
          {admin ? "QUẢN TRỊ CLB" : "ĐIỀU HÀNH · STAFF"}
        </p>
        <nav aria-label="Quản trị">
          {visibleTabs.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                setError("");
                setMenu(false);
              }}
            >
              <Icon size={23} />
              <span>
                {key === "submissions" && !admin ? "Nội dung đã gửi" : label}
              </span>
              {count(key) > 0 && <b>{count(key)}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">
            Xem website <ArrowUpRight size={21} />
          </a>
          <button onClick={logout}>
            <LogOut size={21} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <button
            className="mobile-only icon-btn"
            onClick={() => setMenu(true)}
            aria-label="Mở menu"
          >
            <Menu />
          </button>
          <span>Hoàn Lão / {admin ? "Admin" : "Staff"}</span>
          <strong>{account.username}</strong>
        </header>
        <div className="admin-content">
          <div className="admin-title">
            <h1>
              {tab === "submissions" && !admin
                ? "Nội dung đã gửi"
                : tabs.find((t) => t[0] === tab)?.[1]}
            </h1>
            {["tournament", "article", "album"].includes(tab) && (
              <button
                className="btn"
                onClick={() => setDraft({ kind: tab, data: blankContent(tab) })}
              >
                <Plus size={22} />
                Thêm{" "}
                {tab === "tournament"
                  ? "giải đấu"
                  : tab === "article"
                    ? "bài viết"
                    : "album"}
              </button>
            )}
            {tab === "accounts" && (
              <button className="btn" onClick={() => setNewStaff(true)}>
                <Plus size={22} />
                Thêm staff
              </button>
            )}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!data ? (
            <p>Đang tải dữ liệu…</p>
          ) : (
            <>
              {tab === "entries" && (
                <EnrollmentManager
                  data={data}
                  onReview={setEntry}
                  onDetail={setDetail}
                  onSaved={() => saved("Đã công bố danh sách VĐV.")}
                />
              )}
              {tab === "athletes" && (
                <>
                  <div className="stat-grid">
                    <div>
                      <span>Tổng hồ sơ VĐV</span>
                      <strong>{data.athletes.length}</strong>
                    </div>
                    <div>
                      <span>Chờ xét duyệt</span>
                      <strong>
                        {
                          data.athletes.filter((p) => p.status === "pending")
                            .length
                        }
                      </strong>
                    </div>
                    <div>
                      <span>Đã được cấp quyền VĐV</span>
                      <strong>
                        {
                          data.athletes.filter((p) => p.status === "approved")
                            .length
                        }
                      </strong>
                    </div>
                  </div>
                  <div className="admin-panel">
                    <div className="admin-filters">
                      <label className="search-input">
                        <Search size={21} />
                        <input
                          aria-label="Tìm VĐV"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Tìm theo tên hoặc số điện thoại…"
                        />
                      </label>
                      <select
                        aria-label="Lọc trạng thái hồ sơ VĐV"
                        value={profileFilter}
                        onChange={(e) => setProfileFilter(e.target.value)}
                      >
                        <option value="all">Tất cả hồ sơ</option>
                        <option value="pending">Chờ xét duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="rejected">Chưa đạt yêu cầu</option>
                      </select>
                    </div>
                    {filteredAthletes.length ? (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Vận động viên</th>
                              <th>Giới tính</th>
                              <th>Điểm trình</th>
                              <th>Trạng thái</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAthletes.map((p) => (
                              <tr key={p.id}>
                                <td>
                                  <strong>{p.name}</strong>
                                  <small>{p.phone}</small>
                                </td>
                                <td>{p.gender}</td>
                                <td className="score">
                                  {p.rating || "Chưa cập nhật"}
                                </td>
                                <td>
                                  <Badge status={p.status} />
                                </td>
                                <td>
                                  <button
                                    className="text-link"
                                    onClick={() => setAthlete(p)}
                                  >
                                    Xem / sửa <Pencil size={19} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty text="Chưa có hồ sơ VĐV phù hợp. Hồ sơ mới sẽ xuất hiện tại đây." />
                    )}
                  </div>
                </>
              )}
              {["tournament", "article"].includes(tab) && (
                <div className="admin-card-list">
                  {(tab === "tournament"
                    ? data.tournaments
                    : data.articles
                  ).map((item) => (
                    <article className="admin-list-item" key={item.id}>
                      <img src={item.image || "/pickleball-court.jpg"} alt="" />
                      <div>
                        {"status" in item ? (
                          <div className="entry-badges">
                            <Badge status={eventStatus(item)} />
                            <DeadlineBadge t={item} />
                          </div>
                        ) : (
                          <span className="eyebrow">{item.category}</span>
                        )}
                        <h2>{item.title}</h2>
                        <p>{dateLabel(item.date)}</p>
                      </div>
                      <div className="item-actions">
                        <button
                          className="btn outline small"
                          onClick={() => setDraft({ kind: tab, data: item })}
                        >
                          <Pencil size={19} />
                          {admin ? "Sửa" : "Đề xuất sửa"}
                        </button>
                        {admin && (
                          <button
                            className="icon-btn danger"
                            aria-label={"Xóa " + item.title}
                            onClick={() =>
                              setDeleting({
                                kind: tab,
                                id: item.id,
                                title: item.title,
                              })
                            }
                          >
                            <Trash2 size={21} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                  {!(tab === "tournament" ? data.tournaments : data.articles)
                    .length && <Empty text="Chưa có nội dung được đăng." />}
                </div>
              )}
              {tab === "album" && (
                <>
                  <p className="notice">
                    Thư viện giữ 20 album mới nhất. Mỗi album có ảnh bìa, nhiều
                    ảnh kèm mô tả và các link tổng hợp ảnh/video.
                  </p>
                  <div className="admin-card-list">
                    {data.albums.map((album) => (
                      <article className="admin-list-item" key={album.id}>
                        <img src={album.cover} alt="" />
                        <div>
                          <p className="eyebrow">
                            {dateLabel(album.date)} · {album.photos.length} ảnh
                          </p>
                          <h2>{album.title}</h2>
                        </div>
                        <div className="item-actions">
                          <button
                            className="btn outline small"
                            onClick={() =>
                              setDraft({ kind: "album", data: album })
                            }
                          >
                            <Pencil size={19} />
                            {admin ? "Sửa" : "Đề xuất sửa"}
                          </button>
                          {admin && (
                            <button
                              className="icon-btn danger"
                              aria-label={"Xóa " + album.title}
                              onClick={() =>
                                setDeleting({
                                  kind: "album",
                                  id: album.id,
                                  title: album.title,
                                })
                              }
                            >
                              <Trash2 size={21} />
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {!data.albums.length && <Empty text="Chưa có album." />}
                </>
              )}
              {tab === "submissions" && (
                <>
                  <p className="notice">
                    {admin
                      ? "Nội dung staff gửi được giữ riêng, chưa làm thay đổi website. Bạn có thể sửa, đăng hoặc trả về."
                      : "Mọi nội dung mới và đề xuất chỉnh sửa của bạn chỉ được công khai khi admin duyệt."}
                  </p>
                  <p className="muted footnote">
                    Mục Đã đăng giữ 30 lần phê duyệt gần nhất.
                  </p>
                  <div className="tabs filter-tabs">
                    {[
                      ["pending", "Chờ duyệt"],
                      ["approved", "Đã đăng"],
                      ["rejected", "Đã trả về"],
                      ["all", "Tất cả"],
                    ].map(([v, l]) => (
                      <button
                        className={submissionFilter === v ? "active" : ""}
                        onClick={() => setSubmissionFilter(v)}
                        key={v}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="admin-card-list">
                    {data.submissions
                      .filter(
                        (s) =>
                          submissionFilter === "all" ||
                          s.status === submissionFilter,
                      )
                      .map((s) => (
                        <article className="submission-card" key={s.id}>
                          <div>
                            <div className="entry-badges">
                              <Badge status={s.status} />
                              <Badge
                                status={s.operation}
                                label={
                                  s.operation === "edit"
                                    ? "Đề xuất chỉnh sửa"
                                    : "Đề xuất tạo mới"
                                }
                              />
                            </div>
                            <p className="eyebrow">
                              {s.kind === "article"
                                ? "Bài viết"
                                : s.kind === "tournament"
                                  ? "Giải đấu"
                                  : "Album"}{" "}
                              · {s.author}
                            </p>
                            <h2>{s.data.title}</h2>
                            <p>
                              {new Date(s.createdAt).toLocaleString("vi-VN", {
                                timeZone: "Asia/Ho_Chi_Minh",
                              })}
                            </p>
                            {s.note && <p className="notice">{s.note}</p>}
                          </div>
                          {(s.status === "pending" ||
                            (s.status === "rejected" && !admin)) && (
                            <div className="button-row">
                              <button
                                className="btn"
                                onClick={() =>
                                  setDraft({
                                    kind: s.kind,
                                    data: { ...s.data, id: s.targetId },
                                    submission:
                                      s.status === "pending" ? s : undefined,
                                    publish: admin,
                                  })
                                }
                              >
                                {admin
                                  ? "Xem / sửa & đăng"
                                  : s.status === "rejected"
                                    ? "Chỉnh sửa & gửi lại"
                                    : "Chỉnh sửa đề xuất"}
                                <Pencil size={20} />
                              </button>
                              {admin && (
                                <>
                                  <button
                                    className="btn outline"
                                    onClick={() => setReject(s)}
                                  >
                                    Trả về
                                  </button>
                                  <button
                                    className="text-link danger"
                                    onClick={() =>
                                      setDeleting({
                                        kind: "submission",
                                        id: s.id,
                                        title: s.data.title,
                                      })
                                    }
                                  >
                                    Xóa đề xuất <Trash2 size={19} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                  </div>
                  {!data.submissions.some(
                    (s) =>
                      submissionFilter === "all" ||
                      s.status === submissionFilter,
                  ) && <Empty text="Không có nội dung trong mục này." />}
                </>
              )}
              {tab === "messages" && (
                <div className="message-list">
                  {data.messages.map((m) => (
                    <article
                      className={"message-card " + (!m.read ? "unread" : "")}
                      key={m.id}
                    >
                      <div className="section-head">
                        <div>
                          <h2>{m.name}</h2>
                          <a href={"tel:" + m.phone}>{m.phone}</a>
                        </div>
                        <Badge
                          status={m.read ? "approved" : "pending"}
                          label={m.read ? "Đã đọc" : "Chưa đọc"}
                        />
                      </div>
                      <p className="preserve-text">{m.body}</p>
                      <div className="message-actions">
                        <span>
                          {new Date(m.createdAt).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </span>
                        <button
                          className="text-link"
                          onClick={async () => {
                            try {
                              await api("/api/admin", {
                                action: "message-read",
                                id: m.id,
                                read: !m.read,
                              });
                              await refresh();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          {m.read ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                          <Check size={20} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {!data.messages.length && (
                    <Empty text="Chưa có lời nhắn. Lời nhắn từ trang Liên hệ sẽ xuất hiện tại đây." />
                  )}
                </div>
              )}
              {tab === "settings" && admin && (
                <div className="settings-panel admin-panel">
                  <Logo
                    name={data.settings.clubName}
                    image={data.settings.logoImage}
                  />
                  <dl className="settings-details">
                    <div>
                      <dt>Người liên hệ</dt>
                      <dd>
                        {data.settings.contacts.map((c, i) => (
                          <p key={i}>
                            {c.name || "Đầu mối thứ hai · Sẽ cập nhật"} ·{" "}
                            {c.phone || "SĐT: Sẽ cập nhật"}
                          </p>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt>Số điện thoại</dt>
                      <dd>{data.settings.phone || "Chưa cập nhật"}</dd>
                    </div>
                    <div>
                      <dt>Khu vực</dt>
                      <dd>{data.settings.address}</dd>
                    </div>
                    <div>
                      <dt>Nhóm Zalo dùng chung</dt>
                      <dd>
                        {data.settings.zaloUrl || "Chưa cập nhật link nhóm"}
                      </dd>
                    </div>
                    <div>
                      <dt>Fanpage Facebook</dt>
                      <dd>
                        {data.settings.facebookUrl ||
                          "Chưa cập nhật link fanpage"}
                      </dd>
                    </div>
                    <div>
                      <dt>Banner CLB</dt>
                      <dd>
                        <img
                          className="settings-banner-preview"
                          src={
                            data.settings.clubBannerImage ||
                            "/pickleball-court.jpg"
                          }
                          alt="Banner CLB"
                        />
                      </dd>
                    </div>
                  </dl>
                  <button
                    className="btn"
                    onClick={() =>
                      setDraft({ kind: "settings", data: data.settings })
                    }
                  >
                    Sửa thông tin CLB <Pencil size={21} />
                  </button>
                </div>
              )}
              {tab === "accounts" && admin && (
                <div className="admin-panel">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Tài khoản</th>
                          <th>Vai trò</th>
                          <th>Trạng thái</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {data.accounts.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.username}</strong>
                            </td>
                            <td>{a.role}</td>
                            <td>
                              <Badge
                                status={a.disabled ? "rejected" : "approved"}
                                label={
                                  a.disabled ? "Đã khóa" : "Đang hoạt động"
                                }
                              />
                            </td>
                            <td>
                              <div className="staff-actions">
                                <button
                                  className="btn outline small"
                                  onClick={() => setEditStaff(a)}
                                >
                                  Chỉnh sửa <Pencil size={18} />
                                </button>
                                {a.role === "staff" && (
                                  <button
                                    className="text-link"
                                    onClick={async () => {
                                      try {
                                        await api("/api/admin", {
                                          action: "staff-status",
                                          id: a.id,
                                          disabled: !a.disabled,
                                        });
                                        await saved(
                                          "Đã cập nhật tài khoản staff.",
                                        );
                                      } catch (e) {
                                        setError((e as Error).message);
                                      }
                                    }}
                                  >
                                    {a.disabled ? "Mở khóa" : "Khóa tài khoản"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={22} />
          {toast}
        </div>
      )}
      {draft && data && (
        <ContentEditor
          draft={draft}
          role={account.role}
          categories={data.categories}
          topics={data.topics}
          onClose={() => setDraft(null)}
          onSaved={(pending) =>
            saved(
              pending
                ? "Đã gửi admin phê duyệt."
                : "Đã đăng / cập nhật nội dung.",
            )
          }
        />
      )}
      {athlete && (
        <AthleteEditor
          p={athlete}
          onClose={() => setAthlete(null)}
          onSaved={() => saved("Đã lưu hồ sơ VĐV.")}
        />
      )}
      {detail &&
        data &&
        data.athletes.find((p) => p.id === detail.athleteId) && (
          <AthleteDetails
            p={data.athletes.find((p) => p.id === detail.athleteId)!}
            entry={detail}
            onClose={() => setDetail(null)}
            onEdit={() => {
              setAthlete(data.athletes.find((p) => p.id === detail.athleteId)!);
              setDetail(null);
            }}
          />
        )}
      {entry && data && (
        <EntryReview
          r={entry}
          onClose={() => setEntry(null)}
          onSaved={() => saved("Đã cập nhật danh sách dự kiến.")}
          onEditProfile={() => {
            setAthlete(
              data.athletes.find((p) => p.id === entry.athleteId) || null,
            );
            setEntry(null);
          }}
        />
      )}
      {deleting && (
        <Modal title="Xóa nội dung" onClose={() => setDeleting(null)}>
          <h2>Xóa nội dung này?</h2>
          <p>{deleting.title}</p>
          <div className="form-actions">
            <button className="btn outline" onClick={() => setDeleting(null)}>
              Giữ lại
            </button>
            <button className="btn danger-btn" onClick={remove} disabled={busy}>
              {busy ? "Đang xóa…" : "Xóa nội dung"}
            </button>
          </div>
        </Modal>
      )}
      {reject && (
        <Modal title="Trả nội dung về staff" onClose={() => setReject(null)}>
          <h2>Trả nội dung về staff</h2>
          <p>{reject.data.title}</p>
          <form onSubmit={rejectSubmission} className="form-stack">
            <label>
              Ghi chú chỉnh sửa
              <textarea name="note" rows={4} required />
            </label>
            <button className="btn full" disabled={busy}>
              {busy ? "Đang lưu…" : "Gửi trả nội dung"}
              <ArrowUpRight />
            </button>
          </form>
        </Modal>
      )}
      {editStaff && (
        <NewStaff
          account={editStaff}
          onClose={() => setEditStaff(null)}
          onSaved={() => {
            setEditStaff(null);
            saved("Đã cập nhật tài khoản.");
          }}
        />
      )}
      {newStaff && (
        <NewStaff
          onClose={() => setNewStaff(false)}
          onSaved={() => {
            setNewStaff(false);
            saved("Đã tạo tài khoản staff.");
          }}
        />
      )}
    </div>
  );
}
function NewStaff({
  account,
  onClose,
  onSaved,
}: {
  account?: Account;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin", {
        action: account ? "account-update" : "staff-create",
        id: account?.id,
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
      title={
        account ? "Chỉnh sửa tài khoản " + account.role : "Thêm tài khoản staff"
      }
      onClose={onClose}
      error={error}
      footer={
        <button
          type="submit"
          form={formId}
          className="btn full"
          disabled={busy}
        >
          {busy ? "Đang lưu…" : account ? "Lưu tài khoản" : "Tạo tài khoản"}
          <Check size={21} />
        </button>
      }
    >
      <h2>
        {account
          ? "Chỉnh sửa tài khoản " + account.role
          : "Thêm tài khoản staff"}
      </h2>
      <form id={formId} className="form-stack" onSubmit={submit}>
        <label>
          Tên đăng nhập
          <input
            name="username"
            required
            minLength={3}
            defaultValue={account?.username || ""}
            autoComplete="off"
            placeholder="Ví dụ: staff.thanh"
          />
        </label>
        <label>
          {account
            ? "Mật khẩu mới (để trống để giữ mật khẩu hiện tại)"
            : "Mật khẩu cấp cho staff"}
          <input
            type="password"
            name="password"
            required={!account}
            minLength={8}
            maxLength={128}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
          />
        </label>
        <p className="notice">
          {account?.role === "admin"
            ? "Chỉ admin được sửa thông tin đăng nhập tài khoản admin. Tài khoản này luôn được giữ lại."
            : "Staff được xét duyệt/sửa hồ sơ VĐV và đăng ký giải. Nội dung website do staff soạn cần admin duyệt."}
        </p>
      </form>
    </Modal>
  );
}
