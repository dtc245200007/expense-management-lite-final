import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  RefreshCw,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { api } from "../lib/api";
import { getCategoryIcon } from "../lib/categoryIcons";
import { formatCurrency } from "../lib/format";
import { monthChoices, useBusinessDate } from "../lib/dates";
import type { ReportCategoryComparison, ReportData } from "../types";

const expensePalette = ["#e45b4f", "#f29b38", "#7c5ce7", "#3185dc", "#c86b98", "#708090", "#d17632"];

const percentFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

const formatPercent = (value: number) => `${percentFormatter.format(Math.abs(value))}%`;

const formatChartValue = (value: number) => {
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000_000) return `${percentFormatter.format(value / 1_000_000_000)} tỷ`;
  if (absoluteValue >= 1_000_000) return `${percentFormatter.format(value / 1_000_000)} tr`;
  if (absoluteValue >= 1_000) return `${percentFormatter.format(value / 1_000)} nghìn`;
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
};

const periodLabel = (month: number, year: number) => `Tháng ${month}/${year}`;

const changeCopy = (percentage: number | null, difference: number) => {
  if (percentage == null) return difference === 0 ? "Không đổi" : "Mới phát sinh";
  if (percentage === 0) return "Không đổi";
  return `${percentage > 0 ? "Tăng" : "Giảm"} ${formatPercent(percentage)}`;
};

export function ReportsPage() {
  const today = useBusinessDate();
  const monthOptions = monthChoices(today, 36);
  const [period, setPeriod] = useState(today.slice(0, 7));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [year, month] = period.split("-").map(Number);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.getReport(month, year, controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, reloadKey, year]);

  return (
    <div className="page reports-page">
      <header className="page-header reports-header">
        <div>
          <h1>Báo cáo</h1>
          <p>So sánh tình hình tài chính giữa kỳ này và kỳ trước.</p>
        </div>
        <div className="header-actions">
          <label className="month-input">
            <CalendarDays size={18} />
            <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Chọn kỳ báo cáo">
              {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <ThemeToggle />
        </div>
      </header>

      {loading ? (
        <ReportsSkeleton />
      ) : error ? (
        <section className="surface reports-state" role="alert">
          <span><AlertCircle size={27} /></span>
          <h2>Chưa tải được báo cáo</h2>
          <p>{error}</p>
          <button className="button button--primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshCw size={17} /> Thử lại
          </button>
        </section>
      ) : data ? (
        <ReportContent data={data} />
      ) : null}
    </div>
  );
}

function ReportContent({ data }: { data: ReportData }) {
  const { current, previous } = data.summary;
  const currentLabel = periodLabel(data.current_period.month, data.current_period.year);
  const previousLabel = periodLabel(data.previous_period.month, data.previous_period.year);

  return (
    <>
      <section className="surface reports-summary" aria-label="Tổng quan kỳ báo cáo">
        <ReportSummaryItem
          icon={CircleDollarSign}
          label="Thu nhập"
          value={current.income}
          difference={data.summary.income_difference}
          percentage={data.summary.income_change_percentage}
          tone="income"
        />
        <ReportSummaryItem
          icon={ReceiptText}
          label="Chi tiêu"
          value={current.expense}
          difference={data.summary.expense_difference}
          percentage={data.summary.expense_change_percentage}
          tone="expense"
        />
        <ReportSummaryItem
          icon={WalletCards}
          label="Còn lại"
          value={current.net}
          difference={data.summary.net_difference}
          percentage={data.summary.net_change_percentage}
          tone={current.net < 0 ? "expense" : "balance"}
        />
      </section>

      {!data.has_data ? (
        <section className="surface reports-state reports-state--empty">
          <span><ChartNoAxesColumnIncreasing size={29} /></span>
          <h2>Chưa có dữ liệu để lập báo cáo</h2>
          <p>Hai kỳ đang so sánh chưa có giao dịch thu hoặc chi. Báo cáo sẽ tự cập nhật khi bạn thêm dữ liệu.</p>
          <Link className="button button--primary" to="/transactions">Thêm giao dịch</Link>
        </section>
      ) : (
        <>
          <section className="reports-analysis-grid">
            <article className="surface reports-comparison-surface">
              <div className="reports-section-heading">
                <div>
                  <h2>So sánh chi tiêu theo danh mục</h2>
                  <p>Quy mô giữa các danh mục và thay đổi so với kỳ trước.</p>
                </div>
                <div className="reports-legend" aria-label="Chú thích biểu đồ">
                  <span><i className="reports-swatch reports-swatch--current" />{currentLabel}</span>
                  <span><i className="reports-swatch reports-swatch--previous" />{previousLabel}</span>
                </div>
              </div>

              <div className="reports-chart-totals">
                <div><small>Tổng kỳ này</small><strong className="amount--expense">{formatCurrency(current.expense)}</strong></div>
                <div><small>Tổng kỳ trước</small><strong>{formatCurrency(previous.expense)}</strong></div>
                <div className={data.summary.expense_difference > 0 ? "is-expense-up" : data.summary.expense_difference < 0 ? "is-expense-down" : ""}>
                  <small>Chênh lệch</small>
                  <strong>{data.summary.expense_difference > 0 ? "+" : ""}{formatCurrency(data.summary.expense_difference)}</strong>
                  <span>{changeCopy(data.summary.expense_change_percentage, data.summary.expense_difference)}</span>
                </div>
              </div>

              <CategoryComparisonChart categories={data.categories} currentLabel={currentLabel} previousLabel={previousLabel} />
            </article>

            <aside className="reports-side-column">
              <CategorySharePanel categories={data.categories} total={current.expense} />
              <MoversPanel categories={data.categories} />
            </aside>
          </section>

          <CategoryDetailTable
            categories={data.categories}
            period={`${data.current_period.year}-${String(data.current_period.month).padStart(2, "0")}`}
            currentTotal={current.expense}
            previousTotal={previous.expense}
            totalDifference={data.summary.expense_difference}
            totalChange={data.summary.expense_change_percentage}
          />
        </>
      )}
    </>
  );
}

