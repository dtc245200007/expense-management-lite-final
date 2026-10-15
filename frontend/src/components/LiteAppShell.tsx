import { BarChart3, Grid2X2, LogOut, PiggyBank, ReceiptText, Tags, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Tổng quan", icon: Grid2X2 },
  { to: "/transactions", label: "Giao dịch", icon: ReceiptText },
  { to: "/categories", label: "Danh mục", icon: Tags },
  { to: "/reports", label: "Báo cáo", icon: BarChart3 },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>(".nav-item.is-active")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.setItem("auth_notice", "Bạn đã đăng xuất an toàn.");
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell app-shell--lite">
      <aside className="sidebar">
        <div className="brand"><span className="brand__mark"><PiggyBank size={22} /></span><span>Sổ Chi Tiêu Lite</span></div>
        <nav ref={navRef} className="primary-nav" aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}>
              <Icon size={21} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__account">
          <div className="account-card">
            <UserRound size={24} aria-hidden="true" />
            <span className="account-copy"><strong>{user?.username}</strong><small>{user?.email}</small></span>
          </div>
          <button type="button" className="logout-button" onClick={handleLogout}><LogOut size={20} /><span>Đăng xuất</span></button>
        </div>
        <div className="compact-account-actions">
          <button type="button" className="compact-logout" onClick={handleLogout} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={20} /></button>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
