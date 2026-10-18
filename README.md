# Sổ Chi Tiêu Lite — Đề 38

Dự án phục vụ học phần **Triển khai và Quản trị Hệ thống Phần mềm**, kế thừa từ Expense Management AI và thu gọn để thực hành triển khai, vận hành hệ thống trên Ubuntu VM bằng Docker Compose.

Repository: https://github.com/dtc245200007/expense-management-lite-final

## Phạm vi ứng dụng

- Đăng ký, đăng nhập và đăng xuất.
- Quản lý danh mục thu, chi.
- Thêm, sửa, xóa và lọc giao dịch.
- Xem tổng quan và báo cáo thu chi theo tháng.
- Phân tách dữ liệu theo tài khoản.

Không cung cấp AI, ngân sách, mục tiêu tiết kiệm, hồ sơ nâng cao, upload hoặc đặt lại mật khẩu qua email.

Giao diện React và API FastAPI được đóng gói trong cùng image. Schema ORM và ba migration kế thừa được giữ lại; các bảng legacy không đồng nghĩa tính năng tương ứng được cung cấp trong Lite.

## Triển khai hiện tại

Ứng dụng web, PostgreSQL, pgAdmin và Nginx đã được triển khai, kiểm tra trên Ubuntu VM. Web được truy cập qua HTTPS với chứng chỉ tự ký và security headers. Dữ liệu và cấu hình pgAdmin được giữ khi tạo lại container bằng Docker Compose.

Loki và Promtail đã được tích hợp để thu thập log tập trung của Nginx, web và PostgreSQL. Các truy vấn LogQL đã được kiểm tra trên Grafana Explore. Phần tiếp theo là hoàn thiện hardening.

## Giám sát bằng Prometheus và Grafana

Hệ thống sử dụng cAdvisor để thu thập tài nguyên container,
Nginx Exporter và PostgreSQL Exporter để thu thập số liệu dịch vụ.

Địa chỉ truy cập trên trình duyệt Ubuntu:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- cAdvisor: http://localhost:8081

Thông tin đăng nhập Grafana được cấu hình bằng
GRAFANA_ADMIN_USER và GRAFANA_ADMIN_PASSWORD trong .env.compose.

Dashboard “Expense Lite - Giám sát hệ thống” gồm sáu biểu đồ:
CPU, RAM theo dịch vụ; request và kết nối Nginx;
kết nối và transaction commit PostgreSQL.

Cấu hình dashboard được xuất theo định dạng Grafana V2 JSON,
lưu tại docker/grafana/dashboards/expense-lite-overview-v2.json.
File này là bản xuất để nhập lại khi cần, chưa được cấu hình tự động nạp.

Dữ liệu Prometheus và Grafana được lưu trong các volume
prometheus_data và grafana_data.

## Log tập trung với Loki và Promtail

Promtail thu thập log của Nginx, web và PostgreSQL qua Docker API,
gửi tới Loki để lưu trữ và truy vấn.

- Loki: http://localhost:3100/ready
- Tra cứu log: Grafana → Explore → chọn datasource loki.
- Thời gian lưu log cấu hình: 24 giờ.
- Volume dữ liệu: loki_data và promtail_positions.
- Hướng dẫn kết nối và ba truy vấn minh họa: [docs/logging.md](docs/logging.md).

## Yêu cầu môi trường

- Ubuntu VM có kết nối Internet.
- Docker Engine và Docker Compose.
- Git và OpenSSL.
- Người dùng có quyền sử dụng Docker.

Không cần cài Python hoặc Node.js trên Ubuntu để chạy hệ thống bằng Docker Compose.

## Các file triển khai

| File | Mục đích |
|---|---|
| `Dockerfile` | Build React và đóng gói FastAPI |
| `docker-entrypoint.sh` | Chạy migration và khởi động web |
| `docker-compose.yml` | Khai báo dịch vụ, mạng và volume |
| `compose.env.example` | Mẫu biến môi trường |
| `.env.compose` | Cấu hình riêng, không đưa lên Git |
| `docker/postgres/init/01-create-app-user.sh` | Tạo tài khoản database của ứng dụng |

