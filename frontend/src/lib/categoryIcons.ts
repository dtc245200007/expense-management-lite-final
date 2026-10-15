import {
  Baby,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Bus,
  Car,
  CircleDollarSign,
  Dog,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIconKey, CategoryType } from "../types";

export type CategoryIconGroup = "Phổ biến" | "Hằng ngày" | "Mục tiêu" | "Thu nhập & tiết kiệm";

export interface CategoryIconOption {
  key: CategoryIconKey;
  label: string;
  group: CategoryIconGroup;
  icon: LucideIcon;
}

export const categoryIconOptions: CategoryIconOption[] = [
  { key: "circle-dollar-sign", label: "Tiền bạc", group: "Phổ biến", icon: CircleDollarSign },
  { key: "wallet", label: "Ví tiền", group: "Phổ biến", icon: Wallet },
  { key: "utensils", label: "Ăn uống", group: "Phổ biến", icon: Utensils },
  { key: "shopping-bag", label: "Mua sắm", group: "Phổ biến", icon: ShoppingBag },
  { key: "house", label: "Nhà cửa", group: "Phổ biến", icon: House },
  { key: "car", label: "Ô tô", group: "Phổ biến", icon: Car },
  { key: "bus", label: "Xe buýt", group: "Hằng ngày", icon: Bus },
  { key: "fuel", label: "Nhiên liệu", group: "Hằng ngày", icon: Fuel },
  { key: "smartphone", label: "Điện thoại", group: "Hằng ngày", icon: Smartphone },
  { key: "receipt", label: "Hóa đơn", group: "Hằng ngày", icon: Receipt },
  { key: "heart-pulse", label: "Sức khỏe", group: "Hằng ngày", icon: HeartPulse },
  { key: "graduation-cap", label: "Giáo dục", group: "Hằng ngày", icon: GraduationCap },
  { key: "gamepad-2", label: "Giải trí", group: "Hằng ngày", icon: Gamepad2 },
  { key: "dog", label: "Thú cưng", group: "Hằng ngày", icon: Dog },
  { key: "baby", label: "Trẻ em", group: "Hằng ngày", icon: Baby },
  { key: "dumbbell", label: "Thể thao", group: "Hằng ngày", icon: Dumbbell },
  { key: "plane", label: "Du lịch", group: "Mục tiêu", icon: Plane },
  { key: "gift", label: "Quà tặng", group: "Mục tiêu", icon: Gift },
  { key: "piggy-bank", label: "Tiết kiệm", group: "Mục tiêu", icon: PiggyBank },
  { key: "banknote", label: "Tiền mặt", group: "Thu nhập & tiết kiệm", icon: Banknote },
  { key: "briefcase-business", label: "Lương", group: "Thu nhập & tiết kiệm", icon: BriefcaseBusiness },
  { key: "trending-up", label: "Đầu tư", group: "Thu nhập & tiết kiệm", icon: TrendingUp },
  { key: "hand-coins", label: "Thu nhập khác", group: "Thu nhập & tiết kiệm", icon: HandCoins },
  { key: "badge-dollar-sign", label: "Thưởng", group: "Thu nhập & tiết kiệm", icon: BadgeDollarSign },
];

const iconRegistry = Object.fromEntries(
  categoryIconOptions.map((option) => [option.key, option.icon]),
) as Partial<Record<CategoryIconKey, LucideIcon>>;

export const getCategoryIcon = (
  key: CategoryIconKey | string | null | undefined,
  type: CategoryType,
): LucideIcon => iconRegistry[key as CategoryIconKey] ?? (type === "income" ? Banknote : Wallet);
