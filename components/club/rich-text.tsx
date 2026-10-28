"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { articleSections, type ArticleSection } from "@/lib/articles";
export function RichText({
  body,
  sections,
}: {
  body: string;
  sections?: ArticleSection[];
}) {
  return (
    <div className="rich-text">
      {articleSections(body, sections).map((section, i) => (
        <section className="article-section" key={i}>
          {section.heading && <h2 className="text-large">{section.heading}</h2>}
          {section.body && <p>{section.body}</p>}
        </section>
      ))}
    </div>
  );
}
export function RichTextEditor({
  value,
  onChange,
}: {
  value: ArticleSection[];
  onChange: (sections: ArticleSection[]) => void;
}) {
  const [preview, setPreview] = useState(false);
  const update = (index: number, key: keyof ArticleSection, text: string) =>
    onChange(value.map((s, i) => (i === index ? { ...s, [key]: text } : s)));
  return (
    <fieldset className="rich-editor section-editor">
      <legend>Nội dung bài viết *</legend>
      <div className="editor-toolbar">
        <button
          type="button"
          className={!preview ? "active" : ""}
          onClick={() => setPreview(false)}
        >
          Soạn nội dung
        </button>
        <button
          type="button"
          className={preview ? "active" : ""}
          onClick={() => setPreview(true)}
        >
          Xem trước
        </button>
      </div>
      {preview ? (
        <div className="article-preview">
          <RichText body="" sections={value} />
        </div>
      ) : (
        value.map((section, i) => (
          <section className="section-editor-block" key={i}>
            <div className="section-editor-heading">
              <h3>Đoạn {i + 1}</h3>
              {value.length > 1 && (
                <button
                  type="button"
                  className="text-link danger"
                  aria-label={"Bỏ đoạn " + (i + 1)}
                  onClick={() => onChange(value.filter((_, n) => n !== i))}
                >
                  <X size={18} />
                  Bỏ đoạn
                </button>
              )}
            </div>
            <label>
              Tiêu đề đoạn {i + 1}
              <input
                aria-label={"Tiêu đề đoạn " + (i + 1)}
                value={section.heading}
                maxLength={300}
                placeholder="Tiêu đề ngắn · hiển thị lớn và in đậm"
                onChange={(e) => update(i, "heading", e.target.value)}
              />
            </label>
            <label>
              Nội dung đoạn {i + 1}
              <textarea
                aria-label={"Nội dung đoạn " + (i + 1)}
                value={section.body}
                rows={6}
                maxLength={25000}
                placeholder="Viết nội dung tại đây…"
                onChange={(e) => update(i, "body", e.target.value)}
              />
            </label>
          </section>
        ))
      )}
      {!preview && (
        <button
          className="btn outline"
          type="button"
          onClick={() => onChange([...value, { heading: "", body: "" }])}
        >
          <Plus size={20} />
          Thêm đoạn {value.length + 1}
        </button>
      )}
    </fieldset>
  );
}
