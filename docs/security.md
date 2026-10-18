# Bảo mật hệ thống Expense Lite

## Quyền container

- Web chạy bằng appuser, loại bỏ toàn bộ Linux capability
  và bật no-new-privileges.
- Loki chạy UID 10001, có cap_drop: ALL và no-new-privileges.
- PostgreSQL và phần lớn dịch vụ chạy tiến trình bằng tài khoản
  không phải root.
- Nginx giữ master chạy root và worker không phải root.

Ngoại lệ:
- cAdvisor chạy privileged để phục vụ giám sát.
- Promtail chạy root và truy cập Docker socket.
  Mount socket với :ro không giới hạn Docker API thành chỉ đọc.

## Mạng và cổng

- Các mạng được tách thành app_net, db_net và monitor_net.
- db_net có internal: true.
- PostgreSQL, web và các exporter không công bố cổng ra VM.
- Các cổng được công bố đều giới hạn trên 127.0.0.1.
- Người dùng truy cập web qua https://expense-lite.test.
- VM chưa cài công cụ UFW; chưa bổ sung Fail2ban.

## Thông tin bí mật

- .env.compose và khóa riêng HTTPS có quyền 600.
- Chứng chỉ công khai có quyền 644.
- File môi trường riêng và thư mục chứng chỉ không được Git theo dõi.
- compose.env.example không chứa giá trị bí mật thực tế.
- Các mật khẩu được sinh riêng, không dùng chung giữa các tài khoản.

## Quyền PostgreSQL

- expense_app sở hữu database expense_lite để chạy migration
  và có quyền thao tác dữ liệu ứng dụng.
- expense_monitor được cấp pg_monitor, không có quyền đọc,
  thêm, sửa hoặc xóa bảng giao dịch.
- Hai tài khoản không có quyền superuser, tạo database,
  tạo role, replication hoặc bỏ qua row-level security.

## HTTPS và HTTP headers

- HTTP chuyển hướng sang HTTPS.
- Chứng chỉ tự ký có SAN expense-lite.test.
- Nginx không công bố phiên bản trong header Server.
- Áp dụng X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy và Permissions-Policy.

## Tài nguyên và lưu trữ log

- Cả 11 dịch vụ có giới hạn bộ nhớ trong docker-compose.yml.
- Docker sử dụng json-file, max-size: 10m và max-file: 3.
- Prometheus lưu dữ liệu 24 giờ, giới hạn TSDB 512 MB.
- Loki có retention 24 giờ, xóa dữ liệu qua Compactor.

## Kiểm chứng sau thay đổi

Đã kiểm tra:
- Đăng nhập, dữ liệu cũ và thao tác thêm/sửa/xóa giao dịch.
- Kết nối và truy vấn pgAdmin.
- Bốn target Prometheus đều UP.
- Dashboard Grafana còn đủ sáu biểu đồ, tiếp tục cập nhật.
- Log mới của Nginx, web và PostgreSQL được truy vấn trên Explore.
- Không ghi nhận OOM hoặc container tự khởi động lại tại thời điểm kiểm tra.

Các kiểm tra thực hiện trong môi trường demo trên Ubuntu VM;
chưa phải kiểm thử tải hoặc đánh giá bảo mật toàn diện.
