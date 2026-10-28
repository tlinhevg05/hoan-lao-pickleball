"use client";
import { nextEventTransitionDelay, pairingLabel } from "@/lib/events";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Clock3,
  Users,
  Menu,
  X,
  Play,
  ChevronRight,
  Phone,
  MessageCircle,
  LogIn,
  LogOut,
  Home,
  Trophy,
  Newspaper,
  Images,
  Medal,
  UserRound,
  ChevronLeft,
} from "lucide-react";
import type {
  SiteData,
  Tournament,
  Album,
  Article,
  AuthData,
  PublicEntry,
} from "@/lib/types";
import {
  api,
  Logo,
  Modal,
  SectionHead,
  Empty,
  dateLabel,
  deadlineLabel,
  Badge,
  eventStatus,
  ZaloButton,
  FacebookButton,
} from "./shared";
import { AccountAccess, EventRegistration } from "./athlete-auth";
import { numericRating } from "@/lib/rating";
import { RichText } from "./rich-text";
import { ContactForm } from "./contact-form";
import { ClubFooter, SidebarSponsors, FloatingZalo } from "./footer-links";
type View =
  | "home"
  | "tournaments"
  | "news"
  | "library"
  | "contact"
  | "ranking"
  | "login"
  | "profile";
const anonymous: AuthData = { account: null, athlete: null, registrations: [] };
export default function Site({
  view = "home",
  itemId,
}: {
  view?: View;
  itemId?: string;
}) {
  const [data, setData] = useState<SiteData | null>(null),
    [auth, setAuth] = useState<AuthData>(anonymous),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false),
    [register, setRegister] = useState<Tournament | null>(null),
    [eventFilter, setEventFilter] = useState("all"),
    [newsFilter, setNewsFilter] = useState("Tất cả"),
    [eventTab, setEventTab] = useState("details");
  async function refreshAuth() {
    const d = await api<AuthData>("/api/auth");
    setAuth(d);
    return d;
  }
  async function refresh() {
    try {
      const [d, a] = await Promise.all([
        api<SiteData>("/api/site"),
        api<AuthData>("/api/auth"),
      ]);
      setData(d);
      setAuth(a);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    refresh();
    if (
      new URLSearchParams(window.location.search).get("tab") === "participants"
    )
      setEventTab("participants");
  }, []);
  useEffect(() => {
    const delay = nextEventTransitionDelay(data?.tournaments || []);
    if (delay === null) return;
    const timer = setTimeout(() => {
      api<SiteData>("/api/site")
        .then(setData)
        .catch(() => {});
    }, delay);
    return () => clearTimeout(timer);
  }, [data?.tournaments]);
  async function logout() {
    try {
      await api("/api/auth", undefined, "DELETE");
      setAuth(anonymous);
      if (view === "profile") location.href = "/dang-nhap";
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (error)
    return (
      <main className="loading">
        <Logo />
        <h1>Chưa kết nối được dữ liệu</h1>
        <p>{error}</p>
        <button
          className="btn"
          onClick={() => {
            setError("");
            refresh();
          }}
        >
          Thử lại
        </button>
      </main>
    );
  if (!data)
    return (
      <main className="loading">
        <Logo />
        <p>Đang chuẩn bị sân…</p>
      </main>
    );
  const { settings: s, tournaments, articles, albums } = data;
  const feature =
    tournaments.find(
      (t) => t.featured && eventStatus(t) === eventStatus(tournaments[0]),
    ) || tournaments[0];
  const event =
      view === "tournaments" && itemId
        ? tournaments.find((t) => t.id === itemId)
        : null,
    article =
      view === "news" && itemId ? articles.find((a) => a.id === itemId) : null;
  const album =
    view === "library" && itemId ? albums.find((a) => a.id === itemId) : null;
  const nav = [
    ["/", "Trang chủ", "home", Home],
    ["/giai-dau", "Giải đấu", "tournaments", Trophy],
    ["/tin-tuc", "Tin tức & Thư viện", "news", Newspaper],
    ["/bang-xep-hang", "Bảng xếp hạng", "ranking", Medal],
    ["/lien-he", "Liên hệ", "contact", MessageCircle],
  ] as const;
  const authUrl = auth.account
    ? auth.account.role === "user"
      ? "/ho-so"
      : "/admin"
    : "/dang-nhap";
  return (
    <div className="public-layout">
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"public-sidebar " + (menu ? "open" : "")}>
        <div className="sidebar-brand">
          <Logo light name={s.clubName} image={s.logoImage} />
          <button
            className="mobile-only icon-btn"
            onClick={() => setMenu(false)}
            aria-label="Đóng menu"
          >
            <X />
          </button>
        </div>
        <p className="sidebar-label">CLB PICKLEBALL XÃ HOÀN LÃO TỈNH QUẢNG TRỊ</p>
        <nav aria-label="Điều hướng chính">
          {nav.map(([href, label, key, Icon]) => (
            <a
              key={key}
              href={href}
              aria-current={
                view === key || (key === "news" && view === "library")
                  ? "page"
                  : undefined
              }
            >
              <Icon size={23} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            className={
              view === "profile" || view === "login"
                ? "account-link active"
                : "account-link"
            }
            href={authUrl}
          >
            <UserRound size={23} />
            {auth.account
              ? auth.account.role === "user"
                ? "Hồ sơ của tôi & Giải đấu đã đăng ký"
                : "Không gian điều hành"
              : "Đăng nhập / Đăng ký"}
          </a>
          {auth.account && (
            <button onClick={logout}>
              <LogOut size={21} />
              Đăng xuất
            </button>
          )}
          <SidebarSponsors settings={s} />
        </div>
      </aside>
      <div className="public-main">
        <header className="public-topbar">
          <button
            className="mobile-only icon-btn"
            onClick={() => setMenu(true)}
            aria-expanded={menu}
            aria-label="Mở menu"
          >
            <Menu size={27} />
          </button>
          <div className="topbar-brand">
            <Logo name={s.clubName} image={s.logoImage} />
          </div>
          <a
            className="btn small"
            href={authUrl}
            aria-label={auth.account ? (auth.account.role === "user" ? "Hồ sơ của tôi" : "Quản trị") : "Đăng nhập / Đăng ký"}
          >
            <LogIn size={20} />
            <span className="topbar-auth-label">
            {auth.account
              ? auth.account.role === "user"
                ? "Hồ sơ của tôi"
                : "Quản trị"
              : "Đăng nhập / Đăng ký"}
            </span>
            <span className="topbar-auth-short" aria-hidden="true">
              {auth.account ? (auth.account.role === "user" ? "Hồ sơ" : "Quản trị") : "Đăng nhập"}
            </span>
          </a>
        </header>
        <main id="main" className={view === "home" ? "home-page" : undefined}>
          {view === "home" && (
            <>
              <section className="club-banner" aria-label="Hoàn Lão Pickleball">
                <img
                  src={s.clubBannerImage || "/pickleball-court.jpg"}
                  alt="Sân pickleball — ảnh tham khảo cho banner CLB"
                />
                <div>
                  <span>HOÀN LÃO PICKLEBALL</span>
                  <strong>Cùng ra sân. Cùng kết nối.</strong>
                </div>
              </section>
              {feature && (
                <section className="front-page">
                  <div className="front-hero">
                    <Poster
                      images={
                        feature.posters?.length
                          ? feature.posters
                          : [feature.image]
                      }
                      title={feature.title}
                      href={"/giai-dau/" + feature.id}
                    />
                    <div className="front-actions">
                      <div>
                        <Badge status={eventStatus(feature)} />
                        <h1>{feature.title}</h1>
                      </div>
                      <EventSummary t={feature} hero />
                      <div className="button-row">
                        <button
                          className="btn"
                          disabled={eventStatus(feature) !== "open"}
                          onClick={() => setRegister(feature)}
                        >
                          Đăng ký giải <ArrowRight size={21} />
                        </button>
                        <a
                          className="btn outline"
                          href={"/giai-dau/" + feature.id + "?tab=participants"}
                        >
                          Danh sách VĐV <Users size={21} />
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              <section className="section">
                <SectionHead
                  title="Giải đấu & giao lưu"
                  href="/giai-dau"
                  link="Tất cả giải đấu"
                />
                {tournaments.length > 1 ? (
                  tournaments
                    .filter((t) => t.id !== feature?.id)
                    .slice(0, 2)
                    .map((t) => (
                      <EventCard
                        key={t.id}
                        t={t}
                        onRegister={() => setRegister(t)}
                      />
                    ))
                ) : (
                  <Empty text="Lịch giải đấu sẽ sớm được CLB công bố." />
                )}
              </section>
              <section className="section section-tint">
                <SectionHead
                  title="Tin tức & hoạt động"
                  href="/tin-tuc"
                  link="Tất cả tin tức"
                />
                {articles.length ? (
                  <div className="news-grid">
                    {articles.slice(0, 3).map((a) => (
                      <NewsCard a={a} key={a.id} />
                    ))}
                  </div>
                ) : (
                  <Empty text="Những tin tức đầu tiên đang được chuẩn bị." />
                )}
              </section>
              <section className="section">
                <SectionHead
                  title="Khoảnh khắc trên sân"
                  href="/thu-vien"
                  link="Mở thư viện"
                />
                <div className="album-grid">
                  {albums.slice(0, 3).map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
                {!albums.length && (
                  <Empty text="Album mới sẽ sớm xuất hiện tại đây." />
                )}
              </section>
            </>
          )}
          {view === "tournaments" && !itemId && (
            <>
              <PageIntro
                title="Giải đấu & giao lưu"
                desc="Chọn giải, đăng ký thi đấu hoặc theo dõi danh sách vận động viên."
              />
              <section className="section">
                <div className="tabs filter-tabs">
                  {[
                    ["all", "Tất cả"],
                    ["open", "Đang mở đăng ký"],
                    ["soon", "Sẽ công bố"],
                    ["closed", "Đóng đăng ký"],
                  ].map(([v, l]) => (
                    <button
                      className={eventFilter === v ? "active" : ""}
                      onClick={() => setEventFilter(v)}
                      key={v}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {tournaments
                  .filter(
                    (t) =>
                      eventFilter === "all" || eventStatus(t) === eventFilter,
                  )
                  .map((t) => (
                    <EventCard
                      t={t}
                      key={t.id}
                      onRegister={() => setRegister(t)}
                    />
                  ))}
                {!tournaments.some(
                  (t) =>
                    eventFilter === "all" || eventStatus(t) === eventFilter,
                ) && <Empty text="Chưa có giải trong mục này." />}
              </section>
            </>
          )}
          {view === "tournaments" &&
            itemId &&
            (event ? (
              <>
                <div className="breadcrumb">
                  <a href="/giai-dau">Giải đấu</a>
                  <ChevronRight size={18} />
                  <span>{event.title}</span>
                </div>
                <section className="section detail-section">
                  <EventCard
                    t={event}
                    onRegister={() => setRegister(event)}
                    detail
                  />
                  <div className="detail-tabs tabs">
                    <button
                      className={eventTab === "details" ? "active" : ""}
                      onClick={() => setEventTab("details")}
                    >
                      Thông tin giải
                    </button>
                    <button
                      className={eventTab === "participants" ? "active" : ""}
                      onClick={() => setEventTab("participants")}
                    >
                      <Users size={20} />
                      Danh sách VĐV
                    </button>
                  </div>
                  {eventTab === "details" ? (
                    <div className="detail-columns">
                      <article className="prose">
                        <h2>Thể lệ & thông tin giải</h2>

                        <div className="preserve-text">{event.description}</div>
                      </article>
                      <aside className="side-panel">
                        <h3>Kết nối cùng BTC</h3>
                        <p>
                          Hỏi đáp, cập nhật lịch và giao lưu cùng các VĐV trong
                          nhóm chung của CLB.
                        </p>
                        <ZaloButton settings={s} />
                      </aside>
                    </div>
                  ) : (
                    <Participants
                      t={event}
                      settings={s}
                      viewerId={auth.account?.id || ""}
                    />
                  )}
                </section>
              </>
            ) : (
              <NotFound />
            ))}
          {(view === "news" || view === "library") && (
            <ContentTabs active={view} />
          )}
          {view === "news" && !itemId && (
            <>
              <PageIntro
                title="Tin tức"
                desc="Thông tin mới nhất từ Hoàn Lão Pickleball."
              />
              <section className="section">
                <div className="tabs filter-tabs">
                  {["Tất cả", ...new Set(articles.map((a) => a.category))].map(
                    (f) => (
                      <button
                        key={f}
                        className={newsFilter === f ? "active" : ""}
                        onClick={() => setNewsFilter(f)}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
                <div className="news-grid">
                  {articles
                    .filter(
                      (a) =>
                        newsFilter === "Tất cả" || a.category === newsFilter,
                    )
                    .map((a) => (
                      <NewsCard key={a.id} a={a} />
                    ))}
                </div>
                {!articles.length && (
                  <Empty text="Tin tức sẽ sớm được cập nhật." />
                )}
              </section>
            </>
          )}
          {view === "news" &&
            itemId &&
            (article ? (
              <article className="article-page section">
                <a className="text-link" href="/tin-tuc">
                  <ChevronLeft size={20} />
                  Tin tức
                </a>
                <p className="eyebrow">
                  {article.category} · {dateLabel(article.date)}
                </p>
                <h1>{article.title}</h1>
                <p className="article-lead">{article.excerpt}</p>
                <img
                  className="article-cover"
                  src={article.image || "/pickleball-court.jpg"}
                  alt={article.title}
                />
                <RichText body={article.body} sections={article.sections} />
              </article>
            ) : (
              <NotFound />
            ))}
          {view === "library" && !itemId && (
            <>
              <PageIntro
                title="Thư viện CLB"
                desc="Các album ảnh và đường link lưu lại những khoảnh khắc cùng CLB."
              />
              <section className="section">
                <div className="album-grid">
                  {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
                {!albums.length && (
                  <Empty text="Album đầu tiên sẽ sớm được cập nhật." />
                )}
              </section>
            </>
          )}
          {view === "library" &&
            itemId &&
            (album ? <AlbumPage album={album} /> : <NotFound />)}
          {view === "ranking" && (
            <>
              <PageIntro
                title="Bảng xếp hạng CLB"
                desc="Điểm trình của các vận động viên có hồ sơ đã được phê duyệt."
              />
              <section className="section">
                <div className="ranking-grid">
                  {["Nam", "Nữ"].map((g) => (
                    <div className="ranking-panel" key={g}>
                      <h2>Vận động viên {g.toLowerCase()}</h2>
                      {data.ranking.filter((a) => a.gender === g).length ? (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Hạng</th>
                                <th>Vận động viên</th>
                                <th>Điểm trình</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.ranking
                                .filter((a) => a.gender === g)
                                .map((a, i, all) => {
                                  const rank =
                                    all.findIndex(
                                      (x) =>
                                        numericRating(x.rating) ===
                                        numericRating(a.rating),
                                    ) + 1;
                                  return (
                                    <tr key={a.id}>
                                      <td>
                                        <span
                                          className={"rank-number rank-" + rank}
                                        >
                                          {numericRating(a.rating) === null
                                            ? "—"
                                            : rank}
                                        </span>
                                      </td>
                                      <td>
                                        <strong>{a.name}</strong>
                                      </td>
                                      <td className="score">
                                        {a.rating || "Chưa cập nhật"}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty text="Chưa có hồ sơ được duyệt trong bảng này." />
                      )}
                    </div>
                  ))}
                </div>
                <p className="muted footnote">
                  Điểm do ban điều hành cập nhật theo đánh giá của CLB.
                </p>
              </section>
            </>
          )}
          {view === "contact" && (
            <>
              <PageIntro
                title="Liên hệ CLB"
                desc="Bạn muốn giao lưu, hỏi về giải đấu hoặc gửi lời nhắn đến ban điều hành?"
              />
              <section className="section contact-layout">
                <div className="contact-info">
                  <p className="eyebrow">ĐẦU MỐI LIÊN HỆ</p>
                  {s.contacts.map((contact, i) => (
                    <div className="contact-person" key={i}>
                      <h2>{contact.name || "Đầu mối thứ hai · Sẽ cập nhật"}</h2>
                      <div className="contact-line">
                        <Phone size={25} />
                        <div>
                          <small>Điện thoại</small>
                          {contact.phone ? (
                            <a href={"tel:" + contact.phone}>{contact.phone}</a>
                          ) : (
                            <strong>Sẽ cập nhật</strong>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <p>{s.clubName}</p>
                  <div className="contact-socials">
                    <ZaloButton settings={s} />
                    <FacebookButton settings={s} />
                  </div>
                  <div className="contact-line">
                    <MapPin size={25} />
                    <div>
                      <small>Khu vực sinh hoạt</small>
                      <strong>{s.address}</strong>
                    </div>
                  </div>
                </div>
                <ContactForm />
              </section>
            </>
          )}
          {view === "login" && (
            <section className="section auth-page">
              {auth.account ? (
                <div className="account-access">
                  <h1>Bạn đã đăng nhập</h1>
                  <p>
                    Tiếp tục đến{" "}
                    {auth.account.role === "user"
                      ? "hồ sơ VĐV"
                      : "không gian điều hành"}
                    .
                  </p>
                  <a className="btn" href={authUrl}>
                    Tiếp tục <ArrowRight />
                  </a>
                  <button className="text-link" onClick={logout}>
                    Đăng xuất để đổi tài khoản
                  </button>
                </div>
              ) : (
                <AccountAccess
                  onAuthenticated={(role) =>
                    (location.href = role === "user" ? "/ho-so" : "/admin")
                  }
                />
              )}
            </section>
          )}
          {view === "profile" && (
            <>
              <PageIntro
                title="Hồ sơ của tôi"
                desc="Thông tin VĐV và những giải đấu bạn đã đăng ký."
              />
              <section className="section">
                {!auth.account ? (
                  <AccountAccess
                    onAuthenticated={(role) =>
                      (location.href = role === "user" ? "/ho-so" : "/admin")
                    }
                  />
                ) : auth.account.role !== "user" ? (
                  <a className="btn" href="/admin">
                    Mở không gian điều hành <ArrowRight />
                  </a>
                ) : (
                  auth.athlete && (
                    <>
                      <div className="profile-card">
                        <div>
                          {auth.athlete.photo && (
                            <img
                              className="athlete-photo"
                              src={auth.athlete.photo}
                              alt="Ảnh cá nhân của bạn"
                            />
                          )}
                          <Badge status={auth.athlete.status} />
                          <h2>{auth.athlete.name}</h2>
                          <p>
                            {auth.athlete.phone} · {auth.athlete.gender}
                            {auth.athlete.birthYear
                              ? " · " + auth.athlete.birthYear
                              : ""}
                          </p>
                          <p className="muted">
                            Điểm trình:{" "}
                            <strong>
                              {auth.athlete.rating || "Chưa cập nhật"}
                            </strong>
                          </p>
                        </div>
                        <div>
                          <p className="muted">
                            Thông tin do BTC xét duyệt. Cần chỉnh sửa hồ sơ?
                            Liên hệ ban điều hành.
                          </p>
                          <ZaloButton settings={s} />
                        </div>
                        {auth.athlete.note && (
                          <p className="notice full-grid">
                            Ghi chú BTC: {auth.athlete.note}
                          </p>
                        )}
                      </div>
                      <SectionHead title="Giải đấu đã đăng ký" />
                      {auth.registrations.length ? (
                        <div className="account-entries">
                          {auth.registrations.map((r) => {
                            const tournament = tournaments.find(
                              (t) => t.id === r.tournamentId,
                            );
                            return (
                              <article className="account-entry" key={r.id}>
                                <div>
                                  <div className="entry-badges">
                                    <Badge
                                      status={r.status}
                                      label={
                                        r.status === "approved"
                                          ? tournament?.officialAt
                                            ? "Chính thức"
                                            : "Đã được duyệt"
                                          : undefined
                                      }
                                    />
                                    {tournament && (
                                      <Badge status={eventStatus(tournament)} />
                                    )}
                                  </div>
                                  <h3>
                                    {tournaments.find(
                                      (t) => t.id === r.tournamentId,
                                    )?.title || "Giải đấu"}
                                  </h3>
                                  <p>
                                    {r.category} · Điểm trình:{" "}
                                    {r.rating || "Chưa cập nhật"}
                                    {r.partner
                                      ? " · Đồng đội: " + r.partner
                                      : ""}
                                  </p>
                                  {tournament && (
                                    <p className="entry-time">
                                      <CalendarDays size={20} /> Ngày diễn ra:{" "}
                                      <strong>
                                        {dateLabel(tournament.date)}
                                      </strong>
                                      <span>
                                        Hạn đăng ký:{" "}
                                        <strong>
                                          {deadlineLabel(tournament.deadline)}
                                        </strong>
                                      </span>
                                    </p>
                                  )}
                                  <p className="muted">
                                    Đã đăng ký lúc{" "}
                                    {new Date(r.createdAt).toLocaleString(
                                      "vi-VN",
                                      { timeZone: "Asia/Ho_Chi_Minh" },
                                    )}
                                  </p>
                                  {r.adminNote && (
                                    <p className="notice">{r.adminNote}</p>
                                  )}
                                </div>
                                <a
                                  className="btn outline"
                                  href={
                                    "/giai-dau/" +
                                    r.tournamentId +
                                    "?tab=participants"
                                  }
                                >
                                  Danh sách VĐV <ArrowUpRight size={20} />
                                </a>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <Empty text="Bạn chưa đăng ký giải nào. Hãy chọn giải đấu đang mở để tham gia." />
                      )}
                    </>
                  )
                )}
              </section>
            </>
          )}
        </main>
        <ClubFooter settings={s} />
      </div>
      <FloatingZalo settings={s} />
      {register && (
        <EventRegistration
          t={register}
          auth={auth}
          refreshAuth={refreshAuth}
          onClose={() => setRegister(null)}
          onSubmitted={() => {
            api<SiteData>("/api/site").then(setData);
          }}
        />
      )}
    </div>
  );
}
function PageIntro({ title, desc }: { title: string; desc: string }) {
  return (
    <section className="page-intro">
      <h1>{title}</h1>
      <p>{desc}</p>
    </section>
  );
}
export function Poster({
  images,
  title,
  href,
}: {
  images: string[];
  title: string;
  href?: string;
}) {
  const [index, setIndex] = useState(0);
  const pics = images.filter(Boolean);
  const img = (
    <img
      src={pics[Math.min(index, pics.length - 1)] || "/pickleball-court.jpg"}
      alt={"Banner " + title}
    />
  );
  return (
    <div className="poster-view">
      {href ? (
        <a href={href} className="poster-image">
          {img}
        </a>
      ) : (
        <div className="poster-image">{img}</div>
      )}
      {pics.length > 1 && (
        <div className="poster-controls">
          <button
            className="icon-btn"
            aria-label="Banner trước"
            onClick={() => setIndex((index - 1 + pics.length) % pics.length)}
          >
            <ChevronLeft />
          </button>
          <span>
            {index + 1} / {pics.length}
          </span>
          <button
            className="icon-btn"
            aria-label="Banner tiếp theo"
            onClick={() => setIndex((index + 1) % pics.length)}
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
function EventCard({
  t,
  onRegister,
  detail = false,
}: {
  t: Tournament;
  onRegister: () => void;
  detail?: boolean;
}) {
  return (
    <article className="event-card">
      <Poster
        images={t.posters?.length ? t.posters : [t.image]}
        title={t.title}
        href={detail ? undefined : "/giai-dau/" + t.id}
      />
      <div className="event-info">
        <Badge status={eventStatus(t)} />
        {detail ? (
          <h1>{t.title}</h1>
        ) : (
          <h2>
            <a href={"/giai-dau/" + t.id}>{t.title}</a>
          </h2>
        )}
        <EventSummary t={t} />
        <p className="event-location">
          <MapPin size={21} />
          {t.location}
        </p>
        <div className="category-tags">
          {t.categories.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="event-actions">
          <button
            className="btn"
            onClick={onRegister}
            disabled={eventStatus(t) !== "open"}
          >
            {eventStatus(t) === "open"
              ? "Đăng ký giải"
              : eventStatus(t) === "soon"
                ? "Sẽ mở đăng ký"
                : "Đã đóng đăng ký"}
            <ArrowRight size={20} />
          </button>
          <a
            className="btn outline"
            href={"/giai-dau/" + t.id + "?tab=participants"}
          >
            Danh sách VĐV <Users size={20} />
          </a>
        </div>
      </div>
    </article>
  );
}
function NewsCard({ a }: { a: Article }) {
  return (
    <a className="news-card" href={"/tin-tuc/" + a.id}>
      <div className="news-image">
        <img
          loading="lazy"
          src={a.image || "/pickleball-court.jpg"}
          alt={a.title}
        />
      </div>
      <div className="news-meta">
        {a.category} · {dateLabel(a.date)}
      </div>
      <h3>{a.title}</h3>
      <p>{a.excerpt}</p>
      <span className="text-link">
        Đọc bài viết <ArrowUpRight size={20} />
      </span>
    </a>
  );
}
function NotFound() {
  return (
    <section className="section">
      <Empty text="Nội dung này không còn tồn tại hoặc chưa được công bố." />
      <a href="/" className="btn">
        Về trang chủ
      </a>
    </section>
  );
}
function Participants({
  t,
  settings,
  viewerId,
}: {
  t: Tournament;
  settings: SiteData["settings"];
  viewerId: string;
}) {
  const entryCount = Object.values(t.counts).reduce(
    (n, c) => n + c.approved + c.provisional + c.pending + c.rejected,
    0,
  );
  const [rows, setRows] = useState<PublicEntry[] | null>(null),
    [category, setCategory] = useState(t.categories[0]),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/participants/" + t.id)
      .then((d) => setRows(d.participants))
      .catch((e) => setError(e.message));
  }, [t.id, t.publicationVersion, entryCount, viewerId]);
  const groups = [
    {
      title: t.officialAt
        ? "Danh sách chính thức"
        : "Danh sách đã được duyệt · Duyệt tạm",
      statuses: ["approved"],
    },
    { title: "Đang chờ xét duyệt", statuses: ["pending"] },
    ...(t.rejectionsPublished
      ? [{ title: "Không được duyệt", statuses: ["rejected"] }]
      : []),
  ];
  return (
    <div className="participants">
      <div className="section-head">
        <div>
          <h2>Danh sách vận động viên</h2>
          <p className="muted">
            {t.publishedAt
              ? `BTC đã công bố ${t.publicationVersion} đợt. Cập nhật gần nhất: ${new Date(t.publishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
              : "BTC đang tiếp nhận và xét duyệt hồ sơ. Danh sách chính thức được cập nhật theo từng đợt công bố."}
          </p>
          <div className="participant-capacity">
            <strong>
              {t.approved}/{t.capacity}
            </strong>
            <span>Suất tham gia</span>
          </div>
          <p>
            Hạn đăng ký: <strong>{deadlineLabel(t.deadline)}</strong>
          </p>
        </div>
        <ZaloButton settings={settings} />
      </div>
      <div className="tabs category-tabs">
        {t.categories.map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}{" "}
            <span>
              {t.counts[c]?.approved || 0}/{t.categorySlots[c]}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      {rows ? (
        groups.map((g) => {
          const list = rows.filter(
            (r) => r.category === category && g.statuses.includes(r.status),
          );
          return (
            <section className="participant-group" key={g.title}>
              <h3>
                {g.title} <span>({list.length})</span>
              </h3>
              {list.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Vận động viên</th>
                        <th>Đồng đội</th>
                        <th>Điểm trình</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r, i) => (
                        <tr key={r.id}>
                          <td>{i + 1}</td>
                          <td>
                            <strong
                              className={
                                r.isMe ? "my-entry-name " + r.status : ""
                              }
                            >
                              {r.name}
                              {r.isMe ? " · Bạn" : ""}
                            </strong>
                          </td>
                          <td>{r.partner || "—"}</td>
                          <td>{r.rating || "Chưa cập nhật"}</td>
                          <td>
                            <Badge
                              status={r.status}
                              label={
                                r.status === "rejected"
                                  ? "Không được duyệt"
                                  : r.status === "approved"
                                    ? t.officialAt
                                      ? "Chính thức"
                                      : "Đã được duyệt"
                                    : undefined
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text="Chưa có vận động viên trong nhóm này." />
              )}
              {t.rejectionsPublished &&
                g.title === "Không được duyệt" &&
                list.length > 0 && (
                  <p className="notice">BTC hẹn gặp bạn ở giải đấu sau.</p>
                )}
            </section>
          );
        })
      ) : (
        <p>Đang tải danh sách…</p>
      )}
    </div>
  );
}

function ContentTabs({ active }: { active: string }) {
  return (
    <nav className="content-tabs tabs" aria-label="Tin tức & Thư viện">
      <a className={active === "news" ? "active" : ""} href="/tin-tuc">
        Tin tức
      </a>
      <a className={active === "library" ? "active" : ""} href="/thu-vien">
        Thư viện
      </a>
    </nav>
  );
}
function EventSummary({ t, hero = false }: { t: Tournament; hero?: boolean }) {
  return (
    <div className={hero ? "hero-summary" : "important-facts"}>
      <div>
        <CalendarDays size={22} />
        <span>
          Ngày mở đơn<strong>{dateLabel(t.opensAt)}</strong>
        </span>
      </div>
      <div>
        <Clock3 size={22} />
        <span>
          Hạn đăng ký<strong>{deadlineLabel(t.deadline)}</strong>
        </span>
      </div>
      <div>
        <CalendarDays size={22} />
        <span>
          Ngày diễn ra<strong>{dateLabel(t.date)}</strong>
        </span>
      </div>
      <div className="fee-fact">
        <span>
          Lệ phí<strong>{t.fee || "Sẽ cập nhật"}</strong>
        </span>
      </div>
      <div className="capacity-fact">
        <Users size={22} />
        <span>
          Suất tham gia
          <strong>
            {t.approved}/{t.capacity} suất
          </strong>
        </span>
      </div>
      {t.pairingMode !== "singles" && (
        <div className="pairing-fact">
          <span>
            Hình thức ghép cặp<strong>{pairingLabel(t.pairingMode)}</strong>
          </span>
        </div>
      )}
      {hero && (
        <div className="hero-categories">
          <span>
            Nội dung<strong>{t.categories.join(" · ")}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
function AlbumCard({ album }: { album: Album }) {
  return (
    <a className="album-card" href={"/thu-vien/" + album.id}>
      <div>
        <img src={album.cover} alt={album.title} loading="lazy" />
      </div>
      <p className="eyebrow">
        {album.publishedAt
          ? new Date(album.publishedAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })
          : dateLabel(album.date)}{" "}
        · {album.photos.length} ảnh
      </p>
      <h3>{album.title}</h3>
      <span className="text-link">
        Xem album
        <ArrowUpRight size={20} />
      </span>
    </a>
  );
}
function AlbumPage({ album }: { album: Album }) {
  return (
    <article className="album-page section">
      <a className="text-link" href="/thu-vien">
        <ChevronLeft size={20} />
        Thư viện
      </a>
      <p className="eyebrow">
        {album.publishedAt
          ? new Date(album.publishedAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })
          : dateLabel(album.date)}
      </p>
      <h1>{album.title}</h1>
      <p className="article-lead preserve-text">{album.description}</p>
      <div className="album-link-blocks">
        {[
          ["Tổng hợp ảnh", album.photoLinks],
          ["Video", album.videoLinks],
        ].map(([title, links]) => (
          <section key={title as string}>
            <h2>{title as string}</h2>
            {(links as string[]).length ? (
              (links as string[]).map((url, i) => (
                <a href={url} key={url} target="_blank" rel="noreferrer">
                  <span>
                    {i + 1}. {url}
                  </span>
                  <ArrowUpRight size={20} />
                </a>
              ))
            ) : (
              <p className="muted">Link sẽ được CLB cập nhật.</p>
            )}
          </section>
        ))}
      </div>
      <img className="album-cover" src={album.cover} alt={album.title} />
      <div className="album-photos">
        {album.photos.map((photo, i) => (
          <figure key={i}>
            <a href={photo.url} target="_blank" rel="noreferrer">
              <img
                src={photo.url}
                alt={photo.description || "Ảnh " + (i + 1)}
                loading="lazy"
              />
            </a>
            {photo.description && <figcaption>{photo.description}</figcaption>}
          </figure>
        ))}
      </div>
    </article>
  );
}
