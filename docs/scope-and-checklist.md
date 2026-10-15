# Phạm vi và checklist nghiệm thu

Nguồn: ĐỀTÀITHỰCHÀNH.docx, đề 38; quyết định người dùng ngày 07/10/2026 trong hội thoại. Mệnh lệnh/bài tập minh họa trong bài giảng được xem là tài liệu tham khảo; không tự bổ sung thành yêu cầu bắt buộc của đồ án.

## Phạm vi Lite được đồng ý

| ID | Chức năng | Tiêu chí nghiệm thu ngày 1 |
|---|---|---|
| LITE-AUTH | Đăng ký, đăng nhập, đăng xuất | Đăng ký được; mật khẩu sai bị từ chối; route bảo vệ yêu cầu đăng nhập; đăng xuất xóa phiên trên trình duyệt |
| LITE-CAT | Danh mục thu/chi | Tạo, sửa, xóa được danh mục phù hợp; chặn trùng; danh mục có giao dịch được bảo vệ khi xóa |
| LITE-TXN | Giao dịch | Tạo, sửa, xóa; lọc theo loại, danh mục, ngày, từ khóa; số tiền dương; chặn ngày tương lai |
| LITE-REPORT | Tổng quan và báo cáo | Tổng thu/chi/chênh lệch đúng; phân nhóm theo danh mục; xem báo cáo tháng và so sánh tháng trước |
| LITE-OWNER | Phân tách tài khoản | Không đọc/sửa/xóa dữ liệu tài khoản khác; tổng hợp luôn theo owner |
| LITE-SEED | Dữ liệu giả lập | Có script tạo mẫu; không đọc database gốc; chạy lại cùng tháng không nhân đôi |

Quy tắc được chốt khi sửa lỗi ngày 1: tiền VND tối đa hai chữ số thập phân, từ 0,01 đến 999.999.999.999,99; từ chối precision/range sai. Danh mục không đổi loại sau khi tạo. Ngày nghiệp vụ theo `Asia/Ho_Chi_Minh`. Đổi token ở tab khác phải tải lại đúng tài khoản và bỏ dữ liệu phiên cũ; lỗi mạng/5xx khi khôi phục phiên giữ token để thử lại. Seed giữ nguyên tháng đã có fixture, kể cả khi chạy tháng khác hoặc đảo thứ tự. Xem [ma trận sửa lỗi và kiểm chứng](day1-fixes.md).

Không cung cấp AI/Gemini, ngân sách, mục tiêu, avatar/upload, chỉnh sửa hồ sơ nâng cao, xóa tài khoản hoặc đặt lại mật khẩu qua email. Giữ ORM/migration legacy để hạn chế thay đổi schema; dashboard Lite không truy vấn ngân sách, mục tiêu hoặc AI. Số dư tích lũy bằng tổng thu trừ tổng chi đến hết tháng được chọn.

Đăng xuất dùng cơ chế token stateless kế thừa: xóa token phía trình duyệt; không có endpoint thu hồi JWT. Token đã phát vẫn có hiệu lực đến hạn nếu còn được giữ ở nơi khác.

## Yêu cầu bài nộp

Các ô bên dưới chỉ được đánh dấu sau khi có bằng chứng thực thi. Đây là checklist cho toàn bộ 10 ngày, không phải tuyên bố hoàn tất ngày 1.

- [ ] COURSE-01: GitHub, tài khoản đặt theo MSSV, mã nguồn/cấu hình, commit rõ ràng, README.
- [ ] COURSE-02: Website Lite chạy với PostgreSQL; pgAdmin kết nối và quản trị dữ liệu mẫu.
- [ ] COURSE-03: Nginx reverse proxy; HTTPS tự ký hoặc security headers cơ bản; mốc commit 1. Phương án đã chọn thực hiện cả HTTPS và headers.
- [ ] COURSE-04: Prometheus + Grafana giám sát container, web server và database; mốc commit 2.
- [ ] COURSE-05: Loki + Promtail thu log tập trung; ít nhất 2–3 LogQL query; phương án chọn ba query; mốc commit 3.
- [ ] COURSE-06: Hardening có bằng chứng: non-root, network isolation, mật khẩu mạnh, hạn chế quyền, headers.
- [ ] COURSE-07: Báo cáo tối thiểu 10 trang, bìa có thông tin sinh viên/chủ đề, kiến trúc, hoạt động và kết quả sáu bước có hình minh họa.
- [ ] COURSE-08: Toàn bộ dịch vụ triển khai bằng Docker Compose; demo website, DB tool, Grafana, LogQL và hardening.

Promtail được giữ theo đề trong lab; không tự thay bằng Alloy. Backup/restore và cảnh báo bổ sung chỉ được ưu tiên sau phần bắt buộc.
