import type { GoldHistoryPoint } from "./types";
export type GoldHistoryInterval = "day" | "month" | "year";

export function selectGoldHistory(
  points: GoldHistoryPoint[],
  interval: GoldHistoryInterval,
  start = "",
  end = "",
): GoldHistoryPoint[] {
  if (start && end && start > end) return [];
  const selected = points
    .filter(point => (!start || point.date >= start) && (!end || point.date <= end))
    .sort((a, b) => a.date.localeCompare(b.date));
  const periods = new Map<string, GoldHistoryPoint>();
  for (const point of selected) {
    const key = point.date.slice(0, interval === "year" ? 4 : interval === "month" ? 7 : 10);
    periods.set(key, point);
  }
  return [...periods.values()];
}
export function goldHistoryLabel(date: string, interval: GoldHistoryInterval) {
  if (interval === "year") return date.slice(0, 4);
  if (interval === "month") return date.slice(5, 7) + "/" + date.slice(0, 4);
  return date.slice(8, 10) + "/" + date.slice(5, 7) + "/" + date.slice(0, 4);
}
