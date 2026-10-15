import { getCategoryIcon } from "../lib/categoryIcons";
import type { Category } from "../types";

export function CategoryAvatar({ category, size = "md" }: { category: Category; size?: "sm" | "md" | "lg" }) {
  const Icon = getCategoryIcon(category.icon, category.type);
  return (
    <span
      className={`category-avatar category-avatar--${size}`}
      style={{ "--category-color": category.color } as React.CSSProperties}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}
