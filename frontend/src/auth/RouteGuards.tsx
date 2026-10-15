import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PiggyBank } from "lucide-react";
import { useAuth } from "./AuthContext";

function SessionLoading() {
  return (
    <main className="session-loading" aria-live="polite" aria-busy="true">
      <span><PiggyBank size={24} /></span>
      <p>Đang kiểm tra phiên truy cập…</p>
    </main>
  );
}

function SessionUnavailable() {
  const { sessionError, retrySession, logout } = useAuth();
  return <main className="session-loading"><section role="alert">
    <p>{sessionError}</p>
    <button className="button button--primary" type="button" onClick={retrySession}>Thử lại</button>
    <button className="button button--secondary" type="button" onClick={logout}>Đăng xuất</button>
  </section></main>;
}

export function ProtectedRoute() {
  const { user, loading, sessionError } = useAuth();
  const location = useLocation();
  if (loading) return <SessionLoading />;
  if (sessionError) return <SessionUnavailable />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet key={user.id} />;
}

export function PublicOnlyRoute() {
  const { user, loading, sessionError } = useAuth();
  if (loading) return <SessionLoading />;
  if (sessionError) return <SessionUnavailable />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
