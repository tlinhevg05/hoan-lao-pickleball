# Hướng dẫn quản trị Hoàn Lão Pickleball

Môi trường local hiện đã được dọn trống theo yêu cầu: không còn hồ sơ VĐV, đăng ký giải, staff, giải đấu, bài viết, album, lời nhắn hoặc file upload thử. Giữ tài khoản admin hiện có và cấu hình CLB cơ bản.

Đăng nhập bằng tài khoản admin đã đặt trong `.env` khi cài lần đầu hoặc thông tin đã đổi trong Quản lý tài khoản. Cài đặt VPS chính thức theo `DEPLOY_VPS.md`; không có mật khẩu production mặc định.

## Chuẩn bị nội dung

1. Vào Thông tin CLB, nhập hai đầu mối liên hệ, SĐT, link nhóm Zalo và fanpage Facebook. Chỉ admin sửa được mục này. Người thứ hai chưa có thông tin sẽ hiện Sẽ cập nhật.
2. Vào Quản lý tài khoản để tạo staff hoặc sửa tài khoản. Chỉ admin sửa tên đăng nhập/mật khẩu tài khoản admin; không thể xóa/khóa admin. Thay thông tin đăng nhập sẽ hết hiệu lực phiên cũ; admin tự đổi được cấp lại phiên để tiếp tục thao tác.
3. Tạo giải: mỗi nội dung mới mặc định 100 suất, chỉnh lại theo quy mô. Nhập thời gian mở/hạn/ngày thi đấu, lệ phí và hình thức ghép cặp; thể lệ/thông tin chi tiết có thể bỏ trống. Trạng thái tự mở lúc 00:00 ngày mở đơn và tự đóng khi hết hạn theo giờ Việt Nam. Tạo giải trong khoảng đang nhận đơn sẽ tự hiện Đang mở đăng ký. Chọn ưu tiên trang nhất nếu muốn làm giải nổi bật.
4. Poster dùng khung ngang 4:3. Nên chuẩn bị ảnh đúng tỷ lệ để tránh cắt mép. Trang nhất tự đưa thông tin giải vào vùng gradient đậm.

## Từ đăng ký đến công bố

Khách chọn giải → Đăng ký giải → Tạo hồ sơ hoặc đăng nhập SĐT có sẵn → Chọn một nội dung → Gửi đơn. Muốn thêm nội dung khác thì gửi một đơn khác.

Điểm trình bắt buộc, dùng dấu chấm: `3.5`, `3.45`, `2.15`; tối đa hai chữ số ở mỗi phía. Ảnh cá nhân không bắt buộc, tối đa 2 MB; chỉ VĐV đó và ban điều hành xem được.

- Với nội dung đôi do VĐV tự đăng ký đồng đội: phải điền tên đồng đội.
- BTC ghép cặp: không cần tên đồng đội; có thể ghi đồng đội mong muốn trong lời nhắn.
- Giải không có nội dung đôi: không hiện thông tin ghép cặp hay ô đồng đội.

Admin/staff vào Hồ sơ VĐV để xét hồ sơ cá nhân. Sau đó vào Hồ sơ đăng ký giải → Chọn giải → Chọn nội dung. Nút Xét duyệt xử lý đơn; Chi tiết mở đầy đủ hồ sơ. Danh sách chọn ở bên phải đếm theo từng nội dung, không cho vượt số suất.

**Công bố danh sách duyệt tạm:** dùng nhiều lần; chỉ cập nhật kết quả công khai khi bấm và xác nhận. Các đơn từ chối vẫn hiện chờ duyệt cho người xem. Giải còn nhận đơn nếu chưa hết hạn.

**Chốt danh sách VĐV:** xác nhận để chuyển giải sang Đã chốt danh sách VĐV và dừng đăng ký. Nút đổi thành Thay đổi danh sách chính thức. Nếu đổi người sau đó, hãy liên hệ trực tiếp các VĐV bị ảnh hưởng rồi công bố lại.

