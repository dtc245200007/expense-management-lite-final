import { PiggyBank, ReceiptText, ShieldCheck, Tags, BarChart3 } from "lucide-react";
import { Outlet } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";

const capabilities = [
  { icon: ReceiptText, title: "Ghi chép rõ ràng", copy: "Theo dõi các khoản thu và chi trong một nơi." },
  { icon: Tags, title: "Phân loại dễ dàng", copy: "Sắp xếp các khoản thu chi theo danh mục." },
  { icon: BarChart3, title: "Hiểu dòng tiền", copy: "Xem báo cáo thu chi theo tháng và danh mục." },
];

export function AuthLayout() {
  return (
    <div className="auth-shell">
      <section className="auth-brand-panel" aria-label="Giới thiệu Sổ Chi Tiêu">
        <div className="auth-brand"><span className="brand__mark"><PiggyBank size={22} /></span><strong>Sổ Chi Tiêu Lite</strong></div>
        <div className="auth-brand-copy">
          <h1>Tài chính rõ ràng bắt đầu từ những ghi chép nhỏ.</h1>
          <p>Một không gian riêng để bạn hiểu dòng tiền, theo dõi thu chi và xem báo cáo mỗi tháng.</p>
        </div>
        <div className="auth-capability-list">
          {capabilities.map(({ icon: Icon, title, copy }) => (
            <div className="auth-capability" key={title}>
              <span><Icon size={19} /></span>
              <div><strong>{title}</strong><p>{copy}</p></div>
            </div>
          ))}
        </div>
        <p className="auth-privacy-note"><ShieldCheck size={17} /> Dữ liệu được tách biệt theo từng tài khoản.</p>
      </section>

      <main className="auth-workspace">
        <div className="auth-theme"><ThemeToggle /></div>
        <div className="auth-form-frame"><Outlet /></div>
      </main>
    </div>
  );
}
