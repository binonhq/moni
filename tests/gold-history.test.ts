import { describe, expect, it } from "vitest";
import { selectGoldHistory, goldHistoryLabel } from "@/lib/gold-history";
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
