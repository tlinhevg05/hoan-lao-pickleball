# Database của Hoàn Lão Pickleball — bản VPS

Website dùng SQLite trên ổ đĩa VPS, không dùng database cloud và không lưu hồ sơ vào localStorage. Ảnh nằm trong thư mục upload riêng. Database/file runtime không nằm trong Git; repo có schema và đầy đủ migration để tạo database thật khi khởi động.

## File và cấu trúc

- `db/schema.ts`: mô tả bảng để tạo migration bằng Drizzle.
- `drizzle/*.sql`: năm migration hiện tại, áp dụng lần lượt trong transaction. Bảng `schema_migrations` ghi tên, checksum và thời điểm áp dụng.
- `lib/storage.mjs`: kết nối SQLite, prepared statement, transaction và private file storage.
- `scripts/setup-vps.mjs`: migration và khởi tạo admin/cấu hình một lần.
- `scripts/database.mjs`: áp dụng migration mới; không sửa migration đã áp dụng.
- `scripts/backup.mjs`: snapshot SQLite và ảnh.

12 bảng nghiệp vụ gồm `accounts`, `athletes`, `registrations`, `sessions`, `content`, `event_state`, `submissions`, `categories`, `article_topics`, `messages`, `uploads`, `rate_limits`.

Trong Docker, dữ liệu là `/app/data/club.sqlite` và `/app/data/uploads` trong volume `club_data`. Khi chạy Node trực tiếp, dùng biến `DATA_DIR`; mặc định là thư mục `data` cạnh code, nên đặt đường dẫn tuyệt đối trên VPS. Volume còn nguyên khi rebuild/recreate container. Xóa volume hoặc ổ đĩa chứa nó sẽ mất dữ liệu.

## Dữ liệu ban đầu

Bản chính thức khởi tạo trống: không có VĐV, đăng ký, giải, tin, album hay staff mẫu. Có một admin tạo từ `ADMIN_USERNAME`/`ADMIN_PASSWORD` riêng và cấu hình CLB cơ bản. Chạy lại không thay mật khẩu, không reset nội dung. Thay mật khẩu admin trong Quản lý tài khoản; mật khẩu chỉ lưu dưới dạng PBKDF2 có salt trong database.

Các file fixture chỉ phục vụ bộ kiểm thử ở `work/integration-state-vps`; bị khóa để không chạy ngoài runner kiểm thử. Chúng không được nạp bởi Docker hoặc lệnh start.

## Riêng tư và transaction

Ảnh VĐV chỉ dành cho chính người đó và ban điều hành. Ảnh đính kèm nội dung chưa được admin đăng vẫn riêng tư; API kiểm tra quyền trước khi stream file. Thư mục upload không được expose bằng static web server.

Tạo tài khoản/hồ sơ/đơn đăng ký và các thao tác công bố dùng transaction SQLite. Nếu có lỗi trùng SĐT, trùng hạng mục hoặc vượt quota, transaction rollback toàn bộ. SQLite chạy WAL với busy timeout, phù hợp một instance website trên một VPS. Nếu cần nhiều máy/replica, phải chuyển sang database và storage dùng chung trước.

Giữ tối đa 20 tin và 20 album đã đăng; mục Đã đăng giữ 30 log phê duyệt gần nhất, không xóa đề xuất còn chờ hoặc bị trả về. File ảnh vật lý không tự xóa theo giới hạn bản ghi để tránh làm hỏng nội dung còn tham chiếu.

## Sao lưu

Cần sao lưu cả database và thư mục upload, giữ bản sao ngoài VPS. Dùng `docker compose exec app node scripts/backup.mjs` hoặc `npm run backup` khi chạy Node. Không copy riêng file SQLite đang ghi mà bỏ qua WAL. Khi khôi phục phải dừng app và khôi phục vào thư mục/volume trống.

Hướng dẫn thao tác đầy đủ, HTTPS, cập nhật và khôi phục ở [DEPLOY_VPS.md](DEPLOY_VPS.md).
