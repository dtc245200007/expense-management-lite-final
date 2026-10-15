export type CategoryType = "income" | "expense";

export type CategoryIconKey =
  | "circle-dollar-sign"
  | "wallet"
  | "utensils"
  | "shopping-bag"
  | "house"
  | "car"
  | "bus"
  | "fuel"
  | "smartphone"
  | "receipt"
  | "heart-pulse"
  | "graduation-cap"
  | "gamepad-2"
  | "dog"
  | "baby"
  | "dumbbell"
  | "plane"
  | "gift"
  | "piggy-bank"
  | "banknote"
  | "briefcase-business"
  | "trending-up"
  | "hand-coins"
  | "badge-dollar-sign";

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: CategoryIconKey;
}

export interface CategoryPayload {
  name: string;
  type: CategoryType;
  color: string;
  icon: CategoryIconKey;
}

export interface Transaction {
  id: string;
  category_id: string;
  amount: number;
  type: CategoryType;
  txn_date: string;
  note: string | null;
}

export interface TransactionPayload {
  category_id: string;
  amount: number;
  txn_date: string;
  note: string | null;
}

export interface TransactionFilters {
  category_id?: string;
  type?: CategoryType;
  from_date?: string;
  to_date?: string;
  keyword?: string;
}

export interface DashboardSummary {
  income: number;
  expense: number;
  net: number;
  available_balance: number;
}

export interface DashboardCategorySpending {
  category_id: string;
  category_name: string;
  color: string;
  icon: CategoryIconKey;
  amount: number;
  percentage: number;
}

export interface DashboardTrendPoint {
  month: number;
  year: number;
  income: number;
  expense: number;
}

export interface DashboardRecentTransaction {
  id: string;
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: CategoryIconKey;
  amount: number;
  type: CategoryType;
  txn_date: string;
  note: string | null;
}

export interface DashboardData {
  month: number;
  year: number;
  summary: DashboardSummary;
  spending_by_category: DashboardCategorySpending[];
  trend: DashboardTrendPoint[];
  recent_transactions: DashboardRecentTransaction[];
}

export interface ReportPeriod {
  month: number;
  year: number;
}

export interface ReportPeriodTotals {
  income: number;
  expense: number;
  net: number;
}

export interface ReportSummary {
  current: ReportPeriodTotals;
  previous: ReportPeriodTotals;
  income_difference: number;
  expense_difference: number;
  net_difference: number;
  income_change_percentage: number | null;
  expense_change_percentage: number | null;
  net_change_percentage: number | null;
}

export interface ReportCategoryComparison {
  category_id: string;
  category_name: string;
  icon: CategoryIconKey;
  current_amount: number;
  current_share: number;
  current_transaction_count: number;
  previous_amount: number;
  previous_share: number;
  previous_transaction_count: number;
  difference: number;
  change_percentage: number | null;
}

export interface ReportData {
  current_period: ReportPeriod;
  previous_period: ReportPeriod;
  summary: ReportSummary;
  categories: ReportCategoryComparison[];
  has_data: boolean;
}
