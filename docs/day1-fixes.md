# Kết quả sửa lỗi và chốt ngày 1 — 07/10/2026

**Kết luận: ứng dụng Lite đủ điều kiện chuyển sang ngày 2.** Đã xử lý 13 phát hiện trong lượt rà soát và một lỗi focus mobile phát hiện khi kiểm tra lại. Kết luận này áp dụng cho nền tảng ứng dụng và image Docker; stack Compose/pgAdmin trên Ubuntu VM vẫn là công việc ngày 2.

## Hành vi sau sửa

- Tiền được giữ đến hai chữ số thập phân xuyên suốt nhập, sửa, API và database. Khoảng hợp lệ: 0,01–999.999.999.999,99 VND. Nhập sai precision/range trả lỗi validation; không âm thầm làm tròn hoặc gây 500. Ô nhập dùng số không phân nhóm, cho phép dấu phẩy hoặc dấu chấm làm dấu thập phân.
- Phiên đăng nhập đổi ở tab khác làm mất trạng thái dữ liệu cũ và tải lại đúng người dùng. API client chặn ghi nếu token đã đổi trước khi storage event được xử lý. Lỗi mạng/5xx khi kiểm tra phiên giữ token và cho thử lại; token không hợp lệ mới bị xóa.
- Mật khẩu mới dùng bcrypt-sha256 để không bị cắt ở 72 byte; hỗ trợ 6–1024 ký tự. Tài khoản bcrypt cũ có mật khẩu dưới 72 byte được đổi hash khi đăng nhập thành công. Bcrypt cũ từ 72 byte trở lên bị từ chối vì không thể biết nội dung đã bị cắt; không tự suy ra hoặc thay mật khẩu người dùng. Demo hiện tại đã đăng nhập được bằng mật khẩu cũ.
- Username mới không chứa `@`. Với dữ liệu cũ nhập nhằng, đăng nhập bằng email chọn đúng chủ sở hữu email; tài khoản có username chứa `@` vẫn có thể dùng email riêng của mình.
- API khóa loại danh mục sau khi tạo, phân biệt trường không gửi với trường null. Note vẫn có thể xóa bằng null.
- Seed giữ nguyên tháng đã có fixture, kể cả chuyển tháng/chuyển năm, chạy đảo thứ tự và gặp ID phiên bản trước; không sửa giao dịch người dùng. Kiểm tra cả định danh và email demo trước khi ghi. Image chứa script seed.
- Ngày nghiệp vụ trên frontend/backend luôn theo `Asia/Ho_Chi_Minh`; frontend cập nhật giới hạn ngày khi cửa sổ được focus, đổi trạng thái hiển thị hoặc qua bộ đếm thời gian.
- Bảng nhập mobile không giành lại focus nếu người dùng đã chọn một trường trong bảng.

## Ma trận lỗi → sửa → bằng chứng

| ID | Phát hiện | Sửa và kiểm chứng | Trạng thái |
|---|---|---|---|
| F01 | Sửa 1,23 thành 123 | Input/parser giữ phần thập phân; test thao tác sửa và browser desktop/mobile | PASS |
| F02 | Tab A ghi theo token B | Đồng bộ phiên, bỏ dữ liệu cũ, guard trước request và bỏ phản hồi cũ; test race + hai tab thật | PASS |
| F03 | Bcrypt bỏ suffix mật khẩu | Bcrypt-sha256 mới, chuyển hash cũ hợp lệ, chặn ranh giới bcrypt cũ; test ASCII/Unicode và suffix sai | PASS |
| F04 | Precision/range tiền không khớp DB | Validation create/update theo Numeric(14,2); ca 0,001, 1,235, vượt max và max hợp lệ trên SQLite/PostgreSQL | PASS |
| F05 | Null gây 500/thông báo sai | Null ở trường bắt buộc trả 422, dữ liệu không đổi; note null vẫn được chấp nhận | PASS |
| F06 | Đổi loại danh mục gây lệch thu/chi | API từ chối đổi loại cả danh mục trống và có giao dịch; sửa tên vẫn hoạt động | PASS |
| F07 | Username/email xung đột | Tách namespace cho tài khoản mới, đăng nhập email xác định rõ owner với dữ liệu cũ | PASS |
| F08 | Seed tháng mới nhân đôi tháng cũ | ID theo kỳ dữ liệu, giữ nguyên fixture tháng đã có; test thứ tự xuôi/ngược/chuyển năm/ID cũ | PASS |
| F09 | Container thiếu script seed | COPY scripts và bỏ exclusion; thực thi CLI seed hai lần và qua tháng trong container | PASS |
| F10 | UTC và ngày Việt Nam lệch nhau | Clock nghiệp vụ chung; kiểm thử ranh giới ngày/tháng/năm với clock cố định, cả trong image | PASS |
| F11 | 503 làm mất token | Màn hình lỗi khôi phục phiên có Thử lại; test mạng/503 giữ token, 401 xóa token | PASS |
| F12 | Coverage không đạt | Test hành vi API client, session, CRUD/filter/report và tiền; giữ nguyên mọi threshold | PASS |
| F13 | Seed va chạm email báo IntegrityError | Preflight username/email/fixture ID, trả ValueError có giải thích, không ghi dở dang | PASS |
| F14 | Timer đặt focus đè thao tác người dùng | Bỏ autofocus nếu focus đã ở trong panel; regression test và browser mobile | PASS |

Test chính: [backend regression](../tests/test_day1_regressions.py), [fixture SQLite/PostgreSQL](../tests/conftest.py), [API client](../frontend/src/lib/api.test.ts), [session](../frontend/src/auth/AuthContext.test.tsx), [các trang Lite](../frontend/src/pages/LitePages.test.tsx), [tiền/ngày](../frontend/src/lib/format.test.ts), [focus panel](../frontend/src/components/SidePanel.test.tsx).

