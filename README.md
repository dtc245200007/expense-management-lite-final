# Sổ Chi Tiêu Lite — Đề 38

Phiên bản phục vụ môn **Triển khai và Quản trị Hệ thống Phần mềm**, kế thừa dự án Expense Management AI. Mục tiêu là một ứng dụng thu chi đủ dùng để thực hành Docker Compose, PostgreSQL/pgAdmin, Nginx, monitoring, logging và hardening.

Phạm vi đã được người dùng đồng ý ngày 07/10/2026: xác thực, danh mục, giao dịch, tổng quan và báo cáo. Kế hoạch hoàn thành trong 10 ngày. Xem [phạm vi và nghiệm thu](docs/scope-and-checklist.md), [kế hoạch](docs/plan-10-days.md) và [nguồn kế thừa](docs/source.json).

## Trạng thái ngày 1

Ứng dụng được tách vào thư mục riêng. Giao diện có bốn trang: Tổng quan, Giao dịch, Danh mục, Báo cáo. API chỉ cung cấp xác thực cơ bản và các chức năng này. AI, ngân sách, mục tiêu tiết kiệm, hồ sơ nâng cao, upload và đặt lại mật khẩu không được cung cấp trong Lite. Không cần API key bên ngoài.

Schema ORM và ba migration gốc được giữ để tránh thay đổi dữ liệu ngoài phạm vi ngày 1. Các bảng legacy không đồng nghĩa tính năng tương ứng đang được cung cấp. Sử dụng database mới; không sao chép `expense.db`, `.env`, uploads hoặc dữ liệu cá nhân từ dự án gốc.

Sau lượt rà soát và sửa lỗi, ứng dụng đã được kiểm chứng lại trên SQLite và PostgreSQL 16, bao gồm bản Docker Python 3.13/Node 24. Xem [kết quả sửa lỗi và điều kiện chuyển ngày 2](docs/day1-fixes.md). Chưa có bộ Compose hoàn chỉnh hoặc kiểm chứng trên Ubuntu VM; hai phần này thuộc ngày 2.

Tiền giao dịch có tối đa hai chữ số thập phân, trong khoảng 0,01–999.999.999.999,99 VND. Ô nhập chấp nhận `1,23` hoặc `1.23`, không nhập dấu phân nhóm hàng nghìn. API từ chối precision/range không hợp lệ thay vì âm thầm làm tròn. Ngày nghiệp vụ dùng `Asia/Ho_Chi_Minh` trên cả frontend và backend.

Tên đăng nhập mới không chứa `@`; email có trường riêng. Mật khẩu mới dùng bcrypt-sha256 để xác thực toàn bộ nội dung, dài 6–1024 ký tự. Hash bcrypt cũ được chuyển đổi sau lần đăng nhập hợp lệ; trường hợp mật khẩu bcrypt cũ từ 72 byte trở lên bị từ chối vì hash cũ không chứng minh được phần nội dung đã bị cắt. Tài khoản demo hiện tại tương thích.

## Chạy local trên Windows

Chạy lệnh từ thư mục chứa README này. Dự án gốc dùng Python 3.13 và Node.js 24; phiên bản Python thực tế dùng kiểm chứng được ghi ở báo cáo ngày 1.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe scripts/setup_local.py
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m scripts.seed_demo
Set-Location frontend
npm.cmd ci
npm.cmd run build
Set-Location ..
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Mở **http://127.0.0.1:8001**. Tên đăng nhập mẫu là **demo**, mật khẩu nằm ở biến `DEMO_PASSWORD` trong `.env` riêng của bản Lite. Có thể mở `.env` bằng trình soạn thảo để lấy mật khẩu; không đưa file này vào Git hoặc ảnh báo cáo. Cũng có thể đăng ký tài khoản mới qua giao diện.

`setup_local.py` tạo khóa ký và mật khẩu mẫu ngẫu nhiên; chạy lại không ghi đè `.env`. `seed_demo` tạo một tài khoản, bốn danh mục và chín giao dịch giả lập cho tháng hiện tại/tháng trước; chạy lại cùng tháng không nhân đôi bản ghi hoặc đổi mật khẩu. Nếu `.env` đã có nhưng thiếu `DEMO_PASSWORD`, đặt một giá trị riêng dài ít nhất 12 ký tự trước khi seed.

Để dữ liệu phù hợp ngày demo, chạy lại seed trong tháng demo. Một tháng đã có bộ dữ liệu fixture được giữ nguyên cả số bản ghi lẫn số tiền; lần chạy sau chỉ bổ sung tháng chưa có fixture. Quy tắc này áp dụng cả khi chạy đảo thứ tự tháng, chuyển năm và gặp ID seed phiên bản cũ. Có thể truyền `--as-of YYYY-MM-DD` để tạo mẫu cho một ngày quá khứ xác định. Seed từ chối rõ ràng khi username/email demo thuộc tài khoản khác.

Image Docker có sẵn module `scripts.seed_demo`. Khi chạy seed trong container, cung cấp `DEMO_PASSWORD` qua biến môi trường riêng, không đưa mật khẩu vào mã nguồn hoặc ảnh báo cáo.

## Chạy local trên Ubuntu

Sau khi có Python, venv và Node/npm:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python scripts/setup_local.py
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m scripts.seed_demo
npm --prefix frontend ci
npm --prefix frontend run build
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Đây là cách kiểm tra ứng dụng local. Hướng dẫn chạy toàn bộ stack bằng Compose trên Ubuntu VM sẽ được bổ sung ở các ngày triển khai.

## Kiểm chứng

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m alembic check
npm.cmd --prefix frontend test -- --coverage
npm.cmd --prefix frontend run build
```

- Health: `GET /api/health`.
- Database readiness: `GET /api/ready`.
- API docs local: `/api/docs`.
- Backend kiểm tra luồng xác thực → CRUD → lọc → tổng quan/báo cáo, quyền sở hữu dữ liệu, đầu vào lỗi và seed lặp lại.
- Frontend kiểm tra các route, điều hướng, yêu cầu đăng nhập, đăng xuất và khôi phục sau lỗi tải dữ liệu.

Để kiểm tra tích hợp trên PostgreSQL, đặt `LITE_TEST_DATABASE_URL` bằng URL `postgresql+psycopg://...` của **database kiểm thử riêng** trước khi chạy pytest. Fixture tạo schema ngẫu nhiên cho từng test rồi dọn schema đó; mặc định không đặt biến này sẽ dùng SQLite bộ nhớ. Các unittest migration/report kế thừa tự tạo SQLite vẫn chạy trên SQLite.

Xem [kịch bản demo](docs/demo-day1.md), [báo cáo ban đầu](docs/day1-results.md) và [kết quả kiểm chứng sau sửa lỗi](docs/day1-fixes.md).

## Nguồn kế thừa

Ứng dụng kế thừa mã từ [Expense-Management-Ai-Integration](https://github.com/daominhtam2k6/Expense-Management-Ai-Integration). Revision nguồn được ghi trong `docs/source.json`. Bản Lite thay đổi phạm vi sản phẩm và chuẩn bị bài triển khai; không nhận các kết quả kiểm thử/phê duyệt lịch sử của hệ thống đầy đủ làm bằng chứng cho bản này.
