import { describe, expect, it } from "vitest";
import { formatCurrency, moneyInputValue, parseMoneyInput } from "./format";
import { businessDateValue, monthChoices } from "./dates";

describe("money and Vietnamese business dates", () => {
  it.each([0.01, 1.23, 999999999999.99])("preserves %s through an edit roundtrip", (amount) => {
    expect(parseMoneyInput(moneyInputValue(amount))).toBe(amount);
  });
  it.each(["1.235", "1,234", "1.000,00", "1abc23", "1e3", "", "-1"]) ("does not silently reinterpret %s", (input) => {
    expect(parseMoneyInput(input)).toBeNaN();
  });
  it("formats fractional VND and accepts either decimal separator", () => {
    expect(formatCurrency(1.23)).toBe("1,23 ₫");
    expect(parseMoneyInput(" 1.23 ")).toBe(1.23);
  });
  it("uses Vietnam's date across UTC midnight and the year boundary", () => {
    expect(businessDateValue(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
    expect(businessDateValue(new Date("2026-12-31T16:59:59Z"))).toBe("2026-12-31");
    expect(monthChoices("2027-01-01", 2).map((item) => item.value)).toEqual(["2027-01", "2026-12"]);
  });
});
