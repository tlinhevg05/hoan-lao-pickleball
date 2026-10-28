export async function POST() {
  return Response.json(
    { error: "Vui lòng đăng nhập hồ sơ VĐV để xem đăng ký của bạn." },
    { status: 410 },
  );
}
