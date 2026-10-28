# Làm việc chung với Git

Lấy `origin/main` mới nhất làm nền trước mỗi lần sửa. Các thay đổi của collaborators, gồm cấu hình Docker/Traefik, là một phần của code chính thức. Không dùng bản code hoặc file ZIP cũ chép đè lên checkout mới.

## Cấu hình một lần cho mỗi bản clone

Chạy trong thư mục repo:

```sh
git config --local pull.ff only
git config --local fetch.prune true
git config --local merge.conflictStyle diff3
```

`git pull` chỉ cập nhật thẳng khi lịch sử cho phép; nếu hai phía có commit riêng, Git dừng để xử lý thay vì tự tạo merge. `diff3` thêm phần nội dung gốc khi có conflict để dễ đối chiếu. Các cấu hình này chỉ áp dụng cho checkout hiện tại, không tự đi theo repo khi clone lại.

## Trước khi sửa

Kiểm tra và commit công việc đang làm vào nhánh riêng trước khi chuyển nhánh. Khi working tree sạch:

```sh
git switch main
git pull --ff-only
git switch -c ten-nhanh-cong-viec
```

Đọc các commit mới và chỉ sửa các file liên quan. Giữ nguyên Docker, Traefik và tên volume nếu công việc không yêu cầu thay đổi hạ tầng. Không định dạng lại toàn repo trong một thay đổi nhỏ.

## Trước khi gửi thay đổi

Sau khi commit trên nhánh công việc:

```sh
git fetch origin --prune
git merge origin/main
# Xử lý conflict nếu có, rồi chạy các kiểm tra phù hợp trong README.
git push -u origin HEAD
```

Tạo pull request vào `main` để các bên cùng xem diff. Nếu `main` lại thay đổi, lấy và merge bản mới vào nhánh công việc, kiểm tra lại phần bị ảnh hưởng. Không force-push lên `main`, không dùng `--ours`/`--theirs` cho toàn bộ conflict. Nếu local `main` đã có commit riêng và không fast-forward được, giữ các commit đó trên nhánh công việc rồi đối chiếu với remote; không reset bỏ chúng.

Quy trình này giảm xung đột và tránh mất code. Git vẫn có thể báo conflict khi hai người sửa cùng một phần; cần kết hợp cả hai thay đổi theo mục đích của chúng.

## Cấu hình riêng và dữ liệu

- `.env`: tên miền, mật khẩu và đường dẫn riêng cho từng máy; không commit.
- `compose.override.yaml` hoặc `compose.override.yml`: điều chỉnh Compose riêng cho máy đó; Git và Docker build bỏ qua. Không lưu cùng lúc cả hai tên. Compose tự đọc file override bên cạnh `compose.yaml` khi dùng lệnh mặc định.
- `compose.yaml`, `Dockerfile`, `.env.example`: cấu hình chung, chỉ sửa khi thực sự thay đổi cách chạy của dự án. Nếu thêm biến môi trường, cập nhật mẫu và tài liệu nhưng không điền bí mật thật.
- Database, ảnh và backup ở volume/thư mục dữ liệu riêng; không đưa lên Git. Giữ nguyên tên dự án Compose và volume để các lần cập nhật dùng lại đúng dữ liệu.
- Chỉ thêm migration mới; không sửa SQL migration đã áp dụng.

VPS dùng checkout sạch để cập nhật theo [hướng dẫn triển khai](docs/DEPLOY_VPS.md). Không sửa code trực tiếp trên VPS rồi kéo bản mới đè lên. Commit/push không tự triển khai website.
