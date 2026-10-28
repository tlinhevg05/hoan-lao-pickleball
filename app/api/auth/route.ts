import {
  db,
  json,
  digest,
  handle,
  clean,
  phone,
  assertOrigin,
  getAccount,
  getAthlete,
  registrationRows,
  verifyPassword,
  rateLimit,
  mapAccount,
  sessionResponse,
  siteData,
  publicRegistration,
  clientAddress,
} from "@/lib/server";
export async function GET(request: Request) {
  return handle(async () => {
    const account = await getAccount(request);
    const entries =
      account?.role === "user" ? await registrationRows(account.id) : [];
    const tournaments = entries.length ? (await siteData()).tournaments : [];
    return json({
      account,
      athlete: account?.role === "user" ? await getAthlete(account.id) : null,
      registrations: entries.map((r) => {
        const t = tournaments.find((t) => t.id === r.tournamentId);
        return t
          ? publicRegistration(r, t)
          : { ...r, status: "pending", adminNote: "" };
      }),
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const b = (await request.json()) as Record<string, unknown>;
    const identifier = clean(b.identifier || b.username, 100);
    const key = /^[+\d]/.test(identifier)
      ? phone(identifier)
      : identifier.toLowerCase();
    await rateLimit("login:" + (await digest(key)), 12);
    await rateLimit(
      "login-total:" +
        clientAddress(request),
      100,
      15,
    );
    const row = await db()
      .prepare("SELECT * FROM accounts WHERE phone=? OR username=?")
      .bind(key, key)
      .first<Record<string, any>>();
    const candidate =
      typeof b.password === "string" ? b.password.slice(0, 128) : "";
    if (
      !row ||
      row.disabled ||
      !(await verifyPassword(candidate, row.password_hash))
    )
      return json(
        { error: "Thông tin đăng nhập hoặc mật khẩu chưa đúng." },
        401,
      );
    return sessionResponse(row.id, request, { account: mapAccount(row) });
  });
}
export async function DELETE(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const token = request.headers
      .get("cookie")
      ?.match(/(?:^|; )hl_session=([^;]+)/)?.[1];
    if (token)
      await db()
        .prepare("DELETE FROM sessions WHERE token=?")
        .bind(await digest(token))
        .run();
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie":
            "hl_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
          "Cache-Control": "no-store",
        },
      },
    );
  });
}
