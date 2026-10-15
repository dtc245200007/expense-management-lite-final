import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="theme-toggle" role="group" aria-label="Chế độ hiển thị">
      <button
        type="button"
        className={theme === "light" ? "is-active" : ""}
        onClick={() => setTheme("light")}
        aria-label="Dùng giao diện sáng"
        aria-pressed={theme === "light"}
      >
        <Sun size={18} />
      </button>
      <button
        type="button"
        className={theme === "dark" ? "is-active" : ""}
        onClick={() => setTheme("dark")}
        aria-label="Dùng giao diện tối"
        aria-pressed={theme === "dark"}
      >
        <Moon size={18} />
      </button>
    </div>
  );
}