## Chuẩn bị biến môi trường

Chạy từ thư mục gốc dự án. Nếu chưa có `.env.compose`, tạo file và sinh các giá trị riêng:

```bash
if [ -e .env.compose ]; then
    echo ".env.compose đã tồn tại, giữ nguyên."
else
    (
        set -e
        umask 077
        cp compose.env.example .env.compose

        for key in POSTGRES_PASSWORD APP_DB_PASSWORD SECRET_KEY DEMO_PASSWORD PGADMIN_DEFAULT_PASSWORD; do
            value=$(openssl rand -hex 32)
            sed -i "s/^${key}=.*$/${key}=${value}/" .env.compose
        done
    )
fi

chmod 600 .env.compose
```

Kiểm tra:

```bash
stat -c '%a %n' .env.compose
git check-ignore .env.compose
docker compose --env-file .env.compose config --quiet
```

Không đưa mật khẩu, khóa bí mật hoặc nội dung `.env.compose` vào GitHub và ảnh báo cáo. Giữ nguyên các giá trị đã sử dụng khi database được khởi tạo.

## Chuẩn bị HTTPS trên Ubuntu

Khai báo tên truy cập trên chính Ubuntu VM:

```bash
if ! grep -qE '(^|[[:space:]])expense-lite[.]test([[:space:]]|$)' /etc/hosts; then
    printf '\n127.0.0.1 expense-lite.test\n' | sudo tee -a /etc/hosts
fi

getent hosts expense-lite.test
```

Tạo thư mục chứng chỉ:

```bash
mkdir -p docker/nginx/certs
```

Nếu chưa có cặp chứng chỉ, tạo bằng lệnh sau. Giữ nguyên nếu đã tạo:

```bash
(
set -e
umask 077

openssl req -x509 -noenc -newkey rsa:2048 \
    -sha256 -days 365 \
    -keyout docker/nginx/certs/expense-lite.test.key \
    -out docker/nginx/certs/expense-lite.test.crt \
    -subj "/CN=expense-lite.test" \
    -addext "subjectAltName=DNS:expense-lite.test,DNS:localhost,IP:127.0.0.1" \
    -addext "basicConstraints=critical,CA:FALSE"

chmod 600 docker/nginx/certs/expense-lite.test.key
chmod 644 docker/nginx/certs/expense-lite.test.crt
)
```

Thư mục chứng chỉ được Git bỏ qua. File cấu hình Nginx nằm tại `docker/nginx/default.conf`.

Trong `.env.compose`, bảo đảm có:

```dotenv
TRUSTED_HOSTS=expense-lite.test,localhost,127.0.0.1
```

Cổng 80 và 443 cần được giải phóng trước khi chạy Nginx bằng Compose.

HTTP tự chuyển sang `https://expense-lite.test`. Trình duyệt cần chấp nhận ngoại lệ cho chứng chỉ tự ký trong môi trường lab.

Kiểm tra HTTPS và API:

```bash
curl --cacert docker/nginx/certs/expense-lite.test.crt \
    -sS -D - -o /dev/null https://expense-lite.test/

curl --cacert docker/nginx/certs/expense-lite.test.crt \
    -fsS https://expense-lite.test/api/ready
```

