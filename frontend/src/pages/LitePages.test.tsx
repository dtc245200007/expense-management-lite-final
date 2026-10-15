import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { CategoriesPage } from "./CategoriesPage";
import { TransactionsPage } from "./TransactionsPage";
import { DashboardPage } from "./DashboardPage";
import { ReportsPage } from "./ReportsPage";
import { api } from "../lib/api";
import { businessDateValue, monthChoices } from "../lib/dates";
import { categories, transactions, dashboard, report } from "../test/fixtures";
import type { Category, Transaction } from "../types";

beforeEach(() => {
  vi.spyOn(api, "listCategories").mockResolvedValue(categories);
  vi.spyOn(api, "listTransactions").mockResolvedValue(transactions);
  vi.spyOn(api, "getDashboard").mockResolvedValue(dashboard);
  vi.spyOn(api, "getReport").mockResolvedValue(report);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const mount = (element: React.ReactNode, path = "/") => render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
async function transactionPage() {
  mount(<TransactionsPage />); await screen.findByText("Cà phê");
  return within(screen.getByRole("complementary", { name: "Ghi nhanh giao dịch" }));
}
async function menu(note: string, action: string) {
  await userEvent.click(screen.getByRole("button", { name: "Thao tác với " + note }));
  await userEvent.click(screen.getByRole("button", { name: action }));
}

it("edits a fractional transaction without changing its amount", async () => {
  vi.spyOn(api, "updateTransaction").mockResolvedValue(transactions[0]);
  await transactionPage(); await menu("Cà phê", "Chỉnh sửa");
  expect(screen.getByLabelText("Số tiền giao dịch")).toHaveValue("1,23");
  await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await screen.findByText("Đã cập nhật giao dịch.");
  expect(api.updateTransaction).toHaveBeenCalledWith("expense", expect.objectContaining({ amount: 1.23 }));
  expect(screen.getAllByText(/1,23 ₫/).length).toBeGreaterThan(0);
});

it("creates a fractional income transaction through the form", async () => {
  vi.spyOn(api, "createTransaction").mockImplementation(async (payload) => ({ ...payload, id: "new", type: "income" }));
  const form = await transactionPage();
  await userEvent.click(form.getByRole("button", { name: "Khoản thu" }));
  await userEvent.type(form.getByLabelText("Số tiền giao dịch"), "123,45");
  await userEvent.type(form.getByPlaceholderText("Ví dụ: Đi chợ cuối tuần"), "Thu nhập mới");
  await userEvent.click(form.getByRole("button", { name: "Lưu giao dịch" }));
  await screen.findByText("Thu nhập mới");
  expect(api.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ category_id: "salary", amount: 123.45, note: "Thu nhập mới" }));
});