Từ chối chỉ công khai sau hạn đăng ký và khi đã chốt chính thức. Đơn chưa xét vẫn giữ chờ duyệt. Tên của chính VĐV đang đăng nhập được tô xanh khi duyệt, vàng khi chờ, đỏ khi công khai từ chối. Suất tham gia chỉ tính người được duyệt đã công bố.

**Xuất Excel:** chỉ bật sau khi chốt chính thức. File chỉ có danh sách chính thức đã công bố; không có đơn chờ hoặc bị từ chối. Chỉnh nội bộ chưa công bố lại chưa làm đổi file xuất.

## Tin tức và album

Tin tức mặc định có Đoạn 1, gồm ô tiêu đề ngắn và ô nội dung dài. Tiêu đề hiển thị lớn, đậm; nội dung giữ chữ thường. Bấm Thêm đoạn 2/3… để viết tiếp, có thể bỏ đoạn thừa. Xem trước dùng đúng cách hiển thị bài chi tiết. Chủ đề chọn một mục; Khác thêm chủ đề mới cho những lần sau.

Album có tiêu đề, bìa, nhiều ảnh/mô tả và nhóm link tổng hợp ảnh/video. Dán nhiều link bằng cách xuống dòng. Bài viết và album không chọn ngày đăng; ô Ngày đăng được hệ thống ghi theo thời gian thực khi admin xuất bản hoặc duyệt đề xuất của staff. Sửa nội dung giữ thời gian đăng đầu.

Mỗi loại giữ 20 tin/album đã đăng gần nhất; đăng thêm sẽ xóa bản ghi nội dung cũ nhất khỏi database. File upload vật lý không tự xóa. Staff gửi tin/album/giải vào hàng đợi, admin xem rồi sửa/đăng/từ chối. Mỗi đề xuất có nhãn tạo mới/chỉnh sửa. Mục Đã đăng chỉ giữ 30 log phê duyệt gần nhất, không xóa các đề xuất còn chờ hoặc đã trả về.

Thanh lưu/gửi phê duyệt luôn hiện ở đáy form khi cuộn nội dung. Footer gồm logo, fanpage có tên hiển thị bấm được và hai đầu mối SĐT nằm cùng một cụm (hai dòng). Trên điện thoại, các cụm xuống dòng để dễ đọc.

Trong Thông tin CLB, nhập link fanpage Facebook và tên hiển thị riêng. Nút nhóm Zalo dùng chung link CLB và nổi cố định ở góc phải màn hình, không nằm trong footer; chưa có link thì nút chưa hoạt động. Mục Nhà tài trợ trên menu trái cho phép thêm nhiều tên hiển thị và link website/fanpage HTTPS không bắt buộc theo thứ tự nhập. Một nhà tài trợ hiển thị tĩnh; nhiều đơn vị tự cuộn, dừng khi rê chuột hoặc chọn bằng bàn phím. Chế độ giảm chuyển động dùng cuộn tay. Chỉ admin được sửa các thông tin này.

Khi kéo chuột từ ô nhập ra ngoài modal, form không đóng và vẫn giữ thông tin. Bấm riêng vào nền bên ngoài hoặc nút Đóng/Hủy mới đóng.

## Cài đặt và sao lưu

Xem `DEPLOY_VPS.md` để triển khai chính thức bằng Docker Compose hoặc Node.js 24. Database SQLite và thư mục upload nằm trong volume/thư mục dữ liệu riêng; cập nhật code không reset dữ liệu. Dùng lệnh backup trong tài liệu và lưu bản sao ngoài VPS. Không xóa volume, không dùng `docker compose down -v` nếu cần giữ dữ liệu.

162 kiểm tra API chạy trên server production và database/ảnh tạm riêng; dữ liệu kiểm thử không đưa vào bản chính thức.
