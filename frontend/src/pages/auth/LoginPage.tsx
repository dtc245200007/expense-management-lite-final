import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LogIn } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AuthNotice, PasswordField } from "../../components/auth/AuthFormControls";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeNotice = (location.state as { notice?: string } | null)?.notice;
  const [notice] = useState(() => routeNotice ?? sessionStorage.getItem("auth_notice") ?? "");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sessionStorage.removeItem("auth_notice");
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) return setError("Hãy nhập tên đăng nhập hoặc email.");
    setSaving(true);
    setError("");
    try {
      await login(identifier.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="auth-form-section">
      <header className="auth-form-header"><span className="auth-form-icon"><LogIn size={21} /></span><h2>Chào mừng bạn trở lại</h2><p>Đăng nhập để tiếp tục theo dõi tài chính của bạn.</p></header>
      {notice && <AuthNotice>{notice}</AuthNotice>}
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field" htmlFor="identifier"><span>Tên đăng nhập hoặc email</span><input id="identifier" name="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" autoFocus required disabled={saving} placeholder="minh hoặc minh@email.com" /></label>
        <PasswordField id="login-password" label="Mật khẩu" value={password} onChange={(event) => setPassword(event.target.value)} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} autoComplete="current-password" disabled={saving} />
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <button className="button button--primary auth-submit" type="submit" disabled={saving}>{saving ? "Đang đăng nhập…" : <><span>Đăng nhập</span><ArrowRight size={18} /></>}</button>
      </form>
      <p className="auth-switch">Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>
    </section>
  );
}
