import { useEffect, useState } from "react";

export function businessDateValue(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function monthChoices(today: string, count: number) {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(Date.UTC(year, month - 1 - index, 1));
    const yearValue = value.getUTCFullYear();
    const monthValue = value.getUTCMonth() + 1;
    return { value: `${yearValue}-${String(monthValue).padStart(2, "0")}`, label: `Tháng ${monthValue}, ${yearValue}` };
  });
}

export function useBusinessDate() {
  const [today, setToday] = useState(businessDateValue);
  useEffect(() => {
    const update = () => setToday(businessDateValue());
    const interval = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}
