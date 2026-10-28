import {
  getAccount,
  handle,
  json,
  getTournament,
  registrationRows,
  fail,
  publicRegistration,
} from "@/lib/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const t = await getTournament(id);
    if (!t) fail("Không tìm thấy giải đấu.", 404);
    const all = await registrationRows();
    const viewer = await getAccount(request);
    const order = { approved: 0, provisional: 1, pending: 2, rejected: 3 };
    const participants = all
      .filter((r) => r.tournamentId === id)
      .map((r) => publicRegistration(r, t!))
      .map((r) => ({
        id: r.id,
        isMe: viewer?.role === "user" && viewer.id === r.athleteId,
        name: r.name,
        gender: r.gender,
        rating: r.rating,
        category: r.category,
        partner: r.partner,
        status: r.status,
      }))
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] ||
          a.name.localeCompare(b.name, "vi"),
      );
    return json({ participants });
  });
}
