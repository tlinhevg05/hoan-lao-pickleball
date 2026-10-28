# Hoàn Lão Pickleball

Website CLB với backend, hồ sơ VĐV, đăng ký từng nội dung thi đấu, duyệt tạm/chốt chính thức, tin tức và album. Bản tự hosting trên VPS: Next.js + Node.js 24, database SQLite thật và thư mục upload riêng. Không phụ thuộc Cloudflare. Hướng dẫn triển khai chính thức: [docs/DEPLOY_VPS.md](docs/DEPLOY_VPS.md).

## Triển khai chính thức

```sh
git clone https://github.com/tlinhevg05/hoan-lao-pickleball.git
cd hoan-lao-pickleball
cp .env.example .env
# Sửa DOMAIN và ADMIN_PASSWORD riêng trước khi chạy.
docker compose up -d --build
```

Traefik có sẵn trên VPS cấp HTTPS qua label của container; volume giữ database/ảnh qua các lần cập nhật. Startup tạo database bằng migration, một admin và cấu hình CLB cơ bản; không nạp dữ liệu mẫu và không reset dữ liệu cũ. Chỉ chạy một instance app với volume này. Không cần đẩy file database lên Git. **Không dùng `docker compose down -v` nếu cần giữ dữ liệu.**

Chi tiết DNS, biến môi trường, VPS đã có Nginx, chạy Node trực tiếp, cập nhật và sao lưu: [DEPLOY_VPS.md](docs/DEPLOY_VPS.md).

## Phát triển local

Dùng Node.js 24 trở lên. Copy `.env.example` thành `.env`, đặt mật khẩu admin riêng từ 12 ký tự và `APP_ORIGIN=http://localhost:5173`:

```sh
npm ci
npm run setup:local
npm run dev
```

Mở http://localhost:5173. Chỉ lần cài đầu tạo admin theo `.env`; khởi động lại không ghi đè tài khoản/cài đặt đã sửa. Production không có mật khẩu mặc định. Không commit `.env`, thư mục `data`, upload hoặc backup. Không có lệnh reset dữ liệu production tự động.

## Quyền

- Admin có toàn quyền điều hành của staff, đăng/sửa/xóa nội dung, duyệt đề xuất, quản lý tài khoản và cài đặt CLB. Chỉ admin sửa thông tin đăng nhập của admin; không có chức năng xóa hoặc khóa tài khoản admin. Thay thông tin đăng nhập thu hồi phiên cũ và cấp lại phiên cho admin đang tự chỉnh sửa.
- Staff sửa/duyệt hồ sơ VĐV, xét đăng ký, công bố danh sách. Tin, giải và album staff gửi phải được admin phê duyệt.
- Khách xem nội dung công khai; user dùng SĐT + mật khẩu để đăng ký giải. Mỗi VĐV đăng ký từng nội dung bằng một đơn riêng; không thể tạo trùng SĐT hoặc đăng trùng nội dung trong cùng giải.

## Duyệt danh sách

1. Duyệt hồ sơ VĐV, sau đó xét đơn thành Chờ duyệt / Duyệt tạm / Từ chối. Các thay đổi nội bộ chưa tự xuất hiện công khai.
2. **Công bố danh sách duyệt tạm** được dùng nhiều lần; người được chọn hiển thị đã được duyệt, người bị từ chối vẫn hiện chờ duyệt. Giải vẫn nhận đơn nếu còn hạn.
3. **Chốt danh sách VĐV** chuyển giải sang **Đã chốt danh sách VĐV**, dừng nhận đơn và mở xuất Excel. Kết quả từ chối công khai sau hạn đăng ký; người chưa được xét vẫn chờ duyệt.
4. Sau lần chốt đầu, nút đổi thành **Thay đổi danh sách chính thức**. Xét lại nội bộ rồi bấm nút để cập nhật công khai. BTC cần liên hệ trực tiếp với các VĐV bị thay đổi.

Không cần đủ tất cả suất mới công bố, nhưng không được vượt quota hay chọn hồ sơ VĐV chưa hợp lệ. Công bố dùng phiên bản và transaction SQLite để tránh hai phiên ghi đè cùng một danh sách. Excel `.xlsx` chỉ chứa các hồ sơ chính thức trong lần công bố gần nhất, kể cả khi đang có chỉnh sửa nội bộ chưa công bố.

Mặc định mỗi nội dung mới có 100 suất; số đã cấu hình trong giải cũ được giữ khi chỉnh sửa. Thể lệ/thông tin chi tiết không bắt buộc. Giải tự mở lúc 00:00 ngày mở đơn theo giờ Việt Nam, kể cả các bản ghi cũ lưu trạng thái Sẽ công bố. Trạng thái được tính ở mỗi request; trang đang mở tự làm mới tại mốc chuyển tiếp. Có thể chủ động đóng sớm. Hạn là 23:59 ngày đóng đơn theo giờ Việt Nam. Thứ tự giải: Đang mở đăng ký → Sẽ công bố → Đóng đăng ký → Đã chốt danh sách VĐV. Danh sách công khai không trả SĐT/email/ảnh cá nhân; tên của VĐV đang đăng nhập có màu xanh/vàng/đỏ theo trạng thái công khai.

