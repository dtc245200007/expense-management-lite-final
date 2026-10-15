import type {
  AuthToken, Category, CategoryPayload, DashboardData, RegisterPayload,
  ReportData, Transaction, TransactionFilters, TransactionPayload, User,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");
export const TOKEN_KEY = "expense_lite_access_token";
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";
export const AUTH_SESSION_CHANGED_EVENT = "auth:session-changed";
let sessionToken: string | null | undefined;

export function bindSessionToken(token: string | null | undefined) {
  sessionToken = token;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit, explicitToken?: string | null): Promise<T> {
  const anonymous = path === "/auth/login" || path === "/auth/register";
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const token = anonymous ? null : explicitToken !== undefined ? explicitToken : sessionToken !== undefined ? sessionToken : storedToken;
  // Guard even before the browser delivers its asynchronous storage event.
  if (!anonymous && explicitToken === undefined && token !== storedToken) {
    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
    throw new ApiError("Phiên đăng nhập đã thay đổi. Vui lòng chờ tải lại tài khoản.", 409);
  }
  const usesFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(!usesFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!anonymous && token !== localStorage.getItem(TOKEN_KEY)) {
    throw new ApiError("Phiên đăng nhập đã thay đổi.", 409);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: unknown } | null;
    const validationMessage = Array.isArray(body?.detail)
      ? body.detail.find((item): item is { msg: string } => Boolean(item) && typeof item === "object" && "msg" in item && typeof item.msg === "string")?.msg
      : undefined;
    const message = typeof body?.detail === "string"
      ? body.detail
      : validationMessage
        ? validationMessage
        : response.status === 401
          ? "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
          : "Không thể kết nối với máy chủ. Vui lòng thử lại.";
    if (response.status === 401 && token && !anonymous) {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const asNumber = (value: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTransaction = (transaction: Transaction): Transaction => ({
  ...transaction,
  amount: asNumber(transaction.amount),
});

const normalizeDashboard = (data: DashboardData): DashboardData => ({
  ...data,
  summary: {
    income: asNumber(data.summary.income),
    expense: asNumber(data.summary.expense),
    net: asNumber(data.summary.net),
    available_balance: asNumber(data.summary.available_balance),
  },
  spending_by_category: data.spending_by_category.map((item) => ({
    ...item,
    amount: asNumber(item.amount),
    percentage: asNumber(item.percentage),
  })),
  trend: data.trend.map((item) => ({
    ...item,
    income: asNumber(item.income),
    expense: asNumber(item.expense),
  })),
  recent_transactions: data.recent_transactions.map((item) => ({
    ...item,
    amount: asNumber(item.amount),
  })),
});

const normalizeReport = (data: ReportData): ReportData => ({
  ...data,
  summary: {
    ...data.summary,
    current: {
      income: asNumber(data.summary.current.income),
      expense: asNumber(data.summary.current.expense),
      net: asNumber(data.summary.current.net),
    },
    previous: {
      income: asNumber(data.summary.previous.income),
      expense: asNumber(data.summary.previous.expense),
      net: asNumber(data.summary.previous.net),
    },
    income_difference: asNumber(data.summary.income_difference),
    expense_difference: asNumber(data.summary.expense_difference),
    net_difference: asNumber(data.summary.net_difference),
    income_change_percentage: data.summary.income_change_percentage == null ? null : asNumber(data.summary.income_change_percentage),
    expense_change_percentage: data.summary.expense_change_percentage == null ? null : asNumber(data.summary.expense_change_percentage),
    net_change_percentage: data.summary.net_change_percentage == null ? null : asNumber(data.summary.net_change_percentage),
  },
  categories: data.categories.map((category) => ({
    ...category,
    current_amount: asNumber(category.current_amount),
    current_share: asNumber(category.current_share),
    current_transaction_count: asNumber(category.current_transaction_count),
    previous_amount: asNumber(category.previous_amount),
    previous_share: asNumber(category.previous_share),
    previous_transaction_count: asNumber(category.previous_transaction_count),
    difference: asNumber(category.difference),
    change_percentage: category.change_percentage == null ? null : asNumber(category.change_percentage),
  })),
});

export const api = {
  login: (identifier: string, password: string) => {
    const body = new URLSearchParams({ username: identifier, password });
    return request<AuthToken>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  },
  register: (payload: RegisterPayload) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  getMe: (signal?: AbortSignal, token?: string) => request<User>("/auth/me", { signal }, token),
  getDashboard: (month: number, year: number, signal?: AbortSignal) =>
    request<DashboardData>(`/dashboard/?month=${month}&year=${year}`, { signal }).then(normalizeDashboard),
  getReport: (month: number, year: number, signal?: AbortSignal) =>
    request<ReportData>(`/reports/?month=${month}&year=${year}`, { signal }).then(normalizeReport),
  listCategories: (signal?: AbortSignal) => request<Category[]>("/categories/", { signal }),
  createCategory: (payload: CategoryPayload) =>
    request<Category>("/categories/", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: Partial<CategoryPayload>) =>
    request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id: string) => request<{ message: string }>(`/categories/${id}`, { method: "DELETE" }),
  listTransactions: (filters: TransactionFilters = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const suffix = query.size ? `?${query.toString()}` : "";
    return request<Transaction[]>(`/transactions/${suffix}`, { signal })
      .then((items) => items.map(normalizeTransaction));
  },
  createTransaction: (payload: TransactionPayload) =>
    request<Transaction>("/transactions/", { method: "POST", body: JSON.stringify(payload) }).then(normalizeTransaction),
  updateTransaction: (id: string, payload: Partial<TransactionPayload>) =>
    request<Transaction>(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then(normalizeTransaction),
  deleteTransaction: (id: string) => request<{ message: string }>(`/transactions/${id}`, { method: "DELETE" }),
};
