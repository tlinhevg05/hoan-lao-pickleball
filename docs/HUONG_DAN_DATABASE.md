# Database và hosting của Hoàn Lão Pickleball

Cập nhật theo bản local ngày 25/10/2026.

## Khách có quản lý website chỉ bằng frontend không?

Có. Người vận hành đăng nhập website, mở trang quản trị, điền form, upload ảnh, xét duyệt và nhấn Lưu/Đăng. Họ không cần mở code, terminal hoặc chương trình quản lý database.

Backend vẫn cần thiết và đã nằm trong dự án. Khi bấm lưu, trình duyệt gọi API; API kiểm tra phiên đăng nhập, vai trò, điều kiện nghiệp vụ rồi ghi vào database/kho tệp. Khách không thao tác trực tiếp với backend, nhưng backend vẫn chạy để phục vụ thao tác của họ.

Luồng ví dụ:

```text
Staff điền bài viết trên giao diện
       ↓
Backend kiểm tra quyền → lưu đề xuất trong database
       ↓
Admin mở hàng đợi, sửa hoặc duyệt đăng
       ↓
Backend đưa bản được duyệt vào nội dung công khai
       ↓
Người xem thấy bài mới mà không cần deploy code lại
```

Chỉ upload các tệp HTML/CSS/JS lên hosting tĩnh sẽ không đủ cho phần đăng nhập, duyệt hồ sơ và lưu dữ liệu của ứng dụng này. Cần môi trường chạy backend tương thích hoặc tách backend thành dịch vụ riêng.

## Bản hiện tại đang host ở đâu?

**Toàn bộ đang chạy trên máy của bạn. Chưa có dịch vụ cloud được tạo cho dự án.**

| Phần                                                        | Hiện tại                                  | Khi triển khai theo cấu trúc Cloudflare hiện có |
| ----------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Website + API                                               | Dev server ở localhost:5173               | Cloudflare Worker chạy ứng dụng                 |
| Hồ sơ, tài khoản, giải, bài viết, phê duyệt, điểm, lời nhắn | SQLite thật trong `.wrangler/state/v3/d1` | D1 do Cloudflare quản lý                        |
| Ảnh/video upload                                            | Tệp local trong `.wrangler/state/v3/r2`   | R2 object storage                               |
| Font và ảnh mẫu sẵn có                                      | Thư mục `public/`                         | Tệp static đóng gói khi deploy                  |

Tên D1/R2 trong cấu hình hiện chỉ là binding của bộ mô phỏng local. Chúng không có nghĩa là bạn đã có tài khoản Cloudflare, database cloud hoặc gói miễn phí đang được đăng ký.

SQLite này là dữ liệu thật, không phải dữ liệu giả trong RAM hay localStorage. Tắt server rồi mở lại vẫn còn dữ liệu, miễn là thư mục lưu trữ còn nguyên. Xóa `.wrangler/state` hoặc chỉ chuyển source ZIP sang máy khác sẽ không mang theo database và tệp đã upload.

## D1, R2 và “serverless” là gì?

D1 lưu dữ liệu có cấu trúc: SĐT duy nhất, account, quyền, hồ sơ VĐV, đăng ký giải, kết quả duyệt và điểm. Nó dùng giao diện SQL dựa trên SQLite.

R2 là kho tệp, phù hợp với ảnh/video. Database lưu đường dẫn và metadata album (tiêu đề, ngày đăng, bìa, ảnh/mô tả, các link). Video trong album mới được dẫn bằng URL tới nơi lưu video. Cách này giúp database không phình lên do lưu video.

“Serverless” nghĩa là nhà cung cấp quản lý máy chủ để chạy dịch vụ. Vẫn có backend, ổ lưu trữ và database thật; bạn không phải tự cài Linux, SQL server hay giữ một máy cá nhân mở liên tục. Dữ liệu có vòng đời riêng với code ứng dụng.

## Sau khi deploy cần làm gì với database?

Lần triển khai đầu, người phát triển cần:

1. Tạo dịch vụ backend, D1 và R2 trên tài khoản hosting đã chọn; nối đúng các binding.
2. Áp dụng schema/migration lên database cloud.
3. Tạo tài khoản admin/staff thật và cấu hình bí mật cho môi trường triển khai.
4. Chọn dùng dữ liệu mới hay import dữ liệu local cần giữ. Upload tệp local cần giữ lên kho cloud và cập nhật đường dẫn.
5. Trỏ tên miền, kiểm tra quyền, lưu dữ liệu và sao lưu.

Sau đó, **đăng bài, upload ảnh, đăng ký giải, duyệt VĐV và chỉnh điểm đều tự ghi dữ liệu qua website**. Khách không phải mở database hằng ngày.

Deploy lại code thông thường không xóa hồ sơ hoặc ảnh trong D1/R2. Khi thay đổi cấu trúc dữ liệu, người phát triển áp dụng migration mới. Không chạy seed/reset mang tính phá hủy trên dữ liệu đang sử dụng.

