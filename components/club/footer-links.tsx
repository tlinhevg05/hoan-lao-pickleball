import type { Settings } from "@/lib/types";
import { Phone } from "lucide-react";
import { Logo } from "./shared";

function FacebookMark() {
  return (
    <svg className="facebook-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M14.2 21v-8.2H17l.4-3.2h-3.2v-2c0-.9.3-1.6 1.6-1.6h1.7V3.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.4v2.2H8v3.2h2.8V21z" />
    </svg>
  );
}

export function ClubFooter({ settings }: { settings: Settings }) {
  const facebookName = settings.facebookName ||
    (settings.facebookUrl ? settings.clubName : "Sẽ cập nhật");
  return (
    <footer className="simple-footer club-footer">
      <Logo name={settings.clubName} image={settings.logoImage} />
      <div className="footer-fanpage">
        <FacebookMark />
        <p>
          Fanpage: {settings.facebookUrl ? (
            <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer">
              {facebookName}
            </a>
          ) : <span>{facebookName}</span>}
        </p>
      </div>
      <div className="footer-contact-lines">
        {settings.contacts.map((contact, i) => (
          <div className="footer-contact-line" key={i}>
            <Phone size={20} aria-hidden="true" />
            <p>
              SĐT: {contact.phone ? (
                <a href={"tel:" + contact.phone}>{contact.phone}</a>
              ) : "Sẽ cập nhật"}{" "}
              <span>({contact.name || "Đầu mối " + (i + 1)})</span>
            </p>
          </div>
        ))}
      </div>
    </footer>
  );
}

export function SidebarSponsors({ settings }: { settings: Settings }) {
  const sponsors = settings.sponsors || [];
  const scrolling = sponsors.length > 1;
  const duration = Math.max(
    18,
    sponsors.reduce((length, sponsor) => length + sponsor.name.length + 12, 0) / 3,
  );
  function sponsorGroup(duplicate = false) {
    return (
      <div className="sponsor-group" aria-hidden={duplicate || undefined}>
        {sponsors.map((sponsor, i) =>
          sponsor.url ? (
            <a
              href={sponsor.url}
              key={i}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={duplicate ? -1 : undefined}
            >
              {sponsor.name}
            </a>
          ) : <span key={i}>{sponsor.name}</span>,
        )}
      </div>
    );
  }
  return (
    <section className="sidebar-sponsors" aria-label="Nhà tài trợ CLB">
      <p className="sponsor-label">Được tài trợ bởi</p>
      <div className={"sponsor-window" + (scrolling ? " is-scrolling" : "")}>
        {sponsors.length ? (
          <div className="sponsor-track" style={{ animationDuration: duration + "s" }}>
            {sponsorGroup()}
            {scrolling && sponsorGroup(true)}
          </div>
        ) : <span className="sponsor-placeholder">Đang cập nhật</span>}
      </div>
    </section>
  );
}

export function FloatingZalo({ settings }: { settings: Settings }) {
  const mark = (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M25.5 24.2A12 12 0 1 0 7 25.3L5.5 29l5-1.9a12 12 0 0 0 15-2.9Z" fill="#fff" />
      <text x="16" y="19" textAnchor="middle" fill="#0068ff" fontSize="10" fontFamily="Arial, sans-serif" fontWeight="700">Zalo</text>
    </svg>
  );
  return settings.zaloUrl ? (
    <a
      className="floating-zalo"
      href={settings.zaloUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Tham gia nhóm Zalo CLB"
      title="Tham gia nhóm Zalo CLB"
    >{mark}</a>
  ) : (
    <button
      type="button"
      className="floating-zalo"
      disabled
      aria-label="Nhóm Zalo CLB — Chưa cập nhật đường dẫn"
      title="Nhóm Zalo CLB — Chưa cập nhật đường dẫn"
    >{mark}</button>
  );
}
