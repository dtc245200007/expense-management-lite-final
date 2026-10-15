import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, AUTH_SESSION_CHANGED_EVENT, AUTH_UNAUTHORIZED_EVENT, bindSessionToken, TOKEN_KEY } from "./api";
import { categories, dashboard, report, transactions, user } from "../test/fixtures";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("API transport and data contracts", () => {
  beforeEach(() => { bindSessionToken(undefined); vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { bindSessionToken(undefined); vi.unstubAllGlobals(); });

  it("uses form login, anonymous registration and explicit session restoration", async () => {
    localStorage.setItem(TOKEN_KEY, "old-token");
    bindSessionToken("different-tab-token");
    vi.mocked(fetch).mockResolvedValueOnce(reply({ access_token: "new", token_type: "bearer" })).mockResolvedValueOnce(reply(user)).mockResolvedValueOnce(reply(user));
    await api.login("demo", "password-123");
    await api.register({ username: "demo", email: "demo@example.com", password: "password-123" });
    await api.getMe(undefined, "old-token");
    const [, loginInit] = vi.mocked(fetch).mock.calls[0];
    expect(String(loginInit?.body)).toBe("username=demo&password=password-123");
    expect(loginInit?.headers).not.toHaveProperty("Authorization");
    expect(vi.mocked(fetch).mock.calls[2][1]?.headers).toHaveProperty("Authorization", "Bearer old-token");
  });

  it("normalizes decimal strings in dashboard and report responses", async () => {
    const strings = (value: unknown) => JSON.parse(JSON.stringify(value, (_, v) => typeof v === "number" ? String(v) : v));
    vi.mocked(fetch).mockResolvedValueOnce(reply(strings(dashboard))).mockResolvedValueOnce(reply(strings(report)));
    const d = await api.getDashboard(10, 2026);
    const r = await api.getReport(10, 2026);
    expect(d.summary.expense).toBe(1.23);
    expect(d.spending_by_category[0].amount).toBe(100);
    expect(d.trend[1].income).toBe(500);
    expect(d.recent_transactions[0].amount).toBe(1.23);
    expect(r.summary.expense_difference).toBe(-98.77);
    expect(r.summary.net_change_percentage).toBeNull();
    expect(r.categories[0].previous_amount).toBe(100);
    expect(r.categories[1].change_percentage).toBeNull();
  });

  it("sends category and transaction CRUD and filters without losing decimal amounts", async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return reply(String(url).includes("categories") ? init?.method ? categories[0] : categories : init?.method ? { ...transactions[0], amount: "1.23" } : [{ ...transactions[0], amount: "1.23" }]);
    });
    expect(await api.listCategories()).toEqual(categories);
    await api.createCategory(categories[0]);
    await api.updateCategory("food", { name: "Updated" });
    await api.deleteCategory("food");
    expect((await api.listTransactions({ keyword: "cà phê", type: "expense", category_id: "food", from_date: "2026-10-01", to_date: "" }))[0].amount).toBe(1.23);
    await api.listTransactions();
    expect((await api.createTransaction(transactions[0])).amount).toBe(1.23);
    expect((await api.updateTransaction("expense", { amount: 1.23 })).amount).toBe(1.23);
    await api.deleteTransaction("expense");
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("keyword=c%C3%A0+ph%C3%AA"))).toBe(true);
    expect(vi.mocked(fetch).mock.calls[6][1]?.body).toContain('"amount":1.23');
  });

  it.each([
    [422, { detail: [{ msg: "invalid amount" }] }, "invalid amount"],
    [400, { detail: "duplicate" }, "duplicate"],
    [503, { detail: 123 }, "Không thể kết nối"],
    [401, {}, "Phiên đăng nhập"],
  ])("reports HTTP %s without hiding validation errors", async (status, body, message) => {
    vi.mocked(fetch).mockResolvedValue(reply(body, status));
    await expect(api.listCategories()).rejects.toThrow(message);
  });

  it("handles non-JSON server errors and network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("temporary proxy fault", { status: 502 })).mockRejectedValueOnce(new TypeError("network down"));
    await expect(api.listCategories()).rejects.toMatchObject({ status: 502 });
    await expect(api.listCategories()).rejects.toThrow("network down");
  });

  it("expires only the currently authenticated session on 401", async () => {
    const unauthorized = vi.fn(); window.addEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorized);
    localStorage.setItem(TOKEN_KEY, "current");
    vi.mocked(fetch).mockResolvedValueOnce(reply({}, 401));
    await expect(api.listCategories()).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toHaveBeenCalledOnce();
    vi.mocked(fetch).mockImplementationOnce(async () => { localStorage.setItem(TOKEN_KEY, "new"); return reply({}, 401); });
    await expect(api.listCategories()).rejects.toMatchObject({ status: 409 });
    expect(unauthorized).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorized);
  });

  it("blocks mutations when storage changes before its event reaches the tab", async () => {
    bindSessionToken("account-A"); localStorage.setItem(TOKEN_KEY, "account-B");
    const changed = vi.fn(); window.addEventListener(AUTH_SESSION_CHANGED_EVENT, changed);
    await expect(api.createCategory(categories[0])).rejects.toMatchObject({ status: 409 });
    expect(fetch).not.toHaveBeenCalled(); expect(changed).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, changed);
  });
});
