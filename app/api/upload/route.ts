import {
  bucket,
  db,
  handle,
  json,
  requireAccount,
  assertOrigin,
  fail,
  rateLimit,
} from "@/lib/server";
const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const a = await requireAccount(request, ["admin", "staff"]);
    await rateLimit("upload:" + a.id, 100, 60);
    if (Number(request.headers.get("content-length")) > 32 * 1024 * 1024)
      fail("Tệp tối đa 30 MB.", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !types[file.type] ||
      !file.size ||
      file.size > 30 * 1024 * 1024
    )
      fail("Chọn ảnh JPG/PNG/WebP/GIF hoặc video MP4/WebM tối đa 30 MB.");
    const f = file as File,
      key = crypto.randomUUID() + "." + types[f.type];
    await bucket().put(key, f.stream(), {
      httpMetadata: { contentType: f.type },
    });
    await db()
      .prepare("INSERT INTO uploads (key,owner_id,created_at) VALUES (?,?,?)")
      .bind(key, a.id, new Date().toISOString())
      .run();
    return json({
      url: "/api/files/" + key,
      type: f.type.startsWith("video/") ? "video" : "image",
    });
  });
}
