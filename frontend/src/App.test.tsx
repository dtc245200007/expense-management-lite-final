import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { api, TOKEN_KEY } from "./lib/api";

const user = { id: "owner", username: "demo", email: "demo@example.com", display_name: null, avatar_url: null };
const dashboard = {
  month: 1, year: 2025,
  summary: { income: 1000000, expense: 120000, net: 880000, available_balance: 880000 },
  spending_by_category: [], trend: [], recent_transactions: [],
};
const report = {
  current_period: { month: 1, year: 2025 }, previous_period: { month: 12, year: 2024 },
  summary: {
    current: { income: 1000000, expense: 120000, net: 880000 },
    previous: { income: 0, expense: 0, net: 0 },
    income_difference: 1000000, expense_difference: 120000, net_difference: 880000,
    income_change_percentage: null, expense_change_percentage: null, net_change_percentage: null,
  }, categories: [], has_data: true,
};

function renderApp(path: string, loggedIn = true) {
  if (loggedIn) localStorage.setItem(TOKEN_KEY, "synthetic-token");
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

describe("Lite user journeys", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(api, "getMe").mockResolvedValue(user);
    vi.spyOn(api, "getDashboard").mockResolvedValue(dashboard);
    vi.spyOn(api, "listCategories").mockResolvedValue([]);
    vi.spyOn(api, "listTransactions").mockResolvedValue([]);
    vi.spyOn(api, "getReport").mockResolvedValue(report);
  });

  it.each([["/dashboard", "Tổng quan"], ["/transactions", "Giao dịch"], ["/categories", "Danh mục"], ["/reports", "Báo cáo"]])("opens %s and exposes the four supported pages", async (path, title) => {
    renderApp(path);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Điều hướng chính" }).querySelectorAll("a")).toHaveLength(4);
    expect(screen.queryByRole("link", { name: "Trợ lý AI" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ngân sách" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mục tiêu" })).not.toBeInTheDocument();
  });

  it.each(["/assistant", "/budgets", "/goals", "/forgot-password", "/reset-password"])("redirects removed URL %s to the supported home", async (path) => {
    renderApp(path);
    expect(await screen.findByRole("heading", { level: 1, name: "Tổng quan" })).toBeInTheDocument();
  });

  it("requires login and offers registration without a reset-password dependency", async () => {
    renderApp("/transactions", false);
    expect(await screen.findByRole("heading", { name: "Chào mừng bạn trở lại" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Quên mật khẩu/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/register"]')).toBeInTheDocument();
  });

  it("logs out and clears the Lite token", async () => {
    renderApp("/dashboard");
    await screen.findByRole("heading", { level: 1, name: "Tổng quan" });
    await userEvent.click(screen.getAllByRole("button", { name: "Đăng xuất" })[0]);
    expect(await screen.findByRole("heading", { name: "Chào mừng bạn trở lại" })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("submits username and password and opens the authenticated dashboard", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ access_token: "login-test-token", token_type: "bearer" });
    renderApp("/login", false);
    await userEvent.type(await screen.findByLabelText("Tên đăng nhập hoặc email"), "demo");
    await userEvent.type(screen.getByLabelText("Mật khẩu", { exact: true }), "synthetic-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Tổng quan" })).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith("demo", "synthetic-password-123");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("login-test-token");
  });

  it("registers a new account and returns to login", async () => {
    vi.spyOn(api, "register").mockResolvedValue(user);
    renderApp("/register", false);
    await userEvent.type(await screen.findByLabelText("Tên đăng nhập"), "new-user");
    await userEvent.type(screen.getByLabelText(/^Email/), "new-user@example.com");
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), "synthetic-password-123");
    await userEvent.type(screen.getByLabelText("Xác nhận mật khẩu"), "synthetic-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByRole("heading", { name: "Chào mừng bạn trở lại" })).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledWith({ username: "new-user", email: "new-user@example.com", password: "synthetic-password-123" });
  });

  it("recovers after a dashboard loading failure", async () => {
    vi.mocked(api.getDashboard).mockRejectedValueOnce(new Error("temporary failure"));
    renderApp("/dashboard");
    expect(await screen.findByText(/Không thể tải dữ liệu Dashboard/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.queryByText(/Không thể tải dữ liệu Dashboard/)).not.toBeInTheDocument());
    expect(api.getDashboard).toHaveBeenCalledTimes(2);
  });
});
