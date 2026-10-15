import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Plus,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { api } from "../lib/api";
import { getCategoryIcon } from "../lib/categoryIcons";
import { formatCurrency } from "../lib/format";
import { monthChoices, useBusinessDate } from "../lib/dates";
import type { DashboardCategorySpending, DashboardData, DashboardTrendPoint } from "../types";

type MetricTone = "positive" | "negative" | "brand";
type SpendingSlice = DashboardCategorySpending & { color: string };

const categoryFallbackColors = ["#07845c", "#2563eb", "#f29b00", "#e73535", "#7757e8"];

const safeColor = (color: string, index: number) =>
  /^#[0-9a-f]{6}$/i.test(color) ? color : categoryFallbackColors[index % categoryFallbackColors.length];

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const compactSpending = (items: DashboardCategorySpending[]): SpendingSlice[] => {
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  if (sorted.length <= 4) return sorted.map((item, index) => ({ ...item, color: safeColor(item.color, index) }));

  const visible = sorted.slice(0, 3).map((item, index) => ({ ...item, color: safeColor(item.color, index) }));
  const remaining = sorted.slice(3);
  return [
    ...visible,
    {
      category_id: "other",
      category_name: `Khác (${remaining.length})`,
      color: "#7c8798",
      icon: "circle-dollar-sign",
      amount: remaining.reduce((sum, item) => sum + item.amount, 0),
      percentage: remaining.reduce((sum, item) => sum + item.percentage, 0),
    },
  ];
};

