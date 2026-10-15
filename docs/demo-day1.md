# Kịch bản kiểm tra và demo ngày 1

1. Chạy setup, migration, seed và build theo README. Khởi động web ở cổng 8001 để tách với bản đầy đủ thường dùng cổng 8000.
2. Mở `/login`, đăng nhập `demo` bằng `DEMO_PASSWORD` trong `.env` của Lite. Không chụp mật khẩu vào báo cáo.
3. Tổng quan có bốn mục điều hướng: Tổng quan, Giao dịch, Danh mục, Báo cáo. Màn hình nhỏ vẫn truy cập được cả bốn.
4. Với dữ liệu seed mới, chọn tháng seed: thu 15.000.000 VND, chi 3.595.000 VND, chênh lệch 11.405.000 VND. Tháng trước thu 14.000.000, chi 3.800.000. Nếu chỉ có chín giao dịch seed, số dư tích lũy là 21.605.000 VND.
5. Vào Danh mục, tạo một danh mục chi mẫu. Vào Giao dịch, thêm một khoản chi dương với ngày không vượt hôm nay và ghi chú nhận diện.
6. Lọc giao dịch bằng từ khóa/danh mục; sửa số tiền; mở Báo cáo và xác nhận tổng chi cập nhật. Xóa giao dịch mẫu và danh mục vừa tạo, xác nhận tổng trở lại giá trị seed.
7. Đăng xuất, đăng ký tài khoản mới. Tài khoản mới có dữ liệu trống và không nhìn thấy dữ liệu `demo`.
8. Đăng xuất; mở trực tiếp `/transactions` phải quay lại đăng nhập. Các URL `/assistant`, `/budgets`, `/goals` quay về trang hỗ trợ; API tương ứng không được cung cấp.
9. Kiểm tra `/api/health` và `/api/ready`; cả hai trả HTTP 200 khi app/database local hoạt động.

Ngày 1 kiểm tra ứng dụng local. Demo PostgreSQL/pgAdmin, Nginx, monitoring, LogQL và hardening đầy đủ được hoàn thiện ở các ngày tiếp theo.

## Kiểm tra hồi quy sau sửa lỗi

- Tạo khoản chi `1,23`, mở chỉnh sửa rồi lưu nguyên nội dung; số tiền vẫn là `1,23`. `0,001` hoặc số tiền từ một nghìn tỷ trở lên phải bị từ chối. Trên mobile, chọn ghi chú ngay sau khi mở bảng nhập; con trỏ không bị kéo về ô tiền.
- Khi phiên ở tab khác đổi tài khoản, tab đang mở phải đổi đúng danh tính và bỏ dữ liệu tài khoản cũ. Xóa token/đăng xuất ở tab khác phải đưa các tab về đăng nhập.
- Khi `/api/auth/me` gặp lỗi mạng/503, hiển thị thông báo có nút Thử lại, giữ token. Khi máy chủ hoạt động lại, Thử lại phải khôi phục phiên.
- Chạy seed lại cùng tháng và tháng kế tiếp trên database thử: tháng đã seed không tăng bản ghi hoặc đổi tổng tiền. Các số liệu mẫu ở bước 4 áp dụng cho bộ seed mới, chưa có fixture của những tháng đó.