function ReportSummaryItem({
  icon: Icon,
  label,
  value,
  difference,
  percentage,
  tone,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: number;
  difference: number;
  percentage: number | null;
  tone: "income" | "expense" | "balance";
}) {
  const direction = difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  const DirectionIcon = direction === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <div className={`reports-summary__item reports-summary__item--${tone}`}>
      <span className="reports-summary__icon"><Icon size={21} /></span>
      <div>
        <small>{label}</small>
        <strong>{formatCurrency(value)}</strong>
        <span className={`reports-summary__delta reports-summary__delta--${direction}`}>
          {direction !== "flat" && <DirectionIcon size={14} />}
          {changeCopy(percentage, difference)} so với kỳ trước
        </span>
      </div>
    </div>
  );
}

function aggregateChartCategories(categories: ReportCategoryComparison[]) {
  if (categories.length <= 7) return categories;
  const leading = categories.slice(0, 6);
  const remaining = categories.slice(6);
  return [
    ...leading,
    {
      category_id: "other-categories",
      category_name: "Danh mục khác",
      icon: "receipt" as const,
      current_amount: remaining.reduce((sum, item) => sum + item.current_amount, 0),
      current_share: remaining.reduce((sum, item) => sum + item.current_share, 0),
      current_transaction_count: remaining.reduce((sum, item) => sum + item.current_transaction_count, 0),
      previous_amount: remaining.reduce((sum, item) => sum + item.previous_amount, 0),
      previous_share: remaining.reduce((sum, item) => sum + item.previous_share, 0),
      previous_transaction_count: remaining.reduce((sum, item) => sum + item.previous_transaction_count, 0),
      difference: remaining.reduce((sum, item) => sum + item.difference, 0),
      change_percentage: null,
    },
  ];
}

