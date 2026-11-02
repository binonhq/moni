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

export function goldPriceExtremes(points: GoldHistoryPoint[]) {
  let high: GoldHistoryPoint | null = null;
  let low: GoldHistoryPoint | null = null;
  for (const point of points) {
    // On ties show the latest date with that price.
    if (
      !high ||
      BigInt(point.buy) > BigInt(high.buy) ||
      (BigInt(point.buy) === BigInt(high.buy) && point.date > high.date)
    )
      high = point;
    if (
      !low ||
      BigInt(point.buy) < BigInt(low.buy) ||
      (BigInt(point.buy) === BigInt(low.buy) && point.date > low.date)
    )
      low = point;
  }
  return { high, low };
}
export function goldMonthsAgo(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}
export function goldHistoryStats(points: GoldHistoryPoint[], start = "", end = "") {
  const daily = selectGoldHistory(points, "day");
  const latest = daily.at(-1);
  const anchor = latest?.date ?? "";
  return {
    latest,
    anchor,
    periods: [
      {
        label: "Selected range",
        ...goldPriceExtremes(selectGoldHistory(daily, "day", start, end)),
      },
      {
        label: "1 month",
        ...goldPriceExtremes(
          anchor ? selectGoldHistory(daily, "day", goldMonthsAgo(anchor, 1), anchor) : [],
        ),
      },
      {
        label: "3 months",
        ...goldPriceExtremes(
          anchor ? selectGoldHistory(daily, "day", goldMonthsAgo(anchor, 3), anchor) : [],
        ),
      },
      { label: "All history", ...goldPriceExtremes(daily) },
    ],
  };
}

export type GoldHistoryView = "all" | "year" | "month";
export function selectGoldHistoryView(points: GoldHistoryPoint[], view: GoldHistoryView) {
  const daily = selectGoldHistory(points, "day");
  const latest = daily.at(-1);
  if (!latest || view === "all") return daily;
  const start = new Date(latest.date + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() - ((view === "year" ? 365 : 30) - 1));
  return selectGoldHistory(daily, "day", start.toISOString().slice(0, 10), latest.date);
}
