import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { SidePanel } from "../components/SidePanel";
import { ThemeToggle } from "../components/ThemeToggle";
import { api } from "../lib/api";
import { categoryIconOptions } from "../lib/categoryIcons";
import type { Category, CategoryIconKey, CategoryPayload, CategoryType } from "../types";

const palette = ["#f04438", "#1785e5", "#f5a800", "#0da86c", "#7757e8", "#27aeb1", "#f97342", "#9b6b56", "#ec4899", "#7c8798"];
const blankForm: CategoryPayload = { name: "", type: "expense", color: palette[0], icon: "wallet" };
const iconGroups = ["Phổ biến", "Hằng ngày", "Mục tiêu", "Thu nhập & tiết kiệm"] as const;

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [iconQuery, setIconQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryPayload>(blankForm);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    api.listCategories(controller.signal)
      .then(setCategories)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setLoadError(cause instanceof Error ? cause.message : "Không thể tải danh mục.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return normalized ? categories.filter((category) => category.name.toLocaleLowerCase("vi").includes(normalized)) : categories;
  }, [categories, query]);

  const expense = visible.filter((category) => category.type === "expense");
  const income = visible.filter((category) => category.type === "income");
  const visibleIcons = useMemo(() => {
    const normalized = iconQuery.trim().toLocaleLowerCase("vi");
    return normalized
      ? categoryIconOptions.filter((option) => option.label.toLocaleLowerCase("vi").includes(normalized))
      : categoryIconOptions;
  }, [iconQuery]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setIconQuery("");
    setFormError("");
    setActionError("");
    setPanelOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({ name: category.name, type: category.type, color: category.color, icon: category.icon });
    setIconQuery("");
    setFormError("");
    setActionError("");
    setMenuId(null);
    setPanelOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return setFormError("Hãy nhập tên danh mục.");

    const duplicate = categories.some((item) =>
      item.id !== editing?.id
      && item.type === form.type
      && item.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"));
    if (duplicate) return setFormError("Danh mục này đã tồn tại. Hãy chọn một tên khác.");

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        const updated = await api.updateCategory(editing.id, { name, color: form.color, icon: form.icon });
        setCategories((items) => items.map((item) => item.id === editing.id ? { ...item, ...updated } : item));
      } else {
        const created = await api.createCategory({ ...form, name });
        setCategories((items) => [...items, created]);
      }
      setPanelOpen(false);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Không thể lưu danh mục.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: Category) => {
    setMenuId(null);
    setActionError("");
    if (!window.confirm(`Xóa danh mục “${category.name}”? Hành động này không thể hoàn tác.`)) return;
    try {
      await api.deleteCategory(category.id);
      setCategories((items) => items.filter((item) => item.id !== category.id));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể xóa danh mục.");
    }
  };

  return (
    <div className="page categories-page">
      <header className="page-header">
        <div><h1>Danh mục</h1><p>Tổ chức các khoản thu và chi theo cách của bạn</p></div>
        <div className="header-actions"><ThemeToggle /><button className="button button--primary" type="button" onClick={openCreate} disabled={loading || Boolean(loadError)}><Plus size={19} /> Thêm danh mục</button></div>
      </header>

      <div className="toolbar-row">
        <label className="search-field"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm danh mục" aria-label="Tìm kiếm danh mục" disabled={loading || Boolean(loadError)} /></label>
        <span className="result-count">{loading ? "Đang tải…" : `${visible.length} danh mục`}</span>
      </div>

      {actionError && <div className="inline-alert" role="alert">{actionError}</div>}

      {loadError ? (
        <DataLoadError title="Chưa tải được danh mục" description={loadError} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : loading ? (
        <div className="category-columns" aria-label="Đang tải danh mục" aria-busy="true">
          <div className="surface skeleton-block" /><div className="surface skeleton-block" />
        </div>
      ) : (
        <div className="category-columns">
          <CategoryGroup title="Chi tiêu" type="expense" categories={expense} menuId={menuId} setMenuId={setMenuId} onEdit={openEdit} onDelete={remove} onCreate={openCreate} />
          <CategoryGroup title="Thu nhập" type="income" categories={income} menuId={menuId} setMenuId={setMenuId} onEdit={openEdit} onDelete={remove} onCreate={openCreate} />
        </div>
      )}

      <SidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
        description={editing ? "Loại danh mục được giữ cố định để bảo toàn dữ liệu cũ." : undefined}
        footer={<><button className="button button--secondary" type="button" onClick={() => setPanelOpen(false)}>Hủy</button><button className="button button--primary" type="submit" form="category-form" disabled={saving}>{saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo danh mục"}</button></>}
      >
        <form id="category-form" className="form-stack" onSubmit={submit}>
          <label className="field"><span>Tên danh mục</span><input data-panel-initial-focus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Chăm sóc thú cưng" /></label>
          <fieldset className="field" disabled={Boolean(editing)}>
            <legend>Loại danh mục</legend>
            <div className="segmented-control">
              <button type="button" className={form.type === "expense" ? "is-active is-expense" : ""} onClick={() => setForm((current) => ({ ...current, type: "expense" as CategoryType }))}><ArrowDownToLine size={18} /> Chi tiêu</button>
              <button type="button" className={form.type === "income" ? "is-active is-income" : ""} onClick={() => setForm((current) => ({ ...current, type: "income" as CategoryType }))}><ArrowUpFromLine size={18} /> Thu nhập</button>
            </div>
            {editing && <small>Không thể đổi loại sau khi danh mục đã được tạo.</small>}
          </fieldset>
          <fieldset className="field icon-picker-field">
            <legend>Biểu tượng</legend>
            <label className="icon-search-field">
              <Search size={17} aria-hidden="true" />
              <input value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} placeholder="Tìm biểu tượng" aria-label="Tìm biểu tượng danh mục" />
            </label>
            <div className="icon-picker" role="radiogroup" aria-label="Chọn biểu tượng danh mục">
              {iconGroups.map((group) => {
                const options = visibleIcons.filter((option) => option.group === group);
                if (options.length === 0) return null;
                return (
                  <section className="icon-picker__group" key={group}>
                    <h3>{group}</h3>
                    <div className="icon-options">
                      {options.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={form.icon === key}
                          className={form.icon === key ? "is-active" : ""}
                          onClick={() => setForm((current) => ({ ...current, icon: key as CategoryIconKey }))}
                          title={label}
                          aria-label={label}
                        >
                          <Icon size={20} />
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
              {visibleIcons.length === 0 && <p className="icon-picker__empty">Không tìm thấy biểu tượng phù hợp.</p>}
            </div>
          </fieldset>
          <fieldset className="field color-field"><legend>Màu sắc</legend><div className="color-options">{palette.map((color) => <button key={color} type="button" className={form.color === color ? "is-active" : ""} style={{ backgroundColor: color }} onClick={() => setForm((current) => ({ ...current, color }))} aria-label={`Chọn màu ${color}`}><span /></button>)}</div></fieldset>
          {formError && <div className="form-error" role="alert">{formError}</div>}
        </form>
      </SidePanel>
    </div>
  );
}

interface CategoryGroupProps {
  title: string;
  type: CategoryType;
  categories: Category[];
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onCreate: () => void;
}

function CategoryGroup({ title, type, categories, menuId, setMenuId, onEdit, onDelete, onCreate }: CategoryGroupProps) {
  const HeaderIcon = type === "expense" ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <section className="surface category-group">
      <div className="category-group__header"><span className={`group-icon group-icon--${type}`}><HeaderIcon size={19} /></span><h2>{title} <small>· {categories.length}</small></h2></div>
      {categories.length === 0 ? (
        <div className="empty-state"><p>Chưa có danh mục {title.toLocaleLowerCase("vi")}.</p><button className="text-button" type="button" onClick={onCreate}><Plus size={17} /> Thêm danh mục</button></div>
      ) : (
        <div className="category-list">
          {categories.map((category) => (
            <div className="category-row" key={category.id}>
              <CategoryAvatar category={category} />
              <div className="category-row__copy"><strong>{category.name}</strong><small>{category.type === "expense" ? "Danh mục chi" : "Danh mục thu"}</small></div>
              <div className="row-menu-wrap">
                <button className="icon-button" type="button" onClick={() => setMenuId(menuId === category.id ? null : category.id)} aria-label={`Thao tác với ${category.name}`} aria-expanded={menuId === category.id}><MoreHorizontal size={20} /></button>
                {menuId === category.id && <div className="row-menu"><button type="button" onClick={() => onEdit(category)}><Pencil size={16} /> Chỉnh sửa</button><button type="button" className="danger" onClick={() => onDelete(category)}><Trash2 size={16} /> Xóa danh mục</button></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DataLoadError({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <section className="surface data-load-state" role="alert">
      <span><AlertCircle size={25} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="button button--primary" type="button" onClick={onRetry}><RefreshCw size={17} /> Thử lại</button>
    </section>
  );
}
