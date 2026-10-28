import {
  handle,
  json,
  db,
  assertOrigin,
  clean,
  phone,
  validPhone,
  fail,
  rateLimit,
} from "@/lib/server";
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const b = (await request.json()) as Record<string, unknown>;
    const name = clean(b.name, 100),
      mobile = phone(b.phone),
      body = clean(b.body, 3000);
    if (name.length < 2 || !validPhone(mobile) || body.length < 5 || b.website)
      fail("Vui lòng điền họ tên, SĐT và lời nhắn ít nhất 5 ký tự.");
    await rateLimit("message:" + mobile, 5, 60);
    await db()
      .prepare(
        "INSERT INTO messages (id,name,phone,body,read,created_at) VALUES (?,?,?,?,0,?)",
      )
      .bind(crypto.randomUUID(), name, mobile, body, new Date().toISOString())
      .run();
    return json({ ok: true }, 201);
  });
}
