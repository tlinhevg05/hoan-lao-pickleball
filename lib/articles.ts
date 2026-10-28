export type ArticleSection = { heading: string; body: string };
/** Keep old posts editable while new posts use explicit, ordered sections. */
export function articleSections(
  body: string,
  sections?: unknown,
): ArticleSection[] {
  if (Array.isArray(sections) && sections.length)
    return sections.map((s) => ({
      heading: typeof s?.heading === "string" ? s.heading : "",
      body: typeof s?.body === "string" ? s.body : "",
    }));
  const result: ArticleSection[] = [];
  for (const text of String(body || "")
    .split(/\n\s*\n/)
    .filter(Boolean)) {
    if (text.startsWith("## "))
      result.push({ heading: text.slice(3), body: "" });
    else if (result.length)
      result[result.length - 1].body +=
        (result[result.length - 1].body ? "\n\n" : "") + text;
    else result.push({ heading: "", body: text });
  }
  return result.length ? result : [{ heading: "", body: "" }];
}
export const articleBody = (sections: ArticleSection[]) =>
  sections
    .map((s) =>
      [s.heading ? "## " + s.heading : "", s.body].filter(Boolean).join("\n\n"),
    )
    .join("\n\n");