## Kết quả kiểm chứng cuối

Môi trường host: Windows, Python 3.14.6, Node 24.8.0, Microsoft Edge headless qua Playwright. Môi trường container: Linux, Python 3.13.16, frontend build bằng Node 24; PostgreSQL 16. Mỗi phép thử dùng dữ liệu giả lập và schema/database riêng.

| Kiểm tra | Kết quả |
|---|---|
| `python -m pytest -q`, fixture SQLite | **56 passed**, 0 fail/error/skip; 41,80 giây |
| Cùng suite với `LITE_TEST_DATABASE_URL` trỏ PostgreSQL riêng | **56 passed**, 0 fail/error/skip; 57,65 giây |
| `npm test -- --coverage` | **65 passed**, 6 test files; exit 0 |
| Statements / branches / functions / lines | **92,73% / 79,81% / 91,16% / 96,89%** |
| Ngưỡng coverage giữ nguyên | 60% / 45% / 55% / 65%; tất cả đạt |
| `npm run build` và `docker build` | PASS, bao gồm TypeScript kiểm tra cả test source |
| Alembic upgrade cả ba revision trên PostgreSQL mới | PASS |
| Alembic check trên PostgreSQL và SQLite local | PASS, không có thay đổi schema cần migration |
| API trên image cuối + PostgreSQL | **19 kiểm tra đạt**: auth, tiền, null, loại danh mục, namespace, bcrypt cũ và ngày Việt Nam |
| Trình duyệt trên image cuối + PostgreSQL | **8 nhóm đạt**, không có JavaScript page error |
| Health, ready, frontend và client route trong image | HTTP 200; runtime UID 1000 |
| Browser local sau khởi động lại | Demo đăng nhập được; 4 danh mục, 9 giao dịch; thu 15.000.000, chi 3.595.000 |

Khi đặt `LITE_TEST_DATABASE_URL`, fixture tích hợp tạo schema PostgreSQL ngẫu nhiên cho từng test và dọn schema sau test. Các unittest migration/report kế thừa tự tạo SQLite vẫn sử dụng SQLite; không xem toàn bộ 56 ca là 56 ca PostgreSQL. Migration PostgreSQL mới và 19 kiểm tra API/browser trong container được chạy riêng để kiểm chứng phần này.

Lượt kiểm tra mobile từng phát hiện lỗi focus F14 dù một lượt trước đã đạt. Sau khi sửa nguyên nhân và thêm hai test focus, bộ frontend, Docker build và browser trên container mới đã chạy lại đạt. Không dùng retry để che lỗi chưa sửa.

Một lượt kiểm tra bị gián đoạn do dọn container quá sớm và không được tính là PASS. Quy trình cuối chạy tuần tự, đợi browser/API hoàn tất rồi mới đóng gói bằng chứng và dọn tài nguyên; [nhật ký các bước cuối](evidence/day1-fixes/docker-steps.json) ghi exit code 0 cho tất cả bước.

## Bằng chứng có thể kiểm tra

- [Tổng hợp môi trường, số test, coverage và image ID](evidence/day1-fixes/verification-summary.json).
- [JUnit SQLite](evidence/day1-fixes/pytest-sqlite.xml), [JUnit khi bật fixture PostgreSQL](evidence/day1-fixes/pytest-postgres.xml).
- [Frontend tests và coverage](evidence/day1-fixes/frontend-tests.txt), [coverage JSON](evidence/day1-fixes/coverage-summary.json).
- [Docker build](evidence/day1-fixes/docker-build.txt), [migration/health/non-root/seed module](evidence/day1-fixes/docker-results.json), [19 kiểm tra API](evidence/day1-fixes/api-docker-results.json).
- [8 nhóm browser](evidence/day1-fixes/browser-results.json), [browser local](evidence/day1-fixes/local-results.json).
- [Tổng quan desktop](evidence/day1-fixes/dashboard-desktop.png), [tổng quan mobile](evidence/day1-fixes/dashboard-mobile.png), [giao dịch mobile](evidence/day1-fixes/transactions-mobile.png).
- [SHA-256 mã nguồn đã kiểm chứng](evidence/day1-fixes/source-sha256.json), [dọn tài nguyên kiểm thử](evidence/day1-fixes/cleanup.json).
- [Kiểm tra liên kết tài liệu, secret và mã nguồn khớp bằng chứng](evidence/day1-fixes/handoff-checks.json).

Image đã kiểm chứng được giữ local với tag `expense-lite-day1-fixed:local`; SHA-256 cụ thể nằm trong verification-summary. Container và database audit tạm được dọn; không đưa credential/token hoặc .env thật vào bộ bằng chứng. Dự án đầy đủ gốc được giữ nguyên. Chưa commit/push hoặc triển khai lên VM.

## Phần tiếp theo và giới hạn

Ngày 2: dựng Compose trên Ubuntu VMware, cấu hình PostgreSQL + pgAdmin, volume, biến môi trường và kiểm tra khởi động lại/tái lập stack. Nginx, monitoring/logging, hardening toàn stack và báo cáo môn học vẫn theo kế hoạch 10 ngày.

Backend còn bốn cảnh báo deprecation về Pydantic Config và TestClient/httpx, không làm test thất bại. Chưa chạy trên Ubuntu VM thực tế, kiểm thử tải diện rộng hoặc kiểm tra bảo mật chuyên sâu toàn bộ dependency. Việc chốt ngày 1 không phải cam kết tuyệt đối không còn lỗi ẩn hay xác nhận đã hoàn tất bài nộp.