it.each(["0", "0.001", "1.235", "1000000000000", "1abc23"]) ("rejects invalid amount %s before sending a request", async (amount) => {
  vi.spyOn(api, "createTransaction"); const form = await transactionPage();
  await userEvent.type(form.getByLabelText("Số tiền giao dịch"), amount);
  await userEvent.click(form.getByRole("button", { name: "Lưu giao dịch" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("tối đa 2 chữ số thập phân");
  expect(api.createTransaction).not.toHaveBeenCalled();
});

it("retains form values after a save failure and supports retry", async () => {
  vi.spyOn(api, "createTransaction").mockRejectedValueOnce(new Error("database unavailable")).mockImplementation(async (payload) => ({ ...payload, id: "retry", type: "expense" }));
  const form = await transactionPage();
  await userEvent.type(form.getByLabelText("Số tiền giao dịch"), "2,50");
  await userEvent.click(form.getByRole("button", { name: "Lưu giao dịch" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("database unavailable");
  expect(form.getByLabelText("Số tiền giao dịch")).toHaveValue("2,50");
  await userEvent.click(form.getByRole("button", { name: "Lưu giao dịch" }));
  await screen.findByText("Đã thêm giao dịch.");
});

it("cancels editing and respects deletion cancellation and server errors", async () => {
  vi.spyOn(api, "deleteTransaction").mockRejectedValueOnce(new Error("cannot delete")).mockResolvedValue({ message: "deleted" });
  await transactionPage(); await menu("Cà phê", "Chỉnh sửa");
  await userEvent.click(screen.getAllByRole("button", { name: "Hủy chỉnh sửa" })[0]);
  expect(screen.getByLabelText("Số tiền giao dịch")).toHaveValue("");
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await menu("Cà phê", "Xóa giao dịch"); expect(api.deleteTransaction).not.toHaveBeenCalled();
  await menu("Cà phê", "Xóa giao dịch");
  expect(await screen.findByRole("alert")).toHaveTextContent("cannot delete");
  await menu("Cà phê", "Xóa giao dịch");
  await waitFor(() => expect(screen.queryByText("Cà phê")).not.toBeInTheDocument());
});

it("filters by text, type and category, resets filters and changes period", async () => {
  await transactionPage();
  await userEvent.type(screen.getByRole("textbox", { name: "Tìm giao dịch" }), "không tồn tại");
  await screen.findByText("Không tìm thấy giao dịch");
  await userEvent.click(screen.getAllByRole("button", { name: /Xóa bộ lọc/ })[0]);
  await screen.findByText("Cà phê");
  const filters = document.querySelector(".transaction-filters")! as HTMLElement;
  const selects = within(filters).getAllByRole("combobox");
  await userEvent.selectOptions(selects[0], "income");
  expect(screen.queryByText("Cà phê")).not.toBeInTheDocument();
  await userEvent.selectOptions(selects[1], "salary");
  expect(screen.getByText("Lương mẫu")).toBeInTheDocument();
  fireEvent.change(within(filters).getByLabelText("Từ", { exact: true }), { target: { value: businessDateValue().slice(0, 7) + "-02" } });
  expect(await screen.findByText("Không tìm thấy giao dịch")).toBeInTheDocument();
  const previous = monthChoices(businessDateValue(), 2)[1].value;
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Chọn tháng giao dịch" }), previous);
  await waitFor(() => expect(api.listTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ from_date: previous + "-01" }), expect.any(AbortSignal)));
});

it("paginates many transactions without losing the active page", async () => {
  vi.mocked(api.listTransactions).mockResolvedValue(Array.from({ length: 45 }, (_, i): Transaction => ({ ...transactions[0], id: String(i).padStart(2, "0"), note: "Row " + i })));
  mount(<TransactionsPage />); await screen.findByText("Row 44");
  await userEvent.click(screen.getByRole("button", { name: "Trang giao dịch sau" }));
  expect(screen.getByText("Trang 2 / 7")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Trang giao dịch trước" }));
  await userEvent.click(screen.getByRole("button", { name: "Trang giao dịch 7" }));
  expect(screen.getByText("Trang 7 / 7")).toBeInTheDocument();
});

it("recovers from a transaction loading error", async () => {
  vi.mocked(api.listTransactions).mockRejectedValueOnce(new Error("temporary outage")); mount(<TransactionsPage />);
  await screen.findByText("Chưa tải được giao dịch");
  await userEvent.click(screen.getByRole("button", { name: "Thử lại" })); await screen.findByText("Cà phê");
});

it("offers category creation when no transaction categories exist", async () => {
  vi.mocked(api.listCategories).mockResolvedValue([]); vi.mocked(api.listTransactions).mockResolvedValue([]); mount(<TransactionsPage />);
  await screen.findByText("Chưa có giao dịch trong tháng");
  expect(screen.getByRole("link", { name: "Tạo danh mục" })).toHaveAttribute("href", "/categories");
  await userEvent.click(screen.getAllByRole("button", { name: "Thêm giao dịch" })[0]);
  expect(screen.getByRole("button", { name: "Lưu giao dịch" })).toBeDisabled();
});

it("creates, edits, filters and deletes a category with icon/color choices", async () => {
  const newCategory: Category = { ...categories[1], id: "new", name: "Thưởng", icon: "gift", color: "#1785e5" };
  vi.spyOn(api, "createCategory").mockResolvedValue(newCategory);
  vi.spyOn(api, "updateCategory").mockResolvedValue({ ...newCategory, name: "Thưởng quý" });
  vi.spyOn(api, "deleteCategory").mockResolvedValue({ message: "deleted" });
  mount(<CategoriesPage />); await screen.findByText("Ăn uống");
  await userEvent.click(screen.getByRole("button", { name: "Thêm danh mục" }));
  const panel = within(screen.getByRole("dialog"));
  await userEvent.type(panel.getByLabelText("Tên danh mục"), "Thưởng");
  await userEvent.click(panel.getByRole("button", { name: "Thu nhập" }));
  await userEvent.type(panel.getByLabelText("Tìm biểu tượng danh mục"), "quà");
  await userEvent.click(panel.getByRole("radio", { name: /Quà/ }));
  await userEvent.click(panel.getByRole("button", { name: "Chọn màu #1785e5" }));
  await userEvent.click(panel.getByRole("button", { name: "Tạo danh mục" })); await screen.findByText("Thưởng");
  expect(api.createCategory).toHaveBeenCalledWith(expect.objectContaining({ name: "Thưởng", type: "income", icon: "gift", color: "#1785e5" }));
  await menu("Thưởng", "Chỉnh sửa");
  expect(screen.getByRole("button", { name: "Chi tiêu" })).toBeDisabled();
  await userEvent.clear(screen.getByLabelText("Tên danh mục")); await userEvent.type(screen.getByLabelText("Tên danh mục"), "Thưởng quý");
  await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" })); await screen.findByText("Thưởng quý");
  await userEvent.type(screen.getByLabelText("Tìm kiếm danh mục"), "Thưởng"); expect(screen.queryByText("Ăn uống")).not.toBeInTheDocument();
  await menu("Thưởng quý", "Xóa danh mục"); await waitFor(() => expect(screen.queryByText("Thưởng quý")).not.toBeInTheDocument());
});

it("shows category validation and save errors without closing the form", async () => {
  vi.spyOn(api, "createCategory").mockRejectedValue(new Error("duplicate from server")); mount(<CategoriesPage />); await screen.findByText("Ăn uống");
  await userEvent.click(screen.getByRole("button", { name: "Thêm danh mục" }));
  await userEvent.click(screen.getByRole("button", { name: "Tạo danh mục" })); expect(await screen.findByRole("alert")).toHaveTextContent("Hãy nhập tên");
  await userEvent.type(screen.getByLabelText("Tên danh mục"), "Ăn uống"); await userEvent.click(screen.getByRole("button", { name: "Tạo danh mục" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("đã tồn tại");
  await userEvent.clear(screen.getByLabelText("Tên danh mục")); await userEvent.type(screen.getByLabelText("Tên danh mục"), "Khác");
  await userEvent.click(screen.getByRole("button", { name: "Tạo danh mục" })); expect(await screen.findByRole("alert")).toHaveTextContent("duplicate from server");
  await userEvent.type(screen.getByLabelText("Tìm biểu tượng danh mục"), "zzzzzz"); await screen.findByText("Không tìm thấy biểu tượng phù hợp.");
  await userEvent.keyboard("{Escape}"); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("handles category deletion cancellation, server rejection and a loading retry", async () => {
  vi.mocked(api.listCategories).mockRejectedValueOnce(new Error("temporary"));
  vi.spyOn(api, "deleteCategory").mockRejectedValue(new Error("used category")); mount(<CategoriesPage />);
  await screen.findByText("Chưa tải được danh mục"); await userEvent.click(screen.getByRole("button", { name: "Thử lại" })); await screen.findByText("Ăn uống");
  vi.mocked(window.confirm).mockReturnValueOnce(false); await menu("Ăn uống", "Xóa danh mục"); expect(api.deleteCategory).not.toHaveBeenCalled();
  await menu("Ăn uống", "Xóa danh mục"); expect(await screen.findByRole("alert")).toHaveTextContent("used category");
});

it("renders real dashboard data, switches periods and themes", async () => {
  mount(<DashboardPage />); await screen.findByText("Số dư tích lũy");
  expect(screen.getAllByText(/1,23 ₫/).length).toBeGreaterThan(0);
  expect(screen.getByText("Khác (3)")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Dùng giao diện tối" })); expect(document.documentElement.dataset.theme).toBe("dark");
  await userEvent.click(screen.getByRole("button", { name: "Dùng giao diện sáng" }));
  const previous = monthChoices(businessDateValue(), 2)[1].value;
  await userEvent.selectOptions(screen.getByRole("combobox"), previous);
  await waitFor(() => expect(api.getDashboard).toHaveBeenLastCalledWith(Number(previous.slice(5)), Number(previous.slice(0, 4)), expect.any(AbortSignal)));
});

it("renders populated reports including category detail links and a different period", async () => {
  mount(<ReportsPage />); await screen.findByText("So sánh chi tiêu theo danh mục", { selector: "h2" });
  expect(screen.getByRole("table")).toHaveTextContent("Ăn uống kiểm thử");
  expect(screen.getAllByRole("link").some((link) => link.getAttribute("href")?.includes("category_id=category-0"))).toBe(true);
  const previous = monthChoices(businessDateValue(), 2)[1].value;
  await userEvent.selectOptions(screen.getByRole("combobox"), previous);
  await waitFor(() => expect(api.getReport).toHaveBeenLastCalledWith(Number(previous.slice(5)), Number(previous.slice(0, 4)), expect.any(AbortSignal)));
});

it("shows an empty report and recovers from a loading error", async () => {
  vi.mocked(api.getReport).mockRejectedValueOnce(new Error("report unavailable")).mockResolvedValue({ ...report, has_data: false });
  mount(<ReportsPage />); await screen.findByText("Chưa tải được báo cáo");
  await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByText("Chưa có dữ liệu để lập báo cáo");
  expect(screen.getByRole("link", { name: "Thêm giao dịch" })).toHaveAttribute("href", "/transactions");
});
