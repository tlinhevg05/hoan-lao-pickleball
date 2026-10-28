"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { api } from "./shared";
export function ContactForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(
        "/api/messages",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="contact-form-panel">
      <h2>Gửi lời nhắn</h2>
      {sent ? (
        <div className="success-state">
          <Check size={40} />
          <h3>CLB đã nhận lời nhắn.</h3>
          <p>Ban điều hành sẽ liên hệ qua SĐT bạn để lại.</p>
          <button className="btn outline" onClick={() => setSent(false)}>
            Gửi lời nhắn khác
          </button>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <div className="form-grid">
            <label>
              Họ và tên *
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Nguyễn Văn An"
                autoComplete="name"
              />
            </label>
            <label>
              SĐT / Zalo *
              <input
                name="phone"
                required
                type="tel"
                placeholder="09xxxxxxxx"
                autoComplete="tel"
              />
            </label>
          </div>
          <label>
            Nội dung *
            <textarea
              name="body"
              required
              minLength={5}
              maxLength={3000}
              rows={6}
              placeholder="Bạn muốn hỏi điều gì?"
            />
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn lime full" disabled={busy}>
            {busy ? "Đang gửi…" : "Gửi lời nhắn"}
            <ArrowRight />
          </button>
        </form>
      )}
    </div>
  );
}
