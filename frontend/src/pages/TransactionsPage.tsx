import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { SidePanel } from "../components/SidePanel";
import { ThemeToggle } from "../components/ThemeToggle";
import { api } from "../lib/api";
import { formatCurrency, moneyInputValue, parseMoneyInput } from "../lib/format";
import { businessDateValue, monthChoices, useBusinessDate } from "../lib/dates";
import type { Category, CategoryType, Transaction, TransactionPayload } from "../types";

type TransactionTypeFilter = "all" | CategoryType;

interface TransactionFormState {
  type: CategoryType;
  category_id: string;
  amount: string;
  txn_date: string;
  note: string;
}

interface TransactionFilterState {
  query: string;
  type: TransactionTypeFilter;
  category_id: string;
  from_date: string;
  to_date: string;
}

const TRANSACTIONS_PER_PAGE = 7;

function toDateValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  return {
    start: `${period}-01`,
    end: toDateValue(new Date(year, month, 0)),
  };
}

function defaultTransactionDate(period: string) {
  const todayValue = businessDateValue();
  const { start, end } = periodBounds(period);
  return todayValue >= start && todayValue <= end ? todayValue : end;
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function dayHeading(value: string) {
  const todayValue = businessDateValue();
  const date = new Date(`${value}T00:00:00Z`);
  const yesterday = new Date(`${todayValue}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const suffix = `${value.slice(8)}/${value.slice(5, 7)}`;
  if (value === todayValue) return `Hôm nay · ${suffix}`;
  if (value === yesterday.toISOString().slice(0, 10)) return `Hôm qua · ${suffix}`;
  const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: "UTC" }).format(date);
  return `${weekday.charAt(0).toLocaleUpperCase("vi")}${weekday.slice(1)} · ${suffix}`;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function TransactionsPage() {
  const todayValue = useBusinessDate();
  const currentPeriod = todayValue.slice(0, 7);
  const monthOptions = monthChoices(todayValue, 24);
  const [searchParams] = useSearchParams();
  const requestedPeriod = searchParams.get("period");
  const initialPeriod = requestedPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedPeriod) ? requestedPeriod : currentPeriod;
  const requestedType = searchParams.get("type");
  const initialType: TransactionTypeFilter = requestedType === "income" || requestedType === "expense" ? requestedType : "all";
  const initialCategoryId = searchParams.get("category_id") ?? "";
  const [period, setPeriod] = useState(initialPeriod);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState<TransactionFormState>({
    type: "expense",
    category_id: "",
    amount: "",
    txn_date: defaultTransactionDate(initialPeriod),
    note: "",
  });
  const [filters, setFilters] = useState<TransactionFilterState>(() => {
    const bounds = periodBounds(initialPeriod);
    return { query: "", type: initialType, category_id: initialCategoryId, from_date: bounds.start, to_date: bounds.end };
  });
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const bounds = useMemo(() => periodBounds(period), [period]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setActionError("");
    Promise.all([
      api.listCategories(controller.signal),
      api.listTransactions({ from_date: bounds.start, to_date: bounds.end }, controller.signal),
    ])
      .then(([categoryData, transactionData]) => {
        setCategories(categoryData);
        setTransactions(transactionData);
        setForm((current) => {
          const currentCategory = categoryData.find((category) => category.id === current.category_id);
          if (currentCategory) return current;
          const preferred = categoryData.find((category) => category.type === current.type) ?? categoryData[0];
          return preferred ? { ...current, type: preferred.type, category_id: preferred.id } : { ...current, category_id: "" };
        });
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setLoadError(cause instanceof Error ? cause.message : "Không thể tải giao dịch.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [bounds.end, bounds.start, reloadKey]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (isMobile) return;
    setMobileFormOpen(false);
    setMobileFiltersOpen(false);
  }, [isMobile]);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const typeCategories = categories.filter((category) => category.type === form.type);
  const selectedCategory = categoryMap.get(form.category_id);

  const summary = useMemo(() => {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, net: income - expense };
  }, [transactions]);

  const visibleTransactions = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase("vi");
    return transactions
      .filter((transaction) => {
        const category = categoryMap.get(transaction.category_id);
        const matchesQuery = !query
          || (transaction.note ?? "").toLocaleLowerCase("vi").includes(query)
          || (category?.name ?? "").toLocaleLowerCase("vi").includes(query);
        return matchesQuery
          && (filters.type === "all" || transaction.type === filters.type)
          && (!filters.category_id || transaction.category_id === filters.category_id)
          && transaction.txn_date >= filters.from_date
          && transaction.txn_date <= filters.to_date;
      })
      .sort((a, b) => b.txn_date.localeCompare(a.txn_date) || b.id.localeCompare(a.id));
  }, [categoryMap, filters, transactions]);

  const totalPages = Math.max(1, Math.ceil(visibleTransactions.length / TRANSACTIONS_PER_PAGE));
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1) as Array<number | "ellipsis">;
    const pages = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]))
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
    const items: Array<number | "ellipsis"> = [];
    pages.forEach((page, index) => {
      if (index > 0 && page - pages[index - 1] > 1) items.push("ellipsis");
      items.push(page);
    });
    return items;
  }, [currentPage, totalPages]);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    return visibleTransactions.slice(start, start + TRANSACTIONS_PER_PAGE);
  }, [currentPage, visibleTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    paginatedTransactions.forEach((transaction) => {
      const group = groups.get(transaction.txn_date) ?? [];
      group.push(transaction);
      groups.set(transaction.txn_date, group);
    });
    return Array.from(groups, ([date, items]) => ({
      date,
      items,
      income: items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
      expense: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
    }));
  }, [paginatedTransactions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const activeFilterCount = Number(Boolean(filters.query.trim()))
    + Number(filters.type !== "all")
    + Number(Boolean(filters.category_id))
    + Number(filters.from_date !== bounds.start || filters.to_date !== bounds.end);

  const changePeriod = (value: string) => {
    const nextBounds = periodBounds(value);
    setPeriod(value);
    setFilters({ query: "", type: "all", category_id: "", from_date: nextBounds.start, to_date: nextBounds.end });
    setForm((current) => ({ ...current, txn_date: defaultTransactionDate(value) }));
    setEditing(null);
    setMenuId(null);
    setCurrentPage(1);
  };

  const resetFilters = () => setFilters({
    query: "",
    type: "all",
    category_id: "",
    from_date: bounds.start,
    to_date: bounds.end,
  });

  const focusComposer = () => window.setTimeout(() => amountInputRef.current?.focus(), 0);

  const openCreate = () => {
    setEditing(null);
    setFormError("");
    setActionError("");
    setForm((current) => ({ ...current, amount: "", note: "", txn_date: defaultTransactionDate(period) }));
    if (isMobile) setMobileFormOpen(true);
    else focusComposer();
  };

  const openEdit = (transaction: Transaction) => {
    const category = categoryMap.get(transaction.category_id);
    setEditing(transaction);
    setForm({
      type: category?.type ?? transaction.type,
      category_id: transaction.category_id,
      amount: moneyInputValue(transaction.amount),
      txn_date: transaction.txn_date,
      note: transaction.note ?? "",
    });
    setFormError("");
    setActionError("");
    setMenuId(null);
    if (isMobile) setMobileFormOpen(true);
    else focusComposer();
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormError("");
    setForm((current) => ({ ...current, amount: "", note: "", txn_date: defaultTransactionDate(period) }));
  };

  const changeFormType = (type: CategoryType) => {
    const nextCategory = categories.find((category) => category.type === type);
    setForm((current) => ({ ...current, type, category_id: nextCategory?.id ?? "" }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = parseMoneyInput(form.amount);
    if (!form.category_id) return setFormError(`Chưa có danh mục ${form.type === "expense" ? "chi" : "thu"} để chọn.`);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1_000_000_000_000) return setFormError("Nhập số tiền từ 0,01 đến 999.999.999.999,99 ₫, tối đa 2 chữ số thập phân.");
    if (form.txn_date > businessDateValue()) return setFormError("Ngày giao dịch không thể nằm trong tương lai.");

    const payload: TransactionPayload = {
      category_id: form.category_id,
      amount,
      txn_date: form.txn_date,
      note: form.note.trim() || null,
    };
    setSaving(true);
    setFormError("");
    setActionError("");
    try {
      if (editing) {
        const updated = await api.updateTransaction(editing.id, payload);
        setTransactions((items) => updated.txn_date >= bounds.start && updated.txn_date <= bounds.end
          ? items.map((item) => item.id === editing.id ? updated : item)
          : items.filter((item) => item.id !== editing.id));
        setSuccessMessage("Đã cập nhật giao dịch.");
      } else {
        const created = await api.createTransaction(payload);
        if (created.txn_date >= bounds.start && created.txn_date <= bounds.end) {
          setTransactions((items) => [created, ...items]);
          setCurrentPage(1);
        }
        setSuccessMessage("Đã thêm giao dịch.");
      }
      setEditing(null);
      setForm((current) => ({ ...current, amount: "", note: "" }));
      setMobileFormOpen(false);
      if (!isMobile) focusComposer();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Không thể lưu giao dịch.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (transaction: Transaction) => {
    setMenuId(null);
    if (!window.confirm(`Xóa giao dịch “${transaction.note || categoryMap.get(transaction.category_id)?.name || "Không có ghi chú"}”?`)) return;
    setActionError("");
    try {
      await api.deleteTransaction(transaction.id);
      setTransactions((items) => items.filter((item) => item.id !== transaction.id));
      if (editing?.id === transaction.id) cancelEdit();
      setSuccessMessage("Đã xóa giao dịch.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể xóa giao dịch.");
    }
  };

  const formView = (
    <TransactionForm
      form={form}
      setForm={setForm}
      categories={typeCategories}
      selectedCategory={selectedCategory}
      editing={editing}
      saving={saving}
      formError={formError}
      onTypeChange={changeFormType}
      onSubmit={submit}
      onCancelEdit={cancelEdit}
      amountInputRef={amountInputRef}
      showActions={!isMobile}
    />
  );

  return (
    <div className="page transactions-page">
      <header className="page-header">
        <div><h1>Giao dịch</h1><p>Ghi chép nhanh, theo dõi rõ từng khoản thu chi</p></div>
        <div className="header-actions">
          <label className="month-input"><CalendarDays size={18} /><select value={period} onChange={(event) => changePeriod(event.target.value)} aria-label="Chọn tháng giao dịch" disabled={loading}>{monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <ThemeToggle />
          <button className="button button--primary" type="button" onClick={openCreate} disabled={loading || Boolean(loadError)}><Plus size={19} /> Thêm giao dịch</button>
        </div>
      </header>

      {successMessage && <div className="transaction-toast" role="status">{successMessage}</div>}
      {actionError && <div className="inline-alert" role="alert">{actionError}</div>}

      {loadError ? (
        <DataLoadError title="Chưa tải được giao dịch" description={loadError} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : loading ? (
        <TransactionsSkeleton />
      ) : (
        <>
          <section className="surface transaction-summary" aria-label={`Tổng hợp tháng ${Number(period.slice(5))}`}>
            <strong>Tháng {Number(period.slice(5))}</strong>
            <SummaryValue label="Thu nhập" value={summary.income} tone="positive" />
            <SummaryValue label="Chi tiêu" value={summary.expense} tone="negative" />
            <SummaryValue label="Chênh lệch" value={summary.net} tone={summary.net < 0 ? "negative" : "positive"} signed />
          </section>

          <div className="transaction-workspace">
            {!isMobile && <aside className="surface transaction-composer" aria-label={editing ? "Chỉnh sửa giao dịch" : "Ghi nhanh giao dịch"}>
              <div className="transaction-composer__heading"><div><h2>{editing ? "Chỉnh sửa giao dịch" : "Ghi nhanh giao dịch"}</h2><p>{editing ? "Cập nhật thông tin và lưu thay đổi" : "Hoàn tất trong vài giây"}</p></div>{editing && <button className="icon-button" type="button" onClick={cancelEdit} aria-label="Hủy chỉnh sửa"><X size={19} /></button>}</div>
              {formView}
            </aside>}

            <section className="surface transaction-ledger">
              <div className="transaction-ledger__heading"><div><h2>Lịch sử giao dịch</h2><span>{visibleTransactions.length} giao dịch</span></div>{isMobile && <button className="button button--secondary transaction-filter-trigger" type="button" onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal size={17} /> Bộ lọc{activeFilterCount ? ` · ${activeFilterCount}` : ""}</button>}</div>

              {isMobile ? (
                <label className="transaction-search"><Search size={18} /><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Tìm ghi chú hoặc danh mục" aria-label="Tìm giao dịch" /></label>
              ) : (
                <TransactionFilters filters={filters} setFilters={setFilters} categories={categories} bounds={bounds} activeCount={activeFilterCount} onReset={resetFilters} />
              )}

              {groupedTransactions.length === 0 ? (
                <div className="transaction-empty">
                  <span><ReceiptText size={25} /></span>
                  <h3>{transactions.length === 0 ? "Chưa có giao dịch trong tháng" : "Không tìm thấy giao dịch"}</h3>
                  <p>{transactions.length === 0 ? "Thêm khoản thu hoặc chi đầu tiên để bắt đầu theo dõi dòng tiền." : "Hãy thay đổi từ khóa hoặc xóa các điều kiện lọc đang áp dụng."}</p>
                  {transactions.length === 0 ? <button className="button button--primary" type="button" onClick={openCreate}><Plus size={17} /> Thêm giao dịch</button> : <button className="button button--outline" type="button" onClick={resetFilters}><RotateCcw size={16} /> Xóa bộ lọc</button>}
                </div>
              ) : (
                <><div className="transaction-groups">
                  {groupedTransactions.map((group) => (
                    <section className="transaction-day" key={group.date}>
                      <header><strong>{dayHeading(group.date)}</strong><span>{group.income > 0 && <b className="amount--positive">Thu {formatCurrency(group.income)}</b>}{group.expense > 0 && <b className="amount--negative">Chi {formatCurrency(group.expense)}</b>}</span></header>
                      {group.items.map((transaction) => {
                        const category = categoryMap.get(transaction.category_id);
                        const income = transaction.type === "income";
                        return (
                          <div className="transaction-row" key={transaction.id}>
                            {category ? <CategoryAvatar category={category} /> : <span className="transaction-fallback-icon"><ReceiptText size={20} /></span>}
                            <div className="transaction-row__copy"><strong>{transaction.note || category?.name || "Không có ghi chú"}</strong><small>{category?.name || "Danh mục không còn tồn tại"} · {formatShortDate(transaction.txn_date)}</small></div>
                            <strong className={income ? "amount--positive" : "amount--negative"}>{income ? "+" : "−"}{formatCurrency(transaction.amount)}</strong>
                            <div className="row-menu-wrap">
                              <button className="icon-button" type="button" onClick={() => setMenuId(menuId === transaction.id ? null : transaction.id)} aria-label={`Thao tác với ${transaction.note || category?.name || "giao dịch"}`} aria-expanded={menuId === transaction.id}><MoreHorizontal size={20} /></button>
                              {menuId === transaction.id && <div className="row-menu"><button type="button" onClick={() => openEdit(transaction)}><Pencil size={16} /> Chỉnh sửa</button><button type="button" className="danger" onClick={() => remove(transaction)}><Trash2 size={16} /> Xóa giao dịch</button></div>}
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  ))}
                </div>{totalPages > 1 && <nav className="transaction-pagination" aria-label="Phân trang giao dịch"><span>Trang {currentPage} / {totalPages}</span><div><button className="icon-button" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Trang giao dịch trước"><ChevronLeft size={18} /></button>{paginationItems.map((item, index) => item === "ellipsis" ? <span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span> : <button key={item} type="button" className={currentPage === item ? "is-active" : ""} onClick={() => setCurrentPage(item)} aria-label={`Trang giao dịch ${item}`} aria-current={currentPage === item ? "page" : undefined}>{item}</button>)}<button className="icon-button" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} aria-label="Trang giao dịch sau"><ChevronRight size={18} /></button></div></nav>}</>
              )}
            </section>
          </div>
        </>
      )}

      <SidePanel
        open={mobileFormOpen}
        onClose={() => setMobileFormOpen(false)}
        title={editing ? "Chỉnh sửa giao dịch" : "Thêm giao dịch"}
        footer={<><button className="button button--secondary" type="button" onClick={() => setMobileFormOpen(false)}>Hủy</button><button className="button button--primary" type="submit" form="transaction-form" disabled={saving}>{saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Lưu giao dịch"}</button></>}
      >
        {isMobile && formView}
      </SidePanel>

      <SidePanel
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Bộ lọc giao dịch"
        footer={<><button className="button button--secondary" type="button" onClick={resetFilters}><RotateCcw size={16} /> Xóa bộ lọc</button><button className="button button--primary" type="button" onClick={() => setMobileFiltersOpen(false)}>Xem {visibleTransactions.length} kết quả</button></>}
      >
        {isMobile && <TransactionFilters filters={filters} setFilters={setFilters} categories={categories} bounds={bounds} activeCount={activeFilterCount} onReset={resetFilters} mobile />}
      </SidePanel>
    </div>
  );
}

function SummaryValue({ label, value, tone, signed = false }: { label: string; value: number; tone: "positive" | "negative"; signed?: boolean }) {
  return <div className="transaction-summary__item"><span>{label}</span><strong className={`amount--${tone}`}>{signed && value > 0 ? "+" : ""}{formatCurrency(value)}</strong></div>;
}

interface TransactionFormProps {
  form: TransactionFormState;
  setForm: Dispatch<SetStateAction<TransactionFormState>>;
  categories: Category[];
  selectedCategory?: Category;
  editing: Transaction | null;
  saving: boolean;
  formError: string;
  onTypeChange: (type: CategoryType) => void;
  onSubmit: (event: FormEvent) => void;
  onCancelEdit: () => void;
  amountInputRef: RefObject<HTMLInputElement>;
  showActions: boolean;
}

function TransactionForm({ form, setForm, categories, selectedCategory, editing, saving, formError, onTypeChange, onSubmit, onCancelEdit, amountInputRef, showActions }: TransactionFormProps) {
  const todayValue = useBusinessDate();
  return (
    <form id="transaction-form" className="transaction-form" onSubmit={onSubmit}>
      <div className="transaction-type-switch" aria-label="Loại giao dịch">
        <button type="button" className={form.type === "expense" ? "is-active is-expense" : ""} onClick={() => onTypeChange("expense")}><ArrowDownToLine size={18} /> Khoản chi</button>
        <button type="button" className={form.type === "income" ? "is-active is-income" : ""} onClick={() => onTypeChange("income")}><ArrowUpFromLine size={18} /> Khoản thu</button>
      </div>
      <label className="transaction-amount-field"><span>Số tiền</span><div><input ref={amountInputRef} data-panel-initial-focus inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Ví dụ: 150000 hoặc 1,23" aria-label="Số tiền giao dịch" /><b>₫</b></div></label>
      <label className="field"><span>Danh mục</span><select value={form.category_id} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}><option value="">Chọn danh mục {form.type === "expense" ? "chi" : "thu"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      {selectedCategory && <div className="selected-category"><CategoryAvatar category={selectedCategory} /><div><strong>{selectedCategory.name}</strong><small>{form.type === "expense" ? "Danh mục chi" : "Danh mục thu"}</small></div></div>}
      {categories.length === 0 && <p className="transaction-category-empty">Chưa có danh mục {form.type === "expense" ? "chi" : "thu"}. <Link to="/categories">Tạo danh mục</Link></p>}
      <label className="field"><span>Ngày giao dịch</span><input type="date" value={form.txn_date} max={todayValue} onChange={(event) => setForm((current) => ({ ...current, txn_date: event.target.value }))} /></label>
      <label className="field"><span>Ghi chú <small>Không bắt buộc</small></span><input value={form.note} maxLength={240} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ví dụ: Đi chợ cuối tuần" /></label>
      {formError && <div className="form-error" role="alert">{formError}</div>}
      {showActions && <div className="transaction-form__actions">{editing && <button className="button button--secondary" type="button" onClick={onCancelEdit}>Hủy chỉnh sửa</button>}<button className="button button--primary" type="submit" disabled={saving || categories.length === 0}>{saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Lưu giao dịch"}</button></div>}
    </form>
  );
}

interface TransactionFiltersProps {
  filters: TransactionFilterState;
  setFilters: Dispatch<SetStateAction<TransactionFilterState>>;
  categories: Category[];
  bounds: { start: string; end: string };
  activeCount: number;
  onReset: () => void;
  mobile?: boolean;
}

function TransactionFilters({ filters, setFilters, categories, bounds, activeCount, onReset, mobile = false }: TransactionFiltersProps) {
  const changeType = (type: TransactionTypeFilter) => setFilters((current) => {
    const selectedCategory = categories.find((category) => category.id === current.category_id);
    return { ...current, type, category_id: type !== "all" && selectedCategory?.type !== type ? "" : current.category_id };
  });
  const categoryOptions = filters.type === "all" ? categories : categories.filter((category) => category.type === filters.type);
  return (
    <div className={`transaction-filters${mobile ? " transaction-filters--mobile" : ""}`} aria-label="Lọc giao dịch">
      {!mobile && <label className="transaction-search"><Search size={18} /><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Tìm ghi chú hoặc danh mục" aria-label="Tìm giao dịch" /></label>}
      <label className="filter-field"><span className="sr-only">Loại giao dịch</span><select value={filters.type} onChange={(event) => changeType(event.target.value as TransactionTypeFilter)}><option value="all">Thu & chi</option><option value="income">Khoản thu</option><option value="expense">Khoản chi</option></select></label>
      <label className="filter-field"><span className="sr-only">Danh mục</span><select value={filters.category_id} onChange={(event) => setFilters((current) => ({ ...current, category_id: event.target.value }))}><option value="">Tất cả danh mục</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div className="transaction-date-range"><label><span>{mobile ? "Từ ngày" : "Từ"}</span><input type="date" min={bounds.start} max={filters.to_date} value={filters.from_date} onChange={(event) => setFilters((current) => ({ ...current, from_date: event.target.value }))} /></label><i>—</i><label><span>{mobile ? "Đến ngày" : "Đến"}</span><input type="date" min={filters.from_date} max={bounds.end} value={filters.to_date} onChange={(event) => setFilters((current) => ({ ...current, to_date: event.target.value }))} /></label></div>
      {!mobile && <button className="transaction-reset-filter" type="button" onClick={onReset} disabled={!activeCount}><RotateCcw size={16} /> Xóa bộ lọc{activeCount ? ` · ${activeCount}` : ""}</button>}
    </div>
  );
}

function TransactionsSkeleton() {
  return <div className="transactions-loading" aria-label="Đang tải giao dịch" aria-busy="true"><div className="surface transaction-summary dashboard-skeleton" /><div className="transaction-workspace"><div className="surface skeleton-block" /><div className="surface skeleton-block" /></div></div>;
}

function DataLoadError({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return <section className="surface data-load-state" role="alert"><span><AlertCircle size={25} /></span><h2>{title}</h2><p>{description}</p><button className="button button--primary" type="button" onClick={onRetry}><RefreshCw size={17} /> Thử lại</button></section>;
}
