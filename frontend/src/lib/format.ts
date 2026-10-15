export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value) + " ₫";

export function parseMoneyInput(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return NaN;
  return Number(value.trim().replace(",", "."));
}

export const moneyInputValue = (value: number) => String(value).replace(".", ",");

export const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value) + " ₫";
