import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function money(value: string | bigint) {
  return new Intl.NumberFormat("vi-VN").format(BigInt(value)) + " ₫";
}
export function shortMoney(value: string) {
  const n = BigInt(value);
  if (n >= 1000000000n) return `${n / 1000000000n}.${(n % 1000000000n) / 100000000n}B`;
  if (n >= 1000000n) return `${n / 1000000n}.${(n % 1000000n) / 100000n}M`;
  if (n >= 1000n) return `${n / 1000n}k`;
  return n.toString();
}
export function percentChange(current: string, previous: string): number | null {
  const prior = BigInt(previous);
  return prior === 0n ? null : Number(((BigInt(current) - prior) * 1000n) / prior) / 10;
}
