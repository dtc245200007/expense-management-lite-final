import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import type { ChangeEventHandler, ReactNode } from "react";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  disabled?: boolean;
  hint?: string;
  labelAction?: ReactNode;
}

export function PasswordField({ id, label, value, onChange, visible, onToggle, autoComplete, disabled, hint, labelAction }: PasswordFieldProps) {
  return (
    <div className="auth-field">
      <div className="auth-field-heading"><label htmlFor={id}>{label}</label>{labelAction}</div>
      <div className="auth-password-control">
        <input id={id} name={id} type={visible ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} minLength={6} required disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} />
        <button type="button" onClick={onToggle} aria-label={visible ? `Ẩn ${label.toLocaleLowerCase("vi")}` : `Hiện ${label.toLocaleLowerCase("vi")}`} aria-pressed={visible} disabled={disabled}>
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}

export function AuthNotice({ children, tone = "success" }: { children: string; tone?: "success" | "error" }) {
  return <div className={`auth-notice auth-notice--${tone}`} role={tone === "error" ? "alert" : "status"}>{tone === "success" && <CheckCircle2 size={18} />}{children}</div>;
}
