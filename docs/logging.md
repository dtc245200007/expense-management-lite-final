# Log tập trung với Loki và Promtail

## Thành phần

- Loki lưu và phục vụ truy vấn log; thời gian lưu cấu hình là 24 giờ.
- Promtail thu thập log qua Docker API.
- Nguồn thu thập: nginx, web và postgres thuộc dự án expense-lite.
- Dữ liệu Loki lưu trong volume loki_data.
- Tiến độ thu thập lưu trong volume promtail_positions.

## Kết nối Grafana

Truy cập http://localhost:3000 và đăng nhập bằng tài khoản quản trị.

Vào Connections → Add new connection → Loki → Add new data source:
- Name: loki
- URL: http://loki:3100
- Authentication: No authentication
- Giữ Prometheus làm datasource mặc định.

Chọn Save & test. Cấu hình tạo trên giao diện được lưu trong
volume grafana_data. Nếu triển khai với volume Grafana mới,
thực hiện lại các thao tác kết nối trên.

## Truy vấn minh họa

Mở Explore, chọn datasource loki và chế độ Code.
Chọn Last 15 minutes; mở rộng khoảng thời gian nếu cần.

### 1. Request API của web, loại log readiness

Đăng nhập ứng dụng và chuyển qua các trang để tạo request.

```logql
{project="expense-lite", service="web"} |= "/api/" != "/api/ready"
```

### 2. Request Nginx trả về HTTP 404

Truy cập https://expense-lite.test/api/kiem-tra-log-404
để tạo một request tới đường dẫn không tồn tại.

```logql
{project="expense-lite", service="nginx"} |= "/api/kiem-tra-log-404" |= " 404 "
```

### 3. Lỗi PostgreSQL

Trong pgAdmin Query Tool của database expense_lite, chạy:

```sql
SELECT 1 / 0;
```

Lệnh cố ý tạo lỗi chia cho không, không thay đổi dữ liệu.

```logql
{project="expense-lite", service="postgres"} |= "ERROR:" |= "division by zero"
```

## Lưu ý khi kiểm tra

- Chờ khoảng 5–10 giây sau thao tác rồi chạy lại truy vấn.
- Nginx cần có lượt truy cập để phát sinh access log.
- Endpoint /stub_status đã tắt access log.
- PostgreSQL hiện ghi log vận hành và lỗi, chưa bật ghi toàn bộ SQL.