## Hồ sơ và giải đấu

Điểm trình là chuỗi thập phân bắt buộc: 1–2 chữ số trước và sau dấu chấm, ví dụ `3.5`, `3.45`, `12.15`. Không nhận dấu phẩy, chữ, số nguyên hoặc giá trị trống. Vẫn giữ kiểu text trong JSON để không làm mất cách nhập. Bảng xếp hạng Nam/Nữ xếp giảm dần theo số.

Ảnh cá nhân tùy chọn: JPG/PNG/WebP tối đa 2 MB, chỉ chủ hồ sơ và admin/staff được xem. Tạo hồ sơ kèm đăng ký giải ghi tài khoản/hồ sơ/đơn trong cùng transaction; ảnh đã upload được dọn nếu transaction thất bại.

Giải có ba hình thức: VĐV đăng ký đồng đội (bắt buộc tên đồng đội cho hạng mục Đôi), BTC ghép cặp (không có ô đồng đội, lời nhắn có gợi ý), Không có nội dung đôi (ẩn thông tin ghép cặp công khai). Banner ảnh khung 4:3, lấp đầy bằng cover; ảnh khác tỷ lệ có thể bị cắt mép. Trang nhất có thông tin trên gradient đậm.

## Tin tức, thư viện và cài đặt

Trình soạn mặc định một Đoạn 1, gồm ô tiêu đề ngắn (lớn, đậm) và ô nội dung dài (chữ thường). Thêm/Bỏ đoạn để tổ chức nội dung; Xem trước dùng cùng bố cục với trang bài chi tiết. Các đoạn lưu thành mảng `sections`; bài cũ vẫn được chuyển sang dạng đoạn để chỉnh sửa. React render văn bản, không thực thi HTML nhập vào. Nút lưu/gửi duyệt nằm cố định ngoài vùng cuộn của form.

Chọn một chủ đề, hoặc Khác để lưu chủ đề mới. Album có bìa, nhiều ảnh/mô tả và hai nhóm link ảnh/video (mỗi dòng một link). Thời gian đăng bài và album do server ghi khi xuất bản lần đầu, cả khi staff gửi chờ admin duyệt; sửa lại giữ nguyên thời gian đăng đầu tiên.

Giữ tối đa 20 tin và 20 album đã đăng. Khi đăng thêm, bản ghi cũ hơn bị loại khỏi SQLite. Tin và album ưu tiên thời gian xuất bản thực tế. File R2 không tự xóa theo giới hạn bản ghi. Đề xuất staff có nhãn Tạo mới/Chỉnh sửa lưu riêng trong database. Mục Đã đăng giữ 30 log phê duyệt mới nhất trên toàn hệ thống; bản chờ duyệt và trả về không bị xóa theo giới hạn này. Chỉ admin sửa hai đầu mối liên hệ, Zalo/Facebook dùng chung, tên hiển thị fanpage, nhà tài trợ, logo và banner CLB. Logo CLB có ở đầu trang và footer; footer xếp logo, fanpage và cụm hai dòng SĐT. Nút nhóm Zalo nổi ở góc phải; nhà tài trợ hiển thị dưới menu trái.

## Kiểm tra

```sh
npm run typecheck
npm run test:storage
npm run build
HL_SKIP_BUILD=1 npm run test:integration
```

162 kiểm tra tích hợp chạy trên server standalone production, SQLite/ảnh và cổng server tạm riêng, không thay đổi dữ liệu ở 5173. Bao gồm quyền, ảnh riêng tư, điểm trình, nhiều nội dung, duyệt tạm/chốt/chỉnh danh sách, cạnh tranh phiên bản, XLSX, ghép cặp, album thời gian thực, hai liên hệ và giới hạn 20 bản ghi. Các luồng cũ đã kiểm tra trình duyệt desktop/mobile và kéo từ ô nhập ra backdrop không đóng modal; click backdrop riêng vẫn đóng. Thay đổi header/footer và nút Zalo mới chưa kiểm tra trực quan lại do công cụ trình duyệt hiện không khả dụng.

`npm run lint` hiện còn các lỗi quy tắc từ cấu trúc mã cũ (chủ yếu explicit any và điều hướng Next), không phải kiểm tra đã đạt. Build và TypeScript đã đạt.

## Dữ liệu và triển khai

- `db/schema.ts`, `drizzle/`: đầy đủ schema và migration để tự tạo database thật.
- `DATA_DIR/club.sqlite`, `DATA_DIR/uploads/`: dữ liệu runtime; Docker dùng volume `club_data` tại `/app/data`.
- `Dockerfile`, `compose.yaml`: app production, volume bền và label Traefik cho HTTPS.
- `.env.example`: tên miền, origin và tài khoản khởi tạo; file `.env` thật được Git/Docker bỏ qua.
- `scripts/backup.mjs`: snapshot database và toàn bộ upload. Giữ bản sao ngoài VPS.
- Docker image đã được build và chạy thử. Không có deploy/hosting tự động.

Chi tiết: [DEPLOY_VPS.md](docs/DEPLOY_VPS.md), [hướng dẫn quản trị](docs/HUONG_DAN_THUC_HANH.md), [database](docs/HUONG_DAN_DATABASE.md).