function CategoryComparisonChart({ categories, currentLabel, previousLabel }: { categories: ReportCategoryComparison[]; currentLabel: string; previousLabel: string }) {
  const chartCategories = aggregateChartCategories(categories);
  const maxAmount = Math.max(1, ...chartCategories.flatMap((category) => [category.current_amount, category.previous_amount]));
  const width = 760;
  const height = 292;
  const margin = { top: 34, right: 12, bottom: 58, left: 54 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const groupWidth = plotWidth / Math.max(chartCategories.length, 1);
  const barWidth = Math.min(24, groupWidth * 0.27);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div
      className="reports-chart-wrap"
      role="region"
      aria-label="Biểu đồ so sánh chi tiêu theo danh mục; có thể cuộn ngang"
      tabIndex={0}
    >
      <svg className="reports-category-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="reports-chart-title reports-chart-description">
        <title id="reports-chart-title">So sánh chi tiêu theo danh mục</title>
        <desc id="reports-chart-description">Cột màu san hô là {currentLabel}, cột xám là {previousLabel}. Các danh mục dùng chung một trục để so sánh quy mô.</desc>
        {ticks.map((tick) => {
          const y = margin.top + plotHeight - plotHeight * tick;
          return (
            <g key={tick}>
              <line className="reports-chart-grid" x1={margin.left} x2={width - margin.right} y1={y} y2={y} />
              <text className="reports-chart-axis" x={margin.left - 10} y={y + 4} textAnchor="end">{formatChartValue(maxAmount * tick)}</text>
            </g>
          );
        })}
        {chartCategories.map((category, index) => {
          const centerX = margin.left + groupWidth * index + groupWidth / 2;
          const currentHeight = category.current_amount / maxAmount * plotHeight;
          const previousHeight = category.previous_amount / maxAmount * plotHeight;
          const currentX = centerX - barWidth - 3;
          const previousX = centerX + 3;
          return (
            <g key={category.category_id}>
              {category.current_amount > 0 && <>
                <rect className="reports-bar reports-bar--current" x={currentX} y={margin.top + plotHeight - currentHeight} width={barWidth} height={Math.max(currentHeight, 2)} rx="4" />
                <text className="reports-bar-value reports-bar-value--current" x={currentX + barWidth / 2} y={Math.max(margin.top + 12, margin.top + plotHeight - currentHeight - 7)} textAnchor="middle">{formatChartValue(category.current_amount)}</text>
              </>}
              {category.previous_amount > 0 && <>
                <rect className="reports-bar reports-bar--previous" x={previousX} y={margin.top + plotHeight - previousHeight} width={barWidth} height={Math.max(previousHeight, 2)} rx="4" />
                <text className="reports-bar-value" x={previousX + barWidth / 2} y={Math.max(margin.top + 12, margin.top + plotHeight - previousHeight - 7)} textAnchor="middle">{formatChartValue(category.previous_amount)}</text>
              </>}
              <text className="reports-chart-category" x={centerX} y={height - 24} textAnchor="middle">
                {category.category_name.length > 13 ? `${category.category_name.slice(0, 12)}…` : category.category_name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CategorySharePanel({ categories, total }: { categories: ReportCategoryComparison[]; total: number }) {
  const activeCategories = categories.filter((category) => category.current_amount > 0);
  const shareCategories = aggregateChartCategories(activeCategories);
  const gradient = useMemo(() => {
    if (!shareCategories.length) return "var(--line)";
    let cursor = 0;
    return `conic-gradient(${shareCategories.map((category, index) => {
      const start = cursor;
      cursor += category.current_share;
      return `${expensePalette[index % expensePalette.length]} ${start}% ${cursor}%`;
    }).join(", ")})`;
  }, [shareCategories]);

  return (
    <article className="surface reports-share-surface">
      <div className="reports-section-heading"><div><h2>Cơ cấu kỳ này</h2><p>Tỷ trọng giữa các danh mục.</p></div></div>
      {activeCategories.length === 0 ? (
        <div className="reports-panel-empty">Chưa có khoản chi trong kỳ này.</div>
      ) : (
        <div className="reports-share-layout">
          <div className="reports-donut" style={{ "--reports-donut": gradient } as CSSProperties} aria-label={`Tổng chi ${formatCurrency(total)}`}>
            <div><strong>{formatChartValue(total)}</strong><small>Tổng chi</small></div>
          </div>
          <div className="reports-share-list">
            {shareCategories.map((category, index) => (
              <div className="reports-share-row" key={category.category_id}>
                <i style={{ backgroundColor: expensePalette[index % expensePalette.length] }} />
                <span title={category.category_name}>{category.category_name}</span>
                <strong>{formatCurrency(category.current_amount)}</strong>
                <small>{percentFormatter.format(category.current_share)}%</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function MoversPanel({ categories }: { categories: ReportCategoryComparison[] }) {
  const movers = [...categories].filter((category) => category.difference !== 0).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, 5);
  return (
    <article className="surface reports-movers-surface">
      <div className="reports-section-heading"><div><h2>Biến động nổi bật</h2><p>Các thay đổi có giá trị lớn nhất.</p></div></div>
      {movers.length === 0 ? (
        <div className="reports-panel-empty">Chi tiêu không thay đổi giữa hai kỳ.</div>
      ) : (
        <div className="reports-movers-table">
          <div className="reports-movers-head"><span>Danh mục</span><span>Chênh lệch</span><span>Tỷ lệ</span></div>
          {movers.map((category, index) => {
            const Icon = getCategoryIcon(category.icon, "expense");
            const increased = category.difference > 0;
            return (
              <div className="reports-mover-row" key={category.category_id}>
                <span className="reports-category-icon" style={{ "--report-category-color": expensePalette[index % expensePalette.length] } as CSSProperties}><Icon size={16} /></span>
                <strong title={category.category_name}>{category.category_name}</strong>
                <span className={increased ? "is-expense-up" : "is-expense-down"}>{increased ? "+" : ""}{formatCurrency(category.difference)}</span>
                <b className={increased ? "is-expense-up" : "is-expense-down"}>{category.change_percentage == null ? "Mới" : `${category.change_percentage > 0 ? "+" : ""}${percentFormatter.format(category.change_percentage)}%`}</b>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function CategoryDetailTable({
  categories,
  period,
  currentTotal,
  previousTotal,
  totalDifference,
  totalChange,
}: {
  categories: ReportCategoryComparison[];
  period: string;
  currentTotal: number;
  previousTotal: number;
  totalDifference: number;
  totalChange: number | null;
}) {
  return (
    <section className="surface reports-detail-surface">
      <div className="reports-section-heading"><div><h2>Chi tiết theo danh mục</h2><p>Số tiền, tỷ trọng, số giao dịch và mức thay đổi của từng danh mục.</p></div></div>
      <div
        className="reports-table-scroll"
        role="region"
        aria-label="Bảng chi tiết chi tiêu theo danh mục; có thể cuộn ngang"
        tabIndex={0}
      >
        <table className="reports-detail-table">
          <caption className="sr-only">Chi tiết chi tiêu theo danh mục của kỳ này và kỳ trước</caption>
          <thead><tr><th>Danh mục</th><th>Kỳ này</th><th>Tỷ trọng</th><th>Kỳ trước</th><th>Chênh lệch</th><th>Thay đổi</th><th>Giao dịch</th><th /></tr></thead>
          <tbody>
            {categories.map((category, index) => {
              const Icon = getCategoryIcon(category.icon, "expense");
              const increased = category.difference > 0;
              const decreased = category.difference < 0;
              return (
                <tr key={category.category_id}>
                  <td><span className="reports-category-icon" style={{ "--report-category-color": expensePalette[index % expensePalette.length] } as CSSProperties}><Icon size={16} /></span><strong>{category.category_name}</strong></td>
                  <td className="reports-expense-value">{formatCurrency(category.current_amount)}</td>
                  <td>{percentFormatter.format(category.current_share)}%</td>
                  <td>{formatCurrency(category.previous_amount)}</td>
                  <td className={increased ? "is-expense-up" : decreased ? "is-expense-down" : ""}>{increased ? "+" : ""}{formatCurrency(category.difference)}</td>
                  <td className={increased ? "is-expense-up" : decreased ? "is-expense-down" : ""}>{category.change_percentage == null ? "Mới phát sinh" : `${category.change_percentage > 0 ? "+" : ""}${percentFormatter.format(category.change_percentage)}%`}</td>
                  <td>{category.current_transaction_count}</td>
                  <td><Link to={`/transactions?period=${period}&type=expense&category_id=${category.category_id}`}>Xem giao dịch</Link></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td>Tổng cộng</td><td>{formatCurrency(currentTotal)}</td><td>{currentTotal > 0 ? "100%" : "0%"}</td><td>{formatCurrency(previousTotal)}</td><td>{totalDifference > 0 ? "+" : ""}{formatCurrency(totalDifference)}</td><td>{totalChange == null ? (totalDifference === 0 ? "0%" : "Mới phát sinh") : `${totalChange > 0 ? "+" : ""}${percentFormatter.format(totalChange)}%`}</td><td>{categories.reduce((sum, category) => sum + category.current_transaction_count, 0)}</td><td /></tr></tfoot>
        </table>
      </div>
    </section>
  );
}

function ReportsSkeleton() {
  return (
    <div className="reports-loading" aria-live="polite" aria-busy="true">
      <span className="sr-only">Đang tải báo cáo</span>
      <section className="surface reports-skeleton reports-skeleton--summary" />
      <section className="reports-analysis-grid"><div className="surface reports-skeleton reports-skeleton--chart" /><div className="reports-side-column"><div className="surface reports-skeleton reports-skeleton--side" /><div className="surface reports-skeleton reports-skeleton--side" /></div></section>
      <section className="surface reports-skeleton reports-skeleton--table" />
    </div>
  );
}
