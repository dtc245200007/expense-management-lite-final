import { FormEvent, useState } from "react";
import { ArrowRight, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthNotice, PasswordField } from "../../components/auth/AuthFormControls";
import { api } from "../../lib/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLocaleLowerCase("vi");
    if (cleanUsername.length < 3) return setError("Tên đăng nhập phải có ít nhất 3 ký tự.");
    if (cleanUsername.normalize("NFKC").includes("@")) return setError("Tên đăng nhập không được chứa @. Email có ô nhập riêng.");
    if (password.length < 6) return setError("Mật khẩu phải có ít nhất 6 ký tự.");
    if (password.length > 1024) return setError("Mật khẩu không được vượt quá 1024 ký tự.");
    if (password !== confirmPassword) return setError("Mật khẩu xác nhận chưa khớp.");
    setSaving(true);
    setError("");
    try {
      await api.register({ username: cleanUsername, email: cleanEmail, password });
      navigate("/login", { replace: true, state: { notice: "Tạo tài khoản thành công. Bạn có thể đăng nhập ngay." } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo tài khoản. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="auth-form-section auth-form-section--register">
      <header className="auth-form-header"><span className="auth-form-icon"><UserPlus size={21} /></span><h2>Tạo tài khoản</h2><p>Bắt đầu xây dựng một bức tranh tài chính rõ ràng hơn.</p></header>
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field" htmlFor="register-username"><span>Tên đăng nhập</span><input id="register-username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={50} autoFocus required disabled={saving} placeholder="Tối thiểu 3 ký tự" /></label>
        <label className="auth-field" htmlFor="register-email"><span>Email</span><input id="register-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={saving} placeholder="ban@email.com" /><small>Bạn có thể dùng email này để đăng nhập.</small></label>
        <PasswordField id="register-password" label="Mật khẩu" value={password} onChange={(event) => setPassword(event.target.value)} visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} autoComplete="new-password" disabled={saving} hint="Sử dụng ít nhất 6 ký tự." />
        <PasswordField id="register-confirm-password" label="Xác nhận mật khẩu" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} visible={confirmVisible} onToggle={() => setConfirmVisible((value) => !value)} autoComplete="new-password" disabled={saving} />
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <button className="button button--primary auth-submit" type="submit" disabled={saving}>{saving ? "Đang tạo tài khoản…" : <><span>Tạo tài khoản</span><ArrowRight size={18} /></>}</button>
      </form>
      <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </section>
  );
}
