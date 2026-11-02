import { describe, expect, it } from "vitest";
import {
  selectGoldHistoryView,
  goldHistoryStats,
  goldMonthsAgo,
  goldPriceExtremes,
  selectGoldHistory,
  goldHistoryLabel,
} from "@/lib/gold-history";
const points = [
  { date: "2025-12-31", buy: "100", sell: "110" },
  { date: "2026-01-01", buy: "120", sell: "130" },
  { date: "2026-01-31", buy: "140", sell: null },
  { date: "2026-02-02", buy: "160", sell: "170" },
];
describe("gold chart ranges and periods", () => {
  it("includes both date boundaries and leaves source points unchanged", () => {
    const reversed = [...points].reverse();
    expect(selectGoldHistory(reversed, "day", "2026-01-01", "2026-01-31")).toEqual(
      points.slice(1, 3),
    );
    expect(reversed[0]).toEqual(points[3]);
  });
  it("uses the final available price of each month, preserving absent sell prices", () => {
    expect(selectGoldHistory(points, "month")).toEqual([points[0], points[2], points[3]]);
  });
  it("keeps years separate and uses the last available price within a partial period", () => {
    expect(selectGoldHistory(points, "year")).toEqual([points[0], points[3]]);
    expect(selectGoldHistory(points, "year", "2026-01-01", "2026-01-15")).toEqual([points[1]]);
  });
  it("returns no prices for empty or reversed ranges", () => {
    expect(selectGoldHistory(points, "day", "2027-01-01")).toEqual([]);
    expect(selectGoldHistory(points, "month", "2026-02-01", "2026-01-01")).toEqual([]);
    expect(selectGoldHistory([], "year")).toEqual([]);
  });
  it("labels daily, monthly and yearly points clearly", () => {
    expect(goldHistoryLabel("2026-01-31", "day")).toBe("31/01/2026");
    expect(goldHistoryLabel("2026-01-31", "month")).toBe("01/2026");
    expect(goldHistoryLabel("2026-01-31", "year")).toBe("2026");
  });
});

describe("gold price highlights", () => {
  it("clamps calendar month windows at month end and leap years", () => {
    expect(goldMonthsAgo("2026-03-31", 1)).toBe("2026-02-28");
    expect(goldMonthsAgo("2024-03-31", 1)).toBe("2024-02-29");
    expect(goldMonthsAgo("2026-01-31", 3)).toBe("2025-10-31");
  });
  it("computes extremes exactly and chooses the latest date on ties", () => {
    const values = [
      { date: "2026-01-01", buy: "9007199254740993", sell: null },
      { date: "2026-01-02", buy: "9007199254740992", sell: null },
      { date: "2026-01-03", buy: "9007199254740993", sell: null },
    ];
    expect(goldPriceExtremes(values)).toEqual({ high: values[2], low: values[1] });
    expect(goldPriceExtremes(values.toReversed())).toEqual({ high: values[2], low: values[1] });
  });
  it("separates selected, 1-month, 3-month and all-history windows", () => {
    const values = [
      { date: "2025-12-31", buy: "999", sell: null },
      { date: "2026-01-01", buy: "1", sell: null },
      { date: "2026-02-28", buy: "100", sell: null },
      { date: "2026-03-15", buy: "500", sell: null },
      { date: "2026-03-31", buy: "200", sell: null },
    ];
    const stats = goldHistoryStats(values.toReversed(), "2026-03-31", "2026-03-31");
    expect(stats.latest).toEqual(values[4]);
    expect(stats.periods[0]).toMatchObject({ high: values[4], low: values[4] });
    expect(stats.periods[1]).toMatchObject({ high: values[3], low: values[2] });
    expect(stats.periods[2]).toMatchObject({ high: values[0], low: values[1] });
    expect(stats.periods[3]).toMatchObject({ high: values[0], low: values[1] });
    expect(goldHistoryStats(values, "2027-01-01").periods[0].high).toBeNull();
  });
  it("handles an empty history", () => {
    const stats = goldHistoryStats([]);
    expect(stats.latest).toBeUndefined();
    expect(stats.periods.every(period => period.high === null && period.low === null)).toBe(true);
  });
});

describe("gold daily chart views", () => {
  const daily = Array.from({ length: 400 }, (_, index) => {
    const date = new Date("2024-01-01T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);
    return { date: date.toISOString().slice(0, 10), buy: String(100 + index), sell: null };
  });
  it("keeps all daily points for All time without modifying input", () => {
    const reversed = daily.toReversed();
    expect(selectGoldHistoryView(reversed, "all")).toEqual(daily);
    expect(reversed[0]).toEqual(daily.at(-1));
  });
  it("keeps exactly 30 calendar days including the latest day", () => {
    expect(selectGoldHistoryView(daily, "month")).toEqual(daily.slice(-30));
  });
  it("keeps exactly 365 days across a leap year without aggregating", () => {
    expect(selectGoldHistoryView(daily, "year")).toEqual(daily.slice(-365));
  });
  it("uses calendar days rather than the number of source records", () => {
    const sparse = [daily[0], daily[365], daily[370], daily[399]];
    expect(selectGoldHistoryView(sparse, "month")).toEqual([daily[370], daily[399]]);
    expect(selectGoldHistoryView([], "year")).toEqual([]);
  });
});
