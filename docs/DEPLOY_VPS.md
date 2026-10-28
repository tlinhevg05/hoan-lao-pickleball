# Tự triển khai bản chính thức trên VPS

Repo này chạy **Next.js + Node.js 24**, database **SQLite thật** và ảnh/file trong thư mục riêng trên VPS. Không cần tài khoản Cloudflare, D1 hoặc R2. Database được tạo từ các migration trong repo khi khởi động; không phải database giả hay bộ nhớ trình duyệt.

## 1. Cài lần đầu bằng Docker Compose

Chuẩn bị VPS Linux có Docker Engine, Docker Compose plugin và **Traefik** đang chạy trên cổng 80/443 với entrypoint `websecure` và certresolver `letsencrypt` (mẫu Docker của Hostinger có sẵn). Trỏ bản ghi DNS của tên miền về IP VPS. Chưa có Docker: dùng hướng dẫn chính thức tại https://docs.docker.com/engine/install/ và https://docs.docker.com/compose/install/.

```sh
git clone https://github.com/tlinhevg05/hoan-lao-pickleball.git
cd hoan-lao-pickleball
cp .env.example .env
chmod 600 .env
```

Repo private nên cần đăng nhập GitHub hoặc SSH key có quyền đọc repo. Mở `.env` và sửa:

```dotenv
DOMAIN=pickleball.tenmiencuaban.vn
APP_ORIGIN=https://pickleball.tenmiencuaban.vn
ADMIN_USERNAME=admin
ADMIN_PASSWORD=DIEN_MAT_KHAU_RIENG_CUA_BAN
```

`DOMAIN` không có `https://` hoặc dấu `/`. Dùng mật khẩu admin riêng từ 12–128 ký tự; có thể tạo bằng `openssl rand -hex 24`. Không dùng mật khẩu mẫu từ các bản local cũ. `.env` không được commit vào Git. Compose lấy `APP_ORIGIN` từ `DOMAIN`; khi chạy Node trực tiếp thì biến `APP_ORIGIN` trong `.env` được dùng.

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Traefik đọc label của container, tự xin/gia hạn HTTPS cho tên miền có DNS đúng và chuyển request vào cổng 3000 của app. App không publish cổng nào ra máy chủ. Mở `https://DOMAIN` và đăng nhập bằng tài khoản vừa đặt. Đây là website dùng chính thức với dữ liệu thật, ban đầu không có VĐV, giải, tin hay album mẫu. Admin nhập thông tin liên hệ, link/tên fanpage, nhóm Zalo, nhà tài trợ và tạo staff qua giao diện.

Lần đầu khởi động sẽ tạo 12 bảng nghiệp vụ, ghi nhận migration, tạo một admin và cấu hình CLB cơ bản. Các lần sau chỉ áp dụng migration mới, **không reset dữ liệu, không ghi đè thông tin đăng nhập hoặc cài đặt đã sửa**. Không có lệnh tự nạp dữ liệu giả khi deploy. Biến `ADMIN_PASSWORD` chỉ có tác dụng tạo admin lần đầu; đổi mật khẩu về sau trong Quản lý tài khoản.

## 2. Database và ảnh nằm ở đâu?

- Volume `club_data`: `/app/data/club.sqlite`, các file WAL/SHM, thư mục `uploads/` và metadata ảnh.
- Volume `club_backups`: bản sao lưu tại `/app/backups`.
- Chứng chỉ HTTPS do Traefik quản lý, không nằm trong dự án này.
- `compose.yaml` cố định tên dự án `hoan-lao-pickleball`, nên tên volume thực tế là `hoan-lao-pickleball_club_data` và `hoan-lao-pickleball_club_backups`, kể cả khi đổi tên thư mục. Xem bằng `docker volume ls` và `docker compose config`.

Ảnh cá nhân không nằm trong `public/`: chỉ chủ hồ sơ hoặc admin/staff được đọc qua API. Tệp nội dung chỉ công khai khi nội dung đã đăng; đề xuất chưa duyệt vẫn riêng tư. Giữ nguyên đường dẫn volume khi chuyển server hoặc cập nhật code.

Database, file upload và mật khẩu runtime không nằm trong repo. **Code + migration tạo cấu trúc; dữ liệu phát sinh được lưu bền trên volume của VPS.** Không thay database bằng cách chép một file SQLite mẫu từ Git.

Chạy **một instance app** với volume này. SQLite dùng WAL, busy timeout và transaction cho các thao tác duyệt/đăng ký; không scale nhiều máy dùng volume riêng vì mỗi máy sẽ có database khác nhau.

