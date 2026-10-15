import type { Category, DashboardData, ReportData, Transaction, User } from "../types";
import { businessDateValue } from "../lib/dates";

export const user: User = { id: "owner", username: "demo", email: "demo@example.com", display_name: null, avatar_url: null };
export const categories: Category[] = [
  { id: "food", name: "Ăn uống", type: "expense", color: "#07845c", icon: "utensils" },
  { id: "salary", name: "Lương", type: "income", color: "#2563eb", icon: "banknote" },
];
export const transactions: Transaction[] = [
  { id: "expense", category_id: "food", amount: 1.23, type: "expense", txn_date: businessDateValue().slice(0, 7) + "-01", note: "Cà phê" },
  { id: "income", category_id: "salary", amount: 1000, type: "income", txn_date: businessDateValue().slice(0, 7) + "-01", note: "Lương mẫu" },
];
export const dashboard: DashboardData = {
  month: 10, year: 2026,
  summary: { income: 1000, expense: 1.23, net: 998.77, available_balance: 2998.77 },
  spending_by_category: Array.from({ length: 6 }, (_, i) => ({ category_id: "food" + i, category_name: "Danh mục " + i, color: i === 0 ? "invalid" : "#07845c", icon: "utensils", amount: 100 - i, percentage: 17 })),
  trend: [
    { month: 8, year: 2026, income: 0, expense: 0 },
    { month: 9, year: 2026, income: 500, expense: 100 },
    { month: 10, year: 2026, income: 1000, expense: 1.23 },
  ],
  recent_transactions: transactions.map((row) => ({ ...row, category_name: row.type === "income" ? "Lương" : "Ăn uống", category_color: "#07845c", category_icon: "utensils" })),
};
export const report: ReportData = {
  current_period: { month: 10, year: 2026 }, previous_period: { month: 9, year: 2026 },
  summary: {
    current: { income: 1000, expense: 1.23, net: 998.77 }, previous: { income: 500, expense: 100, net: 400 },
    income_difference: 500, expense_difference: -98.77, net_difference: 598.77,
    income_change_percentage: 100, expense_change_percentage: -98.77, net_change_percentage: null,
  },
  categories: Array.from({ length: 9 }, (_, i) => ({
    category_id: "category-" + i, category_name: i === 0 ? "Ăn uống kiểm thử" : "Danh mục " + i, icon: "utensils",
    current_amount: 1.23 + i, current_share: 10, current_transaction_count: 1,
    previous_amount: i === 0 ? 100 : 0, previous_share: i === 0 ? 100 : 0, previous_transaction_count: i === 0 ? 1 : 0,
    difference: i === 0 ? -98.77 : 1.23 + i, change_percentage: i === 0 ? -98.77 : null,
  })), has_data: true,
};
