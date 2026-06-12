import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCount(value?: number) {
  if (!value) return "0";
  return new Intl.NumberFormat("ko-KR", { notation: value >= 10000 ? "compact" : "standard" }).format(value);
}

export function compactText(value: string, maxLength = 90) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}
