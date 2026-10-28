import { bucket, fail } from "./server";
/** Signup images are kept private: only the athlete and club operators can read them. */
export async function storeProfilePhoto(value: unknown) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > 2_800_000)
    fail("Ảnh cá nhân tối đa 2 MB.");
  const match = (value as string).match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match) fail("Chọn ảnh JPG, PNG hoặc WebP hợp lệ.");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(match![2]), (c) => c.charCodeAt(0));
  } catch {
    fail("Ảnh không hợp lệ.");
  }
  const b = bytes!;
  const type = match![1];
  const signature =
    type === "jpeg"
      ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : type === "png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)
        : new TextDecoder().decode(b.slice(0, 4)) === "RIFF" &&
          new TextDecoder().decode(b.slice(8, 12)) === "WEBP";
  if (!signature || !b.length || b.length > 2 * 1024 * 1024)
    fail("Ảnh phải là JPG, PNG hoặc WebP, tối đa 2 MB.");
  const key = crypto.randomUUID() + (type === "jpeg" ? ".jpg" : "." + type);
  await bucket().put(key, b, {
    httpMetadata: { contentType: "image/" + type },
  });
  return "/api/files/" + key;
}
export async function discardProfilePhoto(photo: string) {
  if (photo) await bucket().delete(photo.split("/").pop()!);
}