const buildDonutBackground = (items: SpendingSlice[]) => {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return "var(--line-soft)";

  let cursor = 0;
  const segments = items.map((item, index) => {
    const start = cursor;
    const share = item.amount / total * 100;
    cursor = index === items.length - 1 ? 100 : Math.min(100, cursor + share);
    return `${item.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
};

const chartPoints = (trend: DashboardTrendPoint[], key: "income" | "expense") => {
  const left = 58;
  const right = 700;
  const top = 40;
  const bottom = 240;
  const maxValue = Math.max(1, ...trend.flatMap((point) => [point.income, point.expense]));
  return trend.map((point, index) => ({
    x: trend.length === 1 ? (left + right) / 2 : left + index * ((right - left) / (trend.length - 1)),
    y: bottom - (point[key] / maxValue) * (bottom - top),
    value: point[key],
    label: `${String(point.month).padStart(2, "0")}/${point.year}`,
  }));
};

const pointsToPath = (points: ReturnType<typeof chartPoints>) =>
  points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");

export function DashboardPage() {
  const today = useBusinessDate();
  const monthOptions = monthChoices(today, 24);
  const [period, setPeriod] = useState(today.slice(0, 7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [year, month] = period.split("-").map(Number);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api.getDashboard(month, year, controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setData(null);
        setError("Không thể tải dữ liệu Dashboard. Vui lòng kiểm tra phiên truy cập và thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [month, year, reloadKey]);

  const metrics = useMemo(() => data ? [
    { label: "Thu nhập tháng", value: data.summary.income, icon: WalletCards, tone: "positive" as MetricTone },
    { label: "Chi tiêu tháng", value: data.summary.expense, icon: ArrowDownRight, tone: "negative" as MetricTone },
    { label: "Còn lại", value: data.summary.net, icon: CircleDollarSign, tone: (data.summary.net < 0 ? "negative" : "positive") as MetricTone },
    { label: "Số dư tích lũy", value: data.summary.available_balance, icon: WalletCards, tone: (data.summary.available_balance < 0 ? "negative" : "brand") as MetricTone },
  ] : [], [data]);

  const spending = useMemo(() => compactSpending(data?.spending_by_category ?? []), [data]);
  const donutBackground = useMemo(() => buildDonutBackground(spending), [spending]);
  const incomePoints = useMemo(() => chartPoints(data?.trend ?? [], "income"), [data]);
  const expensePoints = useMemo(() => chartPoints(data?.trend ?? [], "expense"), [data]);
  const trendHasData = Boolean(data?.trend.some((point) => point.income > 0 || point.expense > 0));
  const retry = () => setReloadKey((value) => value + 1);

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div className="page-title-row">
          <h1>Tổng quan</h1>
          <label className="month-input">
            <CalendarDays size={18} />
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              aria-label="Chọn tháng hiển thị Dashboard"
              disabled={loading}
            >
              {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="button button--primary" to="/transactions">
            <Plus size={19} /> Thêm giao dịch
          </Link>
        </div>
      </header>

      {error ? (
        <DashboardState
          icon={AlertCircle}
          title="Chưa tải được Dashboard"
          description={error}
          action={<button className="button button--primary" type="button" onClick={retry}><RefreshCw size={17} /> Thử lại</button>}
        />
      ) : loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="metrics-grid" aria-label="Tổng quan tài chính">
            {metrics.map(({ label, value, icon: Icon, tone }) => (
              <article className="metric-card" key={label}>
                <span className={`metric-icon metric-icon--${tone}`}><Icon size={23} /></span>
                <div>
                  <p>{label}</p>
                  <strong className={`amount amount--${tone}`}>{formatCurrency(value)}</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="dashboard-primary-grid">
            <article className="surface spending-surface">
              <div className="section-heading"><h2>Chi tiêu theo danh mục</h2></div>
              {spending.length === 0 ? (
                <PanelEmpty icon={ReceiptText} title="Chưa có khoản chi" description="Các giao dịch chi trong tháng sẽ xuất hiện tại đây." />
              ) : (
                <div className="spending-chart-layout">
                  <div
                    className="donut-chart"
                    style={{ background: donutBackground }}
                    aria-label={spending.map((item) => `${item.category_name} ${Math.round(item.percentage)}%`).join(", ")}
                  >
                    <div className="donut-center">
                      <strong>{formatCurrency(data.summary.expense)}</strong>
                      <span>Tổng chi tiêu</span>
                    </div>
                  </div>
                  <div className="chart-legend">
                    {spending.map((item) => {
                      const Icon = getCategoryIcon(item.icon, "expense");
                      return (
                        <div className="legend-row" key={item.category_id}>
                          <span className="legend-category-icon" style={{ color: item.color, backgroundColor: `${item.color}18` }}><Icon size={13} /></span>
                          <span title={item.category_name}>{item.category_name}</span>
                          <strong>{formatCurrency(item.amount)}</strong>
                          <small>{Math.round(item.percentage)}%</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Link className="surface-link" to="/categories">Xem danh mục <ArrowRight size={17} /></Link>
            </article>

            <article className="surface trend-surface">
              <div className="section-heading">
                <div>
                  <h2>Xu hướng thu / chi theo tháng</h2>
                  <div className="trend-legend"><span><i className="dot-income" /> Thu nhập</span><span><i className="dot-expense" /> Chi tiêu</span></div>
                </div>
                <span className="compact-select compact-select--static">3 tháng</span>
              </div>
              {!trendHasData ? (
                <PanelEmpty icon={CircleDollarSign} title="Chưa có dữ liệu xu hướng" description="Cần ít nhất một giao dịch trong ba tháng gần đây." />
              ) : (
                <div className="line-chart" aria-label="Xu hướng thu nhập và chi tiêu trong ba tháng">
                  <svg viewBox="0 0 720 300" role="img">
                    <title>Xu hướng thu nhập và chi tiêu</title>
                    <g className="chart-grid">
                      {[40, 90, 140, 190, 240].map((yValue) => <line key={yValue} x1="58" y1={yValue} x2="700" y2={yValue} />)}
                      {incomePoints.map((point) => <line key={point.x} x1={point.x} y1="25" x2={point.x} y2="250" />)}
                    </g>
                    <path className="income-line" d={pointsToPath(incomePoints)} />
                    <path className="expense-line" d={pointsToPath(expensePoints)} />
                    {incomePoints.map((point) => <circle key={`income-${point.label}`} className="income-point" cx={point.x} cy={point.y} r="4"><title>{`${point.label}: Thu ${formatCurrency(point.value)}`}</title></circle>)}
                    {expensePoints.map((point) => <circle key={`expense-${point.label}`} className="expense-point" cx={point.x} cy={point.y} r="4"><title>{`${point.label}: Chi ${formatCurrency(point.value)}`}</title></circle>)}
                    <g className="chart-labels">{incomePoints.map((point) => <text key={point.label} x={point.x} y="280" textAnchor="middle">{point.label}</text>)}</g>
                  </svg>
                </div>
              )}
            </article>
          </section>

          <section className="dashboard-secondary-grid">
            <article className="surface compact-surface recent-surface">
              <div className="section-heading"><h2>Giao dịch gần đây</h2><Link to="/transactions">Xem tất cả</Link></div>
              {data.recent_transactions.length === 0 ? <PanelEmpty icon={ReceiptText} title="Chưa có giao dịch" description="Giao dịch trong tháng sẽ xuất hiện tại đây." compact /> : data.recent_transactions.map((transaction, index) => {
                const income = transaction.type === "income";
                const Icon = getCategoryIcon(transaction.category_icon, transaction.type);
                const color = safeColor(transaction.category_color, index);
                const signedAmount = income ? transaction.amount : -transaction.amount;
                return (
                  <div className="recent-row" key={transaction.id}>
                    <span className="recent-icon" style={{ color, backgroundColor: `${color}18` }}><Icon size={18} /></span>
                    <div><strong title={transaction.note || transaction.category_name}>{transaction.note || transaction.category_name}</strong><small>{formatDate(transaction.txn_date)} · {transaction.category_name}</small></div>
                    <b className={income ? "amount--positive" : "amount--negative"}>{signedAmount > 0 ? "+" : ""}{formatCurrency(signedAmount)}</b>
                  </div>
                );
              })}
            </article>


          </section>
        </>
      )}
    </div>
  );
}

function DashboardState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof AlertCircle;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <section className="surface dashboard-state" role="status">
      <span><Icon size={28} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{action}</div>
    </section>
  );
}

function PanelEmpty({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: typeof ReceiptText;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`dashboard-panel-empty${compact ? " dashboard-panel-empty--compact" : ""}`}>
      <Icon size={22} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-loading" aria-live="polite" aria-busy="true">
      <span className="sr-only">Đang tải dữ liệu Dashboard</span>
      <section className="metrics-grid">{Array.from({ length: 4 }, (_, index) => <div className="metric-card dashboard-skeleton" key={index} />)}</section>
      <section className="dashboard-primary-grid"><div className="surface dashboard-skeleton dashboard-skeleton--large" /><div className="surface dashboard-skeleton dashboard-skeleton--large" /></section>
      <section className="dashboard-secondary-grid">{Array.from({ length: 4 }, (_, index) => <div className="surface dashboard-skeleton dashboard-skeleton--compact" key={index} />)}</section>
    </div>
  );
}