## 3. Cập nhật code, giữ nguyên dữ liệu

Sao lưu trước khi cập nhật, sau đó:

```sh
git pull --ff-only
docker compose up -d --build
docker compose ps
```

Không dùng `docker compose down -v`: tùy chọn `-v` xóa volume, gồm database và ảnh. Không xóa thư mục dữ liệu hoặc chạy bộ fixture kiểm thử lên database chính thức. Các migration đã áp dụng có checksum; không sửa migration cũ, chỉ thêm migration mới.

## 4. Sao lưu và khôi phục

Tạo snapshot SQLite nhất quán cùng toàn bộ ảnh/metadata:

```sh
docker compose exec app node scripts/backup.mjs
```

Lệnh in đường dẫn `.tar.gz` trong `/app/backups`. Chép đúng tên được in ra về máy quản trị, ví dụ:

```sh
docker compose cp app:/app/backups/TEN_BAN_SAO_LUU.tar.gz ./
```

Lưu bản sao ở nơi khác VPS. Archive chứa database có hash mật khẩu và thông tin VĐV, cần giữ riêng tư. Sao lưu riêng `.env` ở nơi an toàn. Kiểm tra archive bằng `tar -tzf TEN_BAN_SAO_LUU.tar.gz`.

Khi khôi phục: dừng app, giữ bản sao hiện trạng, giải nén archive vào thư mục/volume **trống**, đặt chủ sở hữu phù hợp user `node` (UID 1000 trong image), rồi gắn volume đó làm `/app/data` và khởi động lại. Khôi phục cả `club.sqlite` lẫn `uploads/`; không chỉ chép file SQLite mới đè lên một database còn đang mở hoặc để lại WAL của bản cũ. Nếu đổi tên miền, sửa `DOMAIN`/`APP_ORIGIN` trước khi mở lại.

## 5. Nếu VPS dùng Nginx thay vì Traefik

Bỏ phần `labels` trong `compose.yaml` và thêm vào service `app`:

```yaml
    ports:
      - "127.0.0.1:3000:3000"
```

Reverse proxy HTTPS hiện tại chuyển vào cổng đó; tham khảo `deploy/nginx.conf.example`. Cần giữ Host/X-Forwarded-Proto và ghi đè X-Real-IP. Tên miền thực phải khớp `DOMAIN` và `APP_ORIGIN`; nếu không, API ghi dữ liệu sẽ từ chối vì khác origin. Không mở trực tiếp cổng 3000 ra Internet khi dùng chế độ tin cậy proxy.

## 6. Chạy Node trực tiếp

Dùng Node.js 24 trở lên, cài dependency và cấu hình `.env` như trên. `DATA_DIR` nên là đường dẫn tuyệt đối ngoài thư mục code, ví dụ `/var/lib/hoan-lao-pickleball` và user chạy app phải có quyền ghi.

```sh
npm ci
npm run build
npm start
```

`npm start` áp dụng migration rồi chạy bản standalone production, không chạy dev server. Mặc định lắng nghe `127.0.0.1:3000`; có thể đặt `PORT`, `SERVER_HOST` khi cần. Đặt process dưới systemd/process manager và dùng reverse proxy HTTPS. Không dùng `npm run dev` để phục vụ chính thức.

## 7. Kiểm tra trước và sau khi đưa vào sử dụng

```sh
npm run typecheck
npm run test:storage
npm run build
HL_SKIP_BUILD=1 npm run test:integration
```

Bộ kiểm thử dùng server production, database và ảnh trong `work/integration-state-vps`; không chạm vào dữ liệu chính thức. Kiểm tra `/api/health` trả `{"ok":true}`; thử đăng nhập admin, thêm ảnh, tạo giải và kiểm tra link Zalo/fanpage trên điện thoại trước khi mời VĐV dùng. Kiểm tra quyền đọc ảnh riêng tư và xuất Excel được bao phủ bởi bộ test.

Bản VPS đã kiểm tra build/TypeScript, storage và 162 luồng API trên bản standalone tại máy phát triển. Image Docker đã được build và chạy thử: health check, đăng nhập admin, chặn sai origin, upload/đọc ảnh, khởi động lại không ghi đè mật khẩu admin và từ chối `APP_ORIGIN` không hợp lệ. Repo không tự tạo hosting, không tự kết nối Cloudflare và không tự deploy khi push Git.
