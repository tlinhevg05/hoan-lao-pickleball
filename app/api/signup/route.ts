import {
  db,
  handle,
  assertOrigin,
  sessionResponse,
  phone,
  rateLimit,
} from "@/lib/server";
import { prepareAthlete, duplicateError } from "@/lib/registration";
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const b = (await request.json()) as Record<string, unknown>;
    await rateLimit("signup:" + phone(b.phone), 8);
    const p = await prepareAthlete(b);
    try {
      await db().batch(p.statements);
    } catch (e) {
      await p.cleanup();
      duplicateError(e);
    }
    return sessionResponse(p.id, request, { profileStatus: "pending" });
  });
}
