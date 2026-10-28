import {
  db,
  handle,
  json,
  requireAccount,
  assertOrigin,
  siteData,
  athleteRows,
  registrationRows,
  submissionRows,
  messageRows,
  mapAccount,
  sessionResponse,
} from "@/lib/server";
import { operate } from "@/lib/operations";
export async function GET(request: Request) {
  return handle(async () => {
    const account = await requireAccount(request, ["admin", "staff"]);
    const [site, athletes, registrations, submissions, messages] =
      await Promise.all([
        siteData(true),
        athleteRows(),
        registrationRows(),
        submissionRows(account),
        messageRows(),
      ]);
    const { results: accounts } =
      account.role === "admin"
        ? await db()
            .prepare(
              "SELECT id,phone,username,role,disabled,created_at FROM accounts WHERE role IN ('admin','staff') ORDER BY created_at",
            )
            .all<Record<string, any>>()
        : { results: [] };
    return json({
      ...site,
      account,
      athletes,
      registrations,
      submissions,
      messages,
      accounts: accounts.map(mapAccount),
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    assertOrigin(request);
    const account = await requireAccount(request, ["admin", "staff"]);
    const result = await operate(
      account,
      (await request.json()) as Record<string, any>,
    );
    return "renewSession" in result && result.renewSession
      ? sessionResponse(account.id, request, result)
      : json(result);
  });
}