Phần vận hành vẫn cần người chịu trách nhiệm kiểm tra dung lượng/chi phí, sao lưu, phục hồi, tài khoản nhân sự và cập nhật kỹ thuật. Với một website bàn giao cho khách, nên thống nhất rõ ai quản lý và sở hữu tài khoản hosting, tên miền, database và bản sao lưu.

## Có miễn phí không?

**Hiện tại không phát sinh phí cloud vì chưa dùng cloud.** Bạn đang dùng máy và kết nối Internet của mình để chạy local.

Nếu triển khai trực tiếp trên tài khoản Cloudflare, có các hạn mức miễn phí sau, theo tài liệu chính thức đã kiểm tra ngày 24/10/2026:

| Dịch vụ      | Hạn mức miễn phí chính                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| D1           | Tổng lưu trữ 5 GB; 5 triệu hàng đọc/ngày; 100.000 hàng ghi/ngày                                                           |
| R2 Standard  | 10 GB-tháng lưu trữ; 1 triệu thao tác nhóm A/tháng; 10 triệu thao tác nhóm B/tháng; không tính phí băng thông ra Internet |
| Workers Free | 100.000 request/ngày, với giới hạn CPU cho mỗi request; không đồng nghĩa với 100.000 người xem/ngày                       |

Nguồn: [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/), [R2 Pricing](https://developers.cloudflare.com/r2/pricing/), [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/).

Hạn mức đọc/ghi D1 tính theo **số hàng được quét/ghi**, không phải số câu lệnh SQL. Một request của người dùng có thể chạy nhiều truy vấn và đọc nhiều hàng. Vì vậy cần đo mức dùng thực tế, không suy ra miễn phí chỉ từ số thành viên CLB.

Gói Workers trả phí có mức cơ bản 5 USD/tháng, cộng phần dùng vượt khoản bao gồm nếu có. R2 Standard ngoài phần miễn phí có giá lưu trữ 0,015 USD/GB-tháng và phí thao tác theo bảng nhà cung cấp. Giá và hạn mức có thể thay đổi; khi chọn gói cần kiểm tra tài khoản thực tế.

Website CLB ít người có thể nằm trong các quota miễn phí, nhưng chưa có số liệu production để cam kết dự án này luôn 0 đồng. Framework/backend còn chịu giới hạn CPU và tài nguyên của gói đã chọn. Tên miền riêng, dịch vụ SMS/OTP/email hoặc chi phí của nền tảng hosting khác cũng có thể tính riêng.

Các con số trên là giá **Cloudflare trực tiếp**, không phải cam kết phí của mọi dịch vụ hosting trung gian hoặc của Sites trong ứng dụng Codex.

## Giới hạn 20 tin và 20 album có giảm dung lượng không?

Website giữ tối đa **20 bài tin và 20 album đã đăng**. Khi đăng thêm, bản ghi nội dung cũ hơn bị loại khỏi D1, không chỉ ẩn ở danh sách. Đề xuất staff chưa đăng nằm ở hàng đợi riêng. Album mới dùng chính sách số lượng thay cho hết hạn theo tháng.

File upload vật lý trong R2 không tự bị xóa theo giới hạn bản ghi. Một file có thể được nhiều nội dung dùng chung; chỉ file còn được nội dung đã đăng tham chiếu mới được phục vụ công khai. Nếu cần giải phóng dung lượng R2 thực tế, cần thêm quy trình dọn file không còn được sử dụng. Các đường link tổng hợp ảnh/video ngoài website không chiếm dung lượng file trong R2 của website.

## Trạng thái local sau lần sửa này

Dữ liệu thử local đã được dọn trống theo yêu cầu mới nhất, gồm cả các file upload trong R2 local. Chỉ giữ tài khoản admin hiện có và cấu hình CLB cơ bản. Tài khoản staff/user, hồ sơ, đăng ký, giải, tin, album và lời nhắn đều đã xóa. Hai ô liên hệ, link Zalo và Facebook được admin cập nhật qua giao diện. Source ZIP không chứa database hay file riêng tư.

`npm run setup:local` tạo cài đặt mới trống nội dung và không reset dữ liệu hiện có. `npm run reset:empty` xóa nội dung local, giữ admin. File upload vật lý không bị lệnh reset xóa; URL không còn tham chiếu hợp lệ không phục vụ cho khách. Bộ giả lập chỉ được tạo khi người phát triển chủ động chạy `npm run demo:reset`; không cần chạy để sử dụng website.

Điểm trình vẫn lưu dưới dạng chuỗi trong JSON (`data.rating`), nhưng bắt buộc kiểm tra thập phân dấu chấm như 3.5 hoặc 3.45. Ảnh cá nhân nằm trong R2 local, chỉ chủ hồ sơ và admin/staff xem được. Công bố duyệt tạm và chốt chính thức là hai thao tác riêng; `event_state.official_at` đánh dấu đã chốt. Excel chỉ lấy các đơn chính thức đã công bố. Từ bản cập nhật này, đề xuất có cột `operation` để phân biệt tạo mới/chỉnh sửa; bảng `submissions` giữ tối đa 30 log đã duyệt, không áp dụng giới hạn này cho bản chờ hoặc trả về. Bài viết có mảng `sections` và ngày đăng do server ghi lúc công khai.