Nginx cung cấp các headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` và `Permissions-Policy`.

Sau khi sửa file cấu hình Nginx đang được bind mount, có thể tạo lại riêng container để nhận file mới:

```bash
docker compose --env-file .env.compose up -d --no-deps --force-recreate nginx
```

## Build và khởi động

```bash
docker compose --env-file .env.compose build web
docker compose --env-file .env.compose up -d
docker compose --env-file .env.compose ps
```

PostgreSQL và web cần đạt trạng thái `healthy`; pgAdmin cần ở trạng thái đang chạy.

PostgreSQL thực hiện script khởi tạo khi vùng dữ liệu còn trống. Web sử dụng tài khoản `expense_app`, chạy Alembic migration trước khi khởi động Uvicorn.

Xem log:

```bash
docker compose --env-file .env.compose logs --tail=50 web
```

## Dữ liệu mẫu và truy cập web

Tạo dữ liệu giả lập:

```bash
docker compose --env-file .env.compose exec web python -m scripts.seed_demo
```

Module tạo tài khoản `demo`, bốn danh mục và chín giao dịch cho tháng hiện tại/tháng trước. Chạy lại trong cùng tháng không nhân đôi dữ liệu mẫu hoặc đổi mật khẩu.

Truy cập bằng trình duyệt trong Ubuntu:

- Web: https://expense-lite.test
- pgAdmin: http://localhost:5050
- Health: https://expense-lite.test/api/health
- Database readiness: https://expense-lite.test/api/ready

Đăng nhập web bằng tài khoản `demo`, mật khẩu là giá trị `DEMO_PASSWORD` trong `.env.compose`. Có thể đăng ký tài khoản mới trên giao diện.

## Kết nối PostgreSQL bằng pgAdmin

Đăng nhập pgAdmin bằng `PGADMIN_DEFAULT_EMAIL` và `PGADMIN_DEFAULT_PASSWORD`.

Đăng ký server với thông tin:

| Trường | Giá trị |
|---|---|
| Name | Expense Lite |
| Host name/address | postgres |
| Port | 5432 |
| Maintenance database | expense_lite |
| Username | expense_app |
| Password | Giá trị APP_DB_PASSWORD |

Hostname là `postgres` vì kết nối được thực hiện giữa các container. PostgreSQL không công bố cổng ra VM.

## Mạng và lưu trữ

| Dịch vụ | Image | Cổng trên Ubuntu | Mạng | Lưu trữ |
|---|---|---|---|---|
| Web | expense-management-lite:local | Nội bộ: 8000 | app_net, db_net | Dữ liệu nghiệp vụ trong PostgreSQL |
| Nginx | nginx:1.30-alpine | 127.0.0.1:80, 127.0.0.1:443 | app_net | Cấu hình và chứng chỉ mount chỉ đọc |
| PostgreSQL | postgres:16-alpine | Không công bố | db_net | postgres_data |
| pgAdmin | dpage/pgadmin4:9.18 | 127.0.0.1:5050 | app_net, db_net | pgadmin_data |

`db_net` là mạng nội bộ. Hai volume lưu dữ liệu tại `/var/lib/postgresql/data` và `/var/lib/pgadmin`.

## Dừng và tạo lại container

```bash
docker compose --env-file .env.compose down
docker compose --env-file .env.compose up -d
docker compose --env-file .env.compose ps
```

Các lệnh trên giữ lại volume. Không thêm `-v` nếu cần giữ dữ liệu.

Để kiểm tra lưu trữ, đối chiếu giao dịch và số lượng bản ghi trước/sau khi tạo lại container, không chạy lại seed trong quá trình kiểm tra.

## Quy tắc dữ liệu

- Số tiền từ 0,01 đến 999.999.999.999,99 VND, tối đa hai chữ số thập phân.
- Ô nhập chấp nhận `1,23` hoặc `1.23`, không dùng dấu phân nhóm hàng nghìn.
- Ngày nghiệp vụ sử dụng `Asia/Ho_Chi_Minh`.
- Tên đăng nhập mới không chứa `@`; email có trường riêng.
- Sử dụng dữ liệu giả lập và database riêng cho đồ án.

## Nguồn kế thừa

Mã nguồn ứng dụng kế thừa từ:
https://github.com/daominhtam2k6/Expense-Management-Ai-Integration

Revision nguồn được ghi trong `docs/source.json`.
Phạm vi và tiêu chí nghiệm thu được ghi trong `docs/scope-and-checklist.md`.
