import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../App";
import { api, ApiError, TOKEN_KEY } from "../lib/api";
import { categories, dashboard, report, user } from "../test/fixtures";

beforeEach(() => {
  vi.spyOn(api, "getMe").mockResolvedValue(user);
  vi.spyOn(api, "getDashboard").mockResolvedValue(dashboard);
  vi.spyOn(api, "getReport").mockResolvedValue(report);
  vi.spyOn(api, "listTransactions").mockResolvedValue([]);
  vi.spyOn(api, "listCategories").mockResolvedValue(categories);
  localStorage.setItem(TOKEN_KEY, "account-A");
});
const mount = (path = "/dashboard") => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
function storage(token: string | null, key: string | null = TOKEN_KEY) {
  if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: token }));
}

it.each([new ApiError("temporary outage", 503), new TypeError("offline")])("preserves a valid token on a transient restoration failure and retries", async (error) => {
  vi.mocked(api.getMe).mockRejectedValueOnce(error);
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Chưa thể kiểm tra phiên");
  expect(localStorage.getItem(TOKEN_KEY)).toBe("account-A");
  await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(await screen.findByRole("heading", { name: "Tổng quan", level: 1 })).toBeInTheDocument();
});

it("removes an expired token and offers login", async () => {
  vi.mocked(api.getMe).mockRejectedValueOnce(new ApiError("expired", 401)); mount();
  expect(await screen.findByLabelText("Tên đăng nhập hoặc email")).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});

it("unmounts account A's data and restores account B on a token change", async () => {
  mount("/categories");
  await screen.findByText("Ăn uống");
  vi.mocked(api.getMe).mockResolvedValue({ ...user, id: "other", username: "other-user" });
  vi.mocked(api.listCategories).mockResolvedValue([{ ...categories[0], id: "other-food", name: "Other account food" }]);
  act(() => storage("account-B"));
  expect(await screen.findByText("other-user")).toBeInTheDocument();
  expect(await screen.findByText("Other account food")).toBeInTheDocument();
  expect(screen.queryByText("Ăn uống")).not.toBeInTheDocument();
});

it.each([TOKEN_KEY, null])("clears account data when another tab clears storage key %s", async (key) => {
  mount(); await screen.findByRole("heading", { name: "Tổng quan", level: 1 });
  act(() => storage(null, key));
  expect(await screen.findByLabelText("Tên đăng nhập hoặc email")).toBeInTheDocument();
});

it("ignores a delayed response for the previous account", async () => {
  let resolveOld!: (value: typeof user) => void;
  vi.mocked(api.getMe).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  mount();
  await waitFor(() => expect(api.getMe).toHaveBeenCalledOnce());
  vi.mocked(api.getMe).mockResolvedValue({ ...user, id: "other", username: "other-user" });
  act(() => storage("account-B"));
  await screen.findByText("other-user");
  await act(async () => resolveOld(user));
  expect(screen.queryByText("demo")).not.toBeInTheDocument();
  expect(screen.getByText("other-user")).toBeInTheDocument();
});

it("allows explicitly logging out from the restoration error screen", async () => {
  vi.mocked(api.getMe).mockRejectedValueOnce(new TypeError("offline")); mount("/login");
  await screen.findByRole("alert");
  await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
  expect(await screen.findByLabelText("Tên đăng nhập hoặc email")).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});
