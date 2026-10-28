import { storeProfilePhoto, discardProfilePhoto } from "./profile-photo";
import {
  db,
  fail,
  phone,
  validPhone,
  profileData,
  validatePassword,
  passwordHash,
} from "./server";
export async function prepareAthlete(d: Record<string, unknown>) {
  const mobile = phone(d.phone);
  if (!validPhone(mobile)) fail("Vui lòng nhập SĐT Việt Nam hợp lệ.");
  if (d.consent !== true)
    fail("Bạn cần đồng ý sử dụng thông tin hồ sơ để CLB xét duyệt.");
  const exists = await db()
    .prepare("SELECT id FROM accounts WHERE phone=?")
    .bind(mobile)
    .first();
  if (exists)
    fail(
      "Số điện thoại đã được đăng ký. Vui lòng đăng nhập hồ sơ có sẵn.",
      409,
    );
  const p = profileData(d);
  const password = validatePassword(d.password);
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  const hash = await passwordHash(password);
  p.photo = await storeProfilePhoto(d.photoData);
  const statements = [
    db()
      .prepare(
        "INSERT INTO accounts (id,phone,username,password_hash,role,created_at) VALUES (?,?,NULL,?,'user',?)",
      )
      .bind(id, mobile, hash, now),
    db()
      .prepare(
        "INSERT INTO athletes (id,data,status,note,points,created_at,updated_at) VALUES (?,?,'pending','',0,?,?)",
      )
      .bind(id, JSON.stringify(p), now, now),
  ];
  if (p.photo)
    statements.push(
      db()
        .prepare("INSERT INTO uploads(key,owner_id,created_at) VALUES(?,?,?)")
        .bind(p.photo.split("/").pop()!, id, now),
    );
  return {
    id,
    mobile,
    profile: p,
    statements,
    cleanup: () => discardProfilePhoto(p.photo),
  };
}
export function duplicateError(error: unknown): never {
  if (
    String(error).includes("account_phone") ||
    String(error).includes("accounts.phone")
  )
    fail(
      "Số điện thoại đã được đăng ký. Vui lòng đăng nhập hồ sơ có sẵn.",
      409,
    );
  if (String(error).includes("UNIQUE"))
    fail(
      "Hồ sơ đã đăng ký hạng mục này. Vui lòng xem trong Hồ sơ của tôi.",
      409,
    );
  throw error;
}
