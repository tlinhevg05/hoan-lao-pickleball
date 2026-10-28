import { bucket, db, getAccount, handle } from "@/lib/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  return handle(async () => {
    const { key } = await params;
    if (!/^[a-f0-9-]+\.(jpg|png|webp|gif|mp4|webm)$/.test(key))
      return new Response("Not found", { status: 404 });
    const a = await getAccount(request);
    const operator = a && (a.role === "admin" || a.role === "staff");
    const owner =
      a?.role === "user" &&
      (await db()
        .prepare(
          "SELECT id FROM athletes WHERE id=? AND json_extract(data,'$.photo')=?",
        )
        .bind(a.id, "/api/files/" + key)
        .first());
    if (!operator && !owner) {
      const published = await db()
        .prepare(
          "SELECT id FROM content WHERE instr(data,?)>0 AND (kind<>'media' OR json_extract(data,'$.expiresAt')>?) LIMIT 1",
        )
        .bind("/api/files/" + key, new Date().toISOString())
        .first();
      if (!published) return new Response("Not found", { status: 404 });
    }
    const obj = await bucket().get(key, { range: request.headers });
    if (!obj) return new Response("Not found", { status: 404 });
    const headers = new Headers({
      "Cache-Control":
        operator || owner ? "private, no-store" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    });
    obj.writeHttpMetadata(headers);
    headers.set("ETag", obj.httpEtag);
    const range = obj.range;
    if (
      request.headers.has("range") &&
      range &&
      "offset" in range &&
      "length" in range &&
      typeof range.offset === "number" &&
      typeof range.length === "number"
    ) {
      headers.set(
        "Content-Range",
        `bytes ${range.offset}-${range.offset + range.length - 1}/${obj.size}`,
      );
      headers.set("Content-Length", String(range.length));
      return new Response(obj.body, { status: 206, headers });
    }
    headers.set("Content-Length", String(obj.size));
    return new Response(obj.body, { headers });
  });
}
