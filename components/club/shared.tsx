"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { deadlinePassed } from "@/lib/events";
export { eventStatus, deadlinePassed } from "@/lib/events";
import type { Tournament, Settings } from "@/lib/types";
export const dateLabel = (date: string) =>
  new Date(date + "T12:00:00+07:00").toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
export const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  provisional: "Đã duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  open: "Đang mở đăng ký",
  soon: "Sẽ công bố",
  closed: "Đóng đăng ký",
  finalized: "Đã chốt danh sách VĐV",
};
export async function api<T = any>(
  url: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const r = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(d.error || "Có lỗi xảy ra. Vui lòng thử lại.");
  return d as T;
}
export function Logo({
  light = false,
  name = "Hoàn Lão Pickleball",
  image = "/favicon.svg",
}: {
  light?: boolean;
  name?: string;
  image?: string;
}) {
  return (
    <a
      className={`logo ${light ? "light" : ""}`}
      href="/"
      aria-label={name + " — Trang chủ"}
    >
      <img src={image} alt="" />
      <span>
        {name.replace(/\s*pickleball$/i, "").toLocaleUpperCase("vi")}
        <small>PICKLEBALL CLUB</small>
      </span>
    </a>
  );
}
export function Modal({
  children,
  onClose,
  title,
  wide = false,
  footer,
  error,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
  footer?: ReactNode;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropStart = useRef(false);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-label={title}
      onCancel={onClose}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        backdropStart.current =
          e.target === e.currentTarget &&
          (e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom);
      }}
      onPointerCancel={() => {
        backdropStart.current = false;
      }}
      onClick={(e) => {
        const dismiss = backdropStart.current && e.target === e.currentTarget;
        backdropStart.current = false;
        if (dismiss) onClose();
      }}
    >
      <div className="modal-head">
        <span>HOÀN LÃO PICKLEBALL</span>
        <button className="icon-btn" onClick={onClose} aria-label="Đóng">
          <X size={25} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && (
        <div className="modal-footer">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {footer}
        </div>
      )}
    </dialog>
  );
}
export function SectionHead({
  label,
  title,
  href,
  link = "Xem tất cả",
}: {
  label?: string;
  title: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-head">
      <div>
        {label && <p className="eyebrow">{label}</p>}
        <h2>{title}</h2>
      </div>
      {href && (
        <a className="text-link" href={href}>
          {link}
          <ArrowUpRight size={20} />
        </a>
      )}
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
    </div>
  );
}
export function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={"badge " + status}>
      <i />
      {label || statusLabel[status] || status}
    </span>
  );
}
export function ZaloButton({ settings }: { settings: Settings }) {
  return settings.zaloUrl ? (
    <a
      className="btn zalo"
      href={settings.zaloUrl}
      target="_blank"
      rel="noreferrer"
    >
      Tham gia nhóm Zalo <ArrowUpRight size={21} />
    </a>
  ) : (
    <span className="btn outline disabled" aria-disabled="true">
      Nhóm Zalo · Sẽ cập nhật
    </span>
  );
}

export function FacebookButton({ settings }: { settings: Settings }) {
  return settings.facebookUrl ? (
    <a
      className="btn facebook"
      href={settings.facebookUrl}
      target="_blank"
      rel="noreferrer"
    >
      Fanpage Facebook <ArrowUpRight size={21} />
    </a>
  ) : (
    <span className="btn outline disabled" aria-disabled="true">
      Fanpage · Sẽ cập nhật
    </span>
  );
}

export const deadlineLabel = (date: string) => "23:59 · " + dateLabel(date);
export function DeadlineBadge({ t }: { t: Tournament }) {
  return (
    <Badge
      status={deadlinePassed(t) ? "closed" : "soon"}
      label={deadlinePassed(t) ? "Đã đến hạn" : "Chưa đến hạn"}
    />
  );
}
