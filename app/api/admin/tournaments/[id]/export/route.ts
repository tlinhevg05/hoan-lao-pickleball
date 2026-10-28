import {
  handle,
  requireAccount,
  getTournament,
  registrationRows,
  fail,
} from "@/lib/server";
import { workbook } from "@/lib/xlsx";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAccount(request, ["staff"]);
    const { id } = await params,
      t = await getTournament(id);
    if (!t) fail("Không tìm thấy giải đấu.", 404);
    if (!t!.officialAt)
      fail("Chỉ được xuất Excel sau khi chốt danh sách VĐV.", 409);
    const entries = (await registrationRows())
      .filter((r) => r.tournamentId === id && r.publishedStatus === "approved")
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category, "vi") ||
          a.name.localeCompare(b.name, "vi"),
      );
    const bytes = workbook([
      [
        "STT",
        "Họ và tên",
        "Giới tính",
        "Số điện thoại",
        "Điểm trình",
        "Nội dung",
        "Đồng đội",
      ],
      ...entries.map((r, i) => [
        String(i + 1),
        r.name,
        r.gender,
        r.phone,
        r.rating,
        r.category,
        r.partner,
      ]),
    ]);
    return new Response(bytes, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="danh-sach-chinh-thuc.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  });
}
