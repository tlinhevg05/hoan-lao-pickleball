"use client";
import { useState, useId, type FormEvent } from "react";
import { Upload, Plus, X, Check } from "lucide-react";
import type { Submission, Role } from "@/lib/types";
import { feeAmountOf, formatFee, eventStatus } from "@/lib/events";
import { api, Modal } from "./shared";
import { articleSections } from "@/lib/articles";
import { RichTextEditor } from "./rich-text";
export type ContentDraft = {
  kind: string;
  data: Record<string, any>;
  submission?: Submission;
  publish?: boolean;
};
export const localToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
export function blankContent(kind: string): Record<string, any> {
  if (kind === "tournament")
    return {
      title: "",
      subtitle: "",
      date: localToday(),
      opensAt: localToday(),
      deadline: localToday(),
      location: "Xã Hoàn Lão, tỉnh Quảng Trị",
      categories: [""],
      categorySlots: { "": 100 },
      feeAmount: "",
      feeUnit: "athlete",
      status: "soon",
      pairingMode: "self",
      description: "",
      posters: [],
      image: "",
      featured: false,
      demo: false,
    };
  if (kind === "article")
    return {
      title: "",
      category: "Hoạt động CLB",
      date: localToday(),
      excerpt: "",
      body: "",
      sections: [{ heading: "", body: "" }],
      image: "",
      demo: false,
    };
  return {
    title: "",
    date: localToday(),
    description: "",
    cover: "",
    photos: [],
    photoLinks: [],
    videoLinks: [],
    demo: false,
  };
}
export function ContentEditor({
  draft,
  role,
  topics,
  onClose,
  onSaved,
}: {
  draft: ContentDraft;
  role: Role;
  categories: string[];
  topics: string[];
  onClose: () => void;
  onSaved: (pending: boolean) => void;
}) {
  const { kind } = draft;
  const formId = useId();
  const [d, setD] = useState<Record<string, any>>(() => ({
      ...draft.data,
      sponsors: draft.data.sponsors || [],
      facebookName: draft.data.facebookName || "",
      sections:
        kind === "article"
          ? articleSections(draft.data.body, draft.data.sections)
          : undefined,
      contacts: draft.data.contacts || [
        { name: draft.data.contact || "", phone: draft.data.phone || "" },
        { name: "", phone: "" },
      ],
      opensAt:
        draft.data.opensAt ||
        (kind === "tournament"
          ? [localToday(), draft.data.deadline].filter(Boolean).sort()[0]
          : undefined),
      feeAmount: feeAmountOf(draft.data),
      feeUnit:
        draft.data.feeUnit ||
        (String(draft.data.fee).includes("cặp") ? "pair" : "athlete"),
    })),
    [rows, setRows] = useState<{ name: string; slots: number }[]>(() =>
      (
        (draft.data.categories?.length
          ? draft.data.categories
          : [""]) as string[]
      ).map((name) => ({
        name,
        slots: draft.data.categorySlots?.[name] || 100,
      })),
    ),
    [customTopic, setCustomTopic] = useState(
      !topics.includes(draft.data.category || "Hoạt động CLB"),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const set = (key: string, value: any) =>
    setD((old) => ({ ...old, [key]: value }));
  const field = (
    key: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      {required ? " *" : ""}
      {type === "textarea" ? (
        <textarea
          required={required}
          rows={key === "description" ? 6 : 3}
          value={d[key] || ""}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <input
          type={type}
          required={required}
          value={d[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      )}
    </label>
  );
  async function upload(files: FileList | null, target: string) {
    if (!files) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const result = (await response.json()) as {
          error?: string;
          url: string;
          type: string;
        };
        if (!response.ok) throw new Error(result.error);
        if (result.type !== "image")
          throw new Error(
            "Vui lòng chọn tệp ảnh. Video được thêm bằng đường link trong album.",
          );
        if (target === "posters")
          setD((old) => ({
            ...old,
            posters: [...(old.posters || []), result.url],
            image: old.image || result.url,
          }));
        else if (target === "photos")
          setD((old) => ({
            ...old,
            photos: [
              ...(old.photos || []),
              { url: result.url, description: "" },
            ],
          }));
        else set(target, result.url);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const uploader = (target: string, label: string, multiple = false) => (
    <label className="upload-box">
      <Upload size={25} />
      <span>
        {uploading ? "Đang tải ảnh…" : label}
        <small>JPG, PNG, WebP, GIF · tối đa 30 MB/tệp</small>
      </span>
      <input
        type="file"
        aria-label={label}
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={uploading}
        onChange={(e) => upload(e.target.files, target)}
      />
    </label>
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api("/api/auth");
      if (
        !session.account ||
        !["admin", "staff"].includes(session.account.role)
      )
        throw new Error(
          "Phiên hiện tại chưa đăng nhập tài khoản điều hành. Hãy đăng nhập admin hoặc staff rồi mở lại form.",
        );
      let data = { ...d };
      if (kind === "tournament") {
        const names = rows.map((r) => r.name.trim());
        if (names.some((n) => !n) || new Set(names).size !== names.length)
          throw new Error(
            "Mỗi nội dung cần có tên riêng, không được trùng hoặc để trống.",
          );
        data = {
          ...d,
          categories: names,
          categorySlots: Object.fromEntries(
            rows.map((r, i) => [names[i], r.slots]),
          ),
          image: d.posters?.[0] || d.image,
        };
      }
      const result = await api("/api/admin", {
        action: draft.publish ? "publish" : "save",
        kind,
        id: d.id || draft.submission?.targetId,
        data,
        submissionId: draft.submission?.id,
      });
      onSaved(!!result.pending);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const title = (
    {
      tournament: "giải đấu",
      article: "bài viết",
      album: "album",
      settings: "thông tin CLB",
    } as Record<string, string>
  )[kind];
  return (
    <Modal
      wide
      title={"Chỉnh sửa " + title}
      onClose={onClose}
      error={error}
      footer={
        <div className="form-actions">
          <button type="button" className="btn outline" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            form={formId}
            className="btn"
            disabled={busy || uploading}
          >
            {busy
              ? "Đang lưu…"
              : draft.publish
                ? "Duyệt & đăng công khai"
                : role === "staff"
                  ? "Gửi admin phê duyệt"
                  : "Lưu & đăng"}
            <Check size={21} />
          </button>
        </div>
      }
    >
      <h2>
        {draft.publish ? "Xét duyệt" : d.id ? "Cập nhật" : "Thêm"} {title}
      </h2>
      <p className="form-subtitle">
        {role === "staff"
          ? "Nội dung chỉ được công khai sau khi admin duyệt."
          : "Lưu thay đổi để cập nhật website."}
      </p>
      <form id={formId} className="form-stack" onSubmit={submit}>
        {kind === "tournament" && (
          <>
            {field("title", "Tên giải đấu")}
            {field("subtitle", "Mô tả ngắn", "textarea", false)}
            <div className="form-grid">
              {field("opensAt", "Ngày mở đơn", "date")}
              {field("deadline", "Ngày đóng đơn (23:59)", "date")}
              {field("date", "Ngày diễn ra", "date")}
              {field("location", "Địa điểm")}
              <label>
                Lệ phí
                <input
                  aria-label="Số tiền lệ phí"
                  inputMode="numeric"
                  value={d.feeAmount}
                  onChange={(e) => set("feeAmount", e.target.value)}
                  placeholder="Ví dụ: 300000"
                />
              </label>
              <label>
                Đơn vị lệ phí
                <select
                  value={d.feeUnit}
                  onChange={(e) => set("feeUnit", e.target.value)}
                >
                  <option value="athlete">đồng/VĐV</option>
                  <option value="pair">đồng/cặp</option>
                </select>
              </label>
            </div>
            <p className="notice fee-preview" aria-live="polite">
              Số tiền chuẩn hóa:{" "}
              <strong>{formatFee(d.feeAmount, d.feeUnit)}</strong>
            </p>
            <div className="form-grid">
              <label>
                Ghép cặp
                <select
                  value={d.pairingMode || "self"}
                  onChange={(e) => set("pairingMode", e.target.value)}
                >
                  <option value="self">VĐV đăng ký cùng đồng đội</option>
                  <option value="draw">BTC ghép cặp</option>
                  <option value="singles">Không có nội dung đôi</option>
                </select>
              </label>
              <label>
                Trạng thái
                <select
                  value={
                    d.officialAt
                      ? "finalized"
                      : d.status === "closed"
                        ? "closed"
                        : "auto"
                  }
                  disabled={!!d.officialAt}
                  onChange={(e) =>
                    set(
                      "status",
                      e.target.value === "closed" ? "closed" : "open",
                    )
                  }
                >
                  {d.officialAt && (
                    <option value="finalized">Đã chốt danh sách VĐV</option>
                  )}
                  <option value="auto">Tự động theo ngày mở / đóng đơn</option>
                  <option value="closed">Đóng đăng ký</option>
                </select>
              </label>
            </div>
            <p className="notice">
              Trạng thái:{" "}
              {d.officialAt
                ? "Đã chốt danh sách VĐV"
                : eventStatus({
                      ...d,
                      status: d.status,
                      opensAt: d.opensAt,
                      deadline: d.deadline,
                    }) === "open"
                  ? "Đang mở đăng ký"
                  : eventStatus({
                        ...d,
                        status: d.status,
                        opensAt: d.opensAt,
                        deadline: d.deadline,
                      }) === "soon"
                    ? "Sẽ công bố"
                    : "Đóng đăng ký"}
              . Tự mở lúc 00:00 ngày mở đơn, đóng lúc hết 23:59 ngày đóng đơn
              (giờ Việt Nam).
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!d.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              <span>Ưu tiên banner ở trang nhất</span>
            </label>
            <fieldset className="category-picker">
              <legend>Nội dung thi đấu & số suất</legend>
              <p className="muted">
                Mỗi dòng là một nội dung. Một VĐV đăng ký từng nội dung bằng một
                đơn riêng.
              </p>
              {rows.map((r, i) => (
                <div className="manual-category" key={i}>
                  <label>
                    Nội dung {i + 1} *
                    <input
                      aria-label={"Nội dung " + (i + 1)}
                      required
                      value={r.name}
                      placeholder="Ví dụ: Đơn nam 3.0"
                      onChange={(e) =>
                        setRows((old) =>
                          old.map((v, n) =>
                            n === i ? { ...v, name: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Số suất *
                    <input
                      aria-label={"Số suất nội dung " + (i + 1)}
                      type="number"
                      min={1}
                      max={5000}
                      required
                      value={r.slots}
                      onChange={(e) =>
                        setRows((old) =>
                          old.map((v, n) =>
                            n === i
                              ? { ...v, slots: Number(e.target.value) }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={"Bỏ nội dung " + (i + 1)}
                    disabled={rows.length === 1}
                    onClick={() =>
                      setRows((old) => old.filter((_, n) => n !== i))
                    }
                  >
                    <X />
                  </button>
                </div>
              ))}
              <button
                className="btn outline"
                type="button"
                onClick={() => setRows([...rows, { name: "", slots: 100 }])}
              >
                <Plus size={20} />
                Thêm nội dung
              </button>
            </fieldset>
            {field(
              "description",
              "Thể lệ & thông tin chi tiết",
              "textarea",
              false,
            )}
            <fieldset>
              <legend>Poster giải đấu</legend>
              {(d.posters || []).map((url: string, i: number) => (
                <div className="poster-edit" key={i}>
                  <img src={url} alt={"Poster " + (i + 1)} />
                  <button
                    type="button"
                    className="btn outline small"
                    onClick={() =>
                      set(
                        "posters",
                        d.posters.filter((_: string, n: number) => n !== i),
                      )
                    }
                  >
                    Bỏ ảnh này
                    <X size={18} />
                  </button>
                </div>
              ))}
              <label>
                Thêm poster bằng URL
                <input
                  placeholder="https://…"
                  onBlur={(e) => {
                    const url = e.target.value.trim();
                    if (url) {
                      set("posters", [...(d.posters || []), url]);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              {uploader("posters", "Chọn poster từ máy tính", true)}
            </fieldset>
          </>
        )}
        {kind === "article" && (
          <>
            {field("title", "Tiêu đề bài viết")}
            <label>
              Ngày đăng
              <input
                readOnly
                value={
                  d.publishedAt && draft.submission?.operation !== "create"
                    ? new Date(d.publishedAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })
                    : "Tự động ghi nhận khi đăng công khai"
                }
              />
            </label>
            <fieldset className="topic-picker">
              <legend>Chủ đề bài viết · chọn một</legend>
              <div className="topic-options">
                {topics.map((topic) => (
                  <label className="checkbox-label" key={topic}>
                    <input
                      type="checkbox"
                      checked={!customTopic && d.category === topic}
                      onChange={() => {
                        setCustomTopic(false);
                        set("category", topic);
                      }}
                    />
                    <span>{topic}</span>
                  </label>
                ))}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={customTopic}
                    onChange={() => {
                      setCustomTopic(true);
                      set("category", "");
                    }}
                  />
                  <span>Khác</span>
                </label>
              </div>
              {customTopic && field("category", "Chủ đề mới")}
            </fieldset>
            {field("excerpt", "Đoạn giới thiệu", "textarea")}
            <RichTextEditor
              value={d.sections}
              onChange={(value) => set("sections", value)}
            />
            {field("image", "Ảnh bìa (URL)", "text", false)}
            {uploader("image", "Chọn ảnh bìa bài viết")}
            {d.image && (
              <img
                className="upload-preview"
                src={d.image}
                alt="Ảnh bìa bài viết"
              />
            )}
          </>
        )}
        {kind === "album" && (
          <>
            {field("title", "Tiêu đề album")}
            <label>
              Ngày đăng
              <input
                readOnly
                value={
                  d.publishedAt && draft.submission?.operation !== "create"
                    ? new Date(d.publishedAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })
                    : "Tự động ghi nhận khi đăng công khai"
                }
              />
            </label>
            {field("description", "Giới thiệu album", "textarea", false)}
            {field("cover", "Ảnh bìa album (URL)")}
            {uploader("cover", "Chọn ảnh bìa album")}
            {d.cover && (
              <img
                className="upload-preview"
                src={d.cover}
                alt="Ảnh bìa album"
              />
            )}
            <div className="form-grid">
              <label>
                Link tổng hợp ảnh
                <textarea
                  aria-label="Link tổng hợp ảnh"
                  rows={4}
                  placeholder="Mỗi dòng một đường link https://…"
                  value={
                    Array.isArray(d.photoLinks)
                      ? d.photoLinks.join("\n")
                      : d.photoLinks || ""
                  }
                  onChange={(e) => set("photoLinks", e.target.value)}
                />
              </label>
              <label>
                Link video
                <textarea
                  aria-label="Link video"
                  rows={4}
                  placeholder="Mỗi dòng một đường link https://…"
                  value={
                    Array.isArray(d.videoLinks)
                      ? d.videoLinks.join("\n")
                      : d.videoLinks || ""
                  }
                  onChange={(e) => set("videoLinks", e.target.value)}
                />
              </label>
            </div>
            <fieldset>
              <legend>Ảnh trong album & mô tả</legend>
              {(d.photos || []).map((photo: any, i: number) => (
                <div className="album-photo-editor" key={i}>
                  {photo.url && <img src={photo.url} alt={"Ảnh " + (i + 1)} />}
                  <div>
                    <label>
                      Đường dẫn ảnh {i + 1}
                      <input
                        required
                        value={photo.url}
                        onChange={(e) =>
                          set(
                            "photos",
                            d.photos.map((p: any, n: number) =>
                              n === i ? { ...p, url: e.target.value } : p,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Mô tả ảnh {i + 1}
                      <textarea
                        rows={2}
                        value={photo.description || ""}
                        onChange={(e) =>
                          set(
                            "photos",
                            d.photos.map((p: any, n: number) =>
                              n === i
                                ? { ...p, description: e.target.value }
                                : p,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="text-link danger"
                      onClick={() =>
                        set(
                          "photos",
                          d.photos.filter((_: any, n: number) => n !== i),
                        )
                      }
                    >
                      Bỏ ảnh
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {uploader("photos", "Thêm nhiều ảnh vào album", true)}
              <button
                type="button"
                className="btn outline"
                onClick={() =>
                  set("photos", [
                    ...(d.photos || []),
                    { url: "", description: "" },
                  ])
                }
              >
                <Plus size={20} />
                Thêm ảnh bằng URL
              </button>
            </fieldset>
          </>
        )}
        {kind === "settings" && (
          <>
            {field("clubName", "Tên CLB")}
            {d.contacts.map((contact: any, i: number) => (
              <fieldset key={i}>
                <legend>Đầu mối liên hệ {i + 1}</legend>
                <div className="form-grid">
                  <label>
                    Họ và tên {i === 0 ? "*" : ""}
                    <input
                      required={i === 0}
                      value={contact.name}
                      placeholder="Sẽ cập nhật"
                      onChange={(e) =>
                        set(
                          "contacts",
                          d.contacts.map((c: any, n: number) =>
                            n === i ? { ...c, name: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Số điện thoại
                    <input
                      type="tel"
                      value={contact.phone}
                      placeholder="Sẽ cập nhật"
                      onChange={(e) =>
                        set(
                          "contacts",
                          d.contacts.map((c: any, n: number) =>
                            n === i ? { ...c, phone: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </fieldset>
            ))}
            {field("address", "Khu vực sinh hoạt")}
            {field("zaloUrl", "Link nhóm Zalo dùng chung", "url", false)}
            {field("facebookUrl", "Link fanpage Facebook", "url", false)}
            {field("facebookName", "Tên hiển thị fanpage Facebook", "text", false)}
            <fieldset className="sponsors-editor">
              <legend>Nhà tài trợ trên menu trái</legend>
              <p className="form-hint">
                Thêm các đơn vị theo thứ tự muốn hiển thị. Nhiều nhà tài trợ sẽ
                tự cuộn bên dưới “Được tài trợ bởi”. Tên hiển thị có thể bấm
                để mở website hoặc fanpage của đơn vị tài trợ.
              </p>
              {d.sponsors.map((sponsor: { name: string; url: string }, i: number) => (
                <div className="sponsor-editor-row" key={i}>
                  <label>
                    Tên hiển thị nhà tài trợ {i + 1} *
                    <input
                      required
                      maxLength={120}
                      value={sponsor.name}
                      onChange={(e) => set("sponsors", d.sponsors.map(
                        (item: { name: string; url: string }, index: number) =>
                          index === i ? { ...item, name: e.target.value } : item,
                      ))}
                    />
                  </label>
                  <label>
                    Link website / fanpage (không bắt buộc)
                    <input
                      type="url"
                      placeholder="https://…"
                      value={sponsor.url}
                      onChange={(e) => set("sponsors", d.sponsors.map(
                        (item: { name: string; url: string }, index: number) =>
                          index === i ? { ...item, url: e.target.value } : item,
                      ))}
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={"Xóa nhà tài trợ " + (i + 1)}
                    onClick={() => set("sponsors", d.sponsors.filter(
                      (_: unknown, index: number) => index !== i,
                    ))}
                  ><X size={22} /></button>
                </div>
              ))}
              <button
                type="button"
                className="btn outline"
                disabled={d.sponsors.length >= 50}
                onClick={() => set("sponsors", [...d.sponsors, { name: "", url: "" }])}
              ><Plus size={20} />Thêm nhà tài trợ</button>
            </fieldset>
            {field(
              "clubBannerImage",
              "Banner CLB nằm ngang (URL)",
              "text",
              false,
            )}
            {uploader("clubBannerImage", "Chọn banner CLB từ máy tính")}
            {d.clubBannerImage && (
              <img
                className="settings-banner-preview"
                src={d.clubBannerImage}
                alt="Banner CLB"
              />
            )}
            {field("logoImage", "Logo (URL)", "text", false)}
            {uploader("logoImage", "Chọn logo từ máy tính")}
          </>
        )}
      </form>
    </Modal>
  );
}
