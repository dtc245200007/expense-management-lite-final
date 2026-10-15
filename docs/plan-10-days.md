# Kế hoạch 10 ngày

Mốc lập kế hoạch: 07/10/2026. Ngày 1–10 là ngày làm việc của kế hoạch; hạn nộp chính xác chưa được cung cấp. Môi trường demo: Ubuntu VM trên VMware Workstation Pro.

| Ngày | Công việc | Đầu ra |
|---|---|---|
| 1 | Tách thư mục, thu gọn web/API, seed và kiểm chứng | Ứng dụng Lite local, README, phạm vi, kết quả kiểm tra |
| 2 | Ubuntu VM, Compose, PostgreSQL, pgAdmin | Stack nền, volume và kiểm tra PostgreSQL thực tế |
| 3 | Nginx, HTTPS tự ký, headers | Truy cập qua proxy; mốc commit 1 |
| 4–5 | Prometheus, cAdvisor, Nginx/PostgreSQL exporters, Grafana | Targets và dashboard có dữ liệu; mốc commit 2 |
| 6 | Loki, Promtail, nhãn log, ba truy vấn | Log thực tế và truy vấn có kết quả; mốc commit 3 |
| 7 | Hoàn thiện hardening | Kiểm tra UID, mạng, cổng, quyền database, secrets |
| 8 | Kiểm tra tích hợp, dựng lại, mô phỏng sự cố | README tái lập được; phục hồi dịch vụ |
| 9 | Báo cáo, hình minh họa, diễn tập | Báo cáo đủ yêu cầu và kịch bản demo |
| 10 | Dự phòng và tổng duyệt | Phiên bản nộp và bằng chứng cuối |

Hardening cơ bản và thu thập bằng chứng thực hiện xuyên suốt. Các mốc commit là mốc yêu cầu trong đề; không giới hạn số commit nhỏ giữa các mốc. Việc tạo folder ngày 1 không tự cho phép commit/push hoặc tạo tài khoản GitHub thay người dùng.
