# Kết quả ngày 1 — 07/10/2026

> Đây là kết quả kiểm thử ban đầu, trước lượt rà soát sâu. Trạng thái hiện tại và bằng chứng sau sửa lỗi nằm ở [day1-fixes.md](day1-fixes.md).

## Kết quả bàn giao

Bản độc lập tại `C:\Users\LENOVO\Expense_Management_AI_Lite`, có Git repository local riêng (chưa commit/push). Dự án gốc giữ nguyên; file báo cáo Word chưa được track có sẵn trong dự án gốc không bị tác động.

Giao diện giữ bốn trang: Tổng quan, Giao dịch, Danh mục và Báo cáo. Đăng ký/đăng nhập/đăng xuất hoạt động. API AI, ngân sách, mục tiêu, upload, hồ sơ nâng cao và reset mật khẩu không được đăng ký. Dashboard chỉ truy vấn giao dịch/danh mục; số dư tích lũy không trừ các khoản dành cho mục tiêu legacy.

Có `.env` riêng được tạo bằng script, database local mới, dữ liệu giả lập và venv/node_modules riêng. Những file runtime này được Git bỏ qua. Không sao chép `.env`, database hoặc uploads từ hệ thống đầy đủ.

## Kiểm chứng đã thực thi

Môi trường thực thi: Windows, Python 3.14.6, Node.js/npm cài trên máy hiện tại; trình duyệt Microsoft Edge headless qua Playwright. Dockerfile kế thừa dùng Python 3.13; chưa kiểm chứng container/Ubuntu ở ngày 1.

| Lệnh/kiểm tra | Kết quả |
|---|---|
| Cài backend vào `.venv` mới từ `requirements-dev.txt` | Thành công |
| `npm ci --no-audit --no-fund` | Thành công |
| `.venv\Scripts\python.exe -m pytest -q` | **24 passed**, 4 cảnh báo deprecation |
| `npm test` | **14 passed** |
| `npm run build` | TypeScript và Vite build thành công; tạo app shell/PWA |
| `python scripts/setup_local.py` | Tạo `.env` riêng; không xuất secret vào kết quả |
| `python -m alembic upgrade head` | Chạy cả ba revision trên SQLite mới thành công |
| `python -m alembic check` | `No new upgrade operations detected` |
| `python -m scripts.seed_demo` | Một tài khoản, bốn danh mục, chín giao dịch giả lập |
| Đăng nhập/đăng ký thật trên trình duyệt | Thành công |
| Tạo danh mục và giao dịch qua UI, xem báo cáo | Tổng chi tăng đúng 123.000 VND; dữ liệu kiểm tra được dọn sau đó |
| Điều hướng mobile, viewport 390 × 844 | Cả bốn trang truy cập được; không tràn chiều ngang tài liệu |
| Đăng xuất và mở lại route bảo vệ | Token Lite được xóa, quay lại đăng nhập |
| Tài khoản mới | Không nhìn thấy giao dịch tài khoản demo |
| Console/request failures trong browser journey | Không có |
| `/api/health`, `/api/ready` trên server local | HTTP 200 |
| Git ignore | `.env`, database, `.venv`, node_modules, dist, `.tmp` được bỏ qua |

Kiểm thử backend bao gồm CRUD, lọc, tổng hợp tiền, owner isolation ở cả đọc/ghi/báo cáo, đăng nhập sai, đầu vào lỗi, route đã bỏ, seed idempotent, migration và báo cáo kế thừa. Các ca chạy trên database SQLite cô lập có bật kiểm tra foreign key; không tác động database demo hoặc database gốc.

Các cảnh báo backend hiện tại là Pydantic class-based Config và cách dùng httpx của Starlette TestClient. Chúng không làm test thất bại; chưa nâng dependency hoặc đổi framework trong nhiệm vụ thu gọn ngày 1.

## Bằng chứng trình duyệt

- [Kết quả chi tiết](evidence/day1/browser-results.json)
- [Tổng quan desktop](evidence/day1/dashboard-desktop.png)
- [Tổng quan mobile](evidence/day1/dashboard-mobile.png)
- [Giao dịch desktop](evidence/day1/transactions-desktop.png)
- [Báo cáo desktop](evidence/day1/reports-desktop.png)
- [Báo cáo mobile](evidence/day1/reports-mobile.png)

Ảnh giao dịch/báo cáo desktop được chụp khi còn giao dịch thử 123.000 VND để chứng minh cập nhật số liệu. Sau kiểm tra, giao dịch, danh mục và tài khoản trình duyệt tạm đã được dọn; demo trở lại một user, bốn danh mục và chín giao dịch. Ảnh tổng quan phản ánh dữ liệu seed đã dọn.

## Phần tiếp theo

Ngày 2 tích hợp PostgreSQL + pgAdmin bằng Docker Compose trên Ubuntu VM và kiểm chứng lại trên PostgreSQL thật. Nginx, Prometheus/Grafana, Loki/Promtail, hardening đầy đủ và báo cáo môn học vẫn thuộc các ngày sau; kết quả ngày 1 không thay thế nghiệm thu các phần đó.
