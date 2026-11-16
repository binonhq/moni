import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { transactions as t, categories } from "@/db/schema";
import {
  addDays,
  dayStart,
  localDay,
  localMonth,
  monthBounds,
  shiftMonth,
  weekStart,
} from "@/lib/dates";
import type { DayTotal, Stats } from "@/lib/types";
import { serialize } from "./transactions";

export async function getStats(
  db: Database,
  month: string,
  now = new Date(),
  userId?: string,
): Promise<Stats> {
  const fullTime = month === "all";
  const selectedMonth = fullTime ? localMonth(now) : month;
  const { start, end, days } = monthBounds(selectedMonth);
  const todayStart = dayStart(localDay(now));
  const tomorrow = dayStart(addDays(localDay(now), 1));
  const thisWeek = weekStart(now);
  const nextWeek = new Date(thisWeek.getTime() + 7 * 86400000);
  const lastWeek = new Date(thisWeek.getTime() - 7 * 86400000);
  const previous = monthBounds(shiftMonth(selectedMonth, -1));
  const monthElapsedDays =
    selectedMonth === localMonth(now)
      ? Number(localDay(now).slice(8))
      : selectedMonth < localMonth(now)
        ? days
        : 0;
  const previousCutoff = new Date(
    Math.min(previous.end.getTime(), previous.start.getTime() + monthElapsedDays * 86400000),
  );
  const year = localDay(now).slice(0, 4);
  const sumBetween = (a: Date, b: Date) =>
    sql<string>`coalesce(sum(${t.amount}) filter (where ${t.timestamp} >= ${a} and ${t.timestamp} < ${b}), 0)::text`;
  const ownerFilter = userId ? eq(t.userId, userId) : undefined;
  const rangeFilter = fullTime
    ? ownerFilter
    : and(gte(t.timestamp, start), lt(t.timestamp, end), ownerFilter);
  // A repeatable-read snapshot prevents totals/charts disagreeing during ingestion.
  return db.transaction(
    async tx => {
      const [totals] = await tx
        .select({
          total: fullTime
            ? sql<string>`coalesce(sum(${t.amount}), 0)::text`
            : sumBetween(start, end),
          count: fullTime
            ? sql<number>`count(*)::int`
            : sql<number>`count(*) filter (where ${t.timestamp} >= ${start} and ${t.timestamp} < ${end})::int`,
          today: sumBetween(todayStart, tomorrow),
          week: sumBetween(thisWeek, nextWeek),
          previousWeek: sumBetween(lastWeek, thisWeek),
          year: sumBetween(dayStart(`${year}-01-01`), dayStart(`${Number(year) + 1}-01-01`)),
          allTime: sql<string>`coalesce(sum(${t.amount}), 0)::text`,
          allTimeCount: sql<number>`count(*)::int`,
          previousMonth: sumBetween(previous.start, previous.end),
          previousMonthToDate: sumBetween(previous.start, previousCutoff),
          firstDay: sql<
            string | null
          >`to_char(min(${t.timestamp}) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`,
          lastDay: sql<
            string | null
          >`to_char(max(${t.timestamp}) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`,
        })
        .from(t)
        .where(ownerFilter);
      const dayExpression = sql<string>`to_char(${t.timestamp} AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`;
      const grouped = await tx
        .select({
          date: dayExpression,
          amount: sql<string>`sum(${t.amount})::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(t)
        .where(rangeFilter)
        .groupBy(dayExpression)
        .orderBy(dayExpression);
      const daily: DayTotal[] = fullTime
        ? grouped
        : (() => {
            const dayMap = new Map(grouped.map(d => [d.date, d]));
            return Array.from({ length: days }, (_, i) => {
              const date = `${selectedMonth}-${String(i + 1).padStart(2, "0")}`;
              return dayMap.get(date) ?? { date, amount: "0", count: 0 };
            });
          })();
      const monthExpression = sql<string>`to_char(${t.timestamp} AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')`;
      const monthlyRows = await tx
        .select({
          month: monthExpression,
          amount: sql<string>`sum(${t.amount})::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(t)
        .where(
          fullTime
            ? ownerFilter
            : and(
                gte(t.timestamp, monthBounds(shiftMonth(selectedMonth, -11)).start),
                lt(t.timestamp, end),
                ownerFilter,
              ),
        )
        .groupBy(monthExpression)
        .orderBy(monthExpression);
      const monthly = fullTime
        ? monthlyRows
        : (() => {
            const monthlyMap = new Map(monthlyRows.map(m => [m.month, m]));
            return Array.from({ length: 12 }, (_, i) => {
              const m = shiftMonth(selectedMonth, i - 11);
              return monthlyMap.get(m) ?? { month: m, amount: "0", count: 0 };
            });
          })();
      const categoryRows = await tx
        .select({
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          amount: sql<string>`sum(${t.amount})::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(t)
        .leftJoin(categories, eq(t.categoryId, categories.id))
        .where(rangeFilter)
        .groupBy(categories.id, categories.name, categories.icon)
        .orderBy(sql`sum(${t.amount}) DESC`, categories.name);
      const byCategory = categoryRows.map(row => ({
        category: row.id ? { id: row.id, name: row.name!, icon: row.icon! } : null,
        amount: row.amount,
        count: row.count,
      }));
      const [largest] = await tx
        .select({ transaction: t, category: categories })
        .from(t)
        .leftJoin(categories, eq(t.categoryId, categories.id))
        .where(rangeFilter)
        .orderBy(desc(t.amount), desc(t.timestamp), desc(t.id))
        .limit(1);
      const highestDay = grouped.reduce<DayTotal | null>(
        (highest, d) => (!highest || BigInt(d.amount) > BigInt(highest.amount) ? d : highest),
        null,
      );
      const fullTimeLastDay =
        totals.lastDay && totals.lastDay > localDay(now) ? totals.lastDay : localDay(now);
      const elapsedDays = fullTime
        ? totals.firstDay
          ? Math.floor(
              (dayStart(fullTimeLastDay).getTime() - dayStart(totals.firstDay).getTime()) /
                86400000,
            ) + 1
          : 0
        : monthElapsedDays;
      const { firstDay: _firstDay, lastDay: _lastDay, ...summary } = totals;
      return {
        ...summary,
        month,
        asOf: now.toISOString(),
        elapsedDays,
        daily,
        monthly,
        byCategory,
        highestDay,
        activeDays: grouped.length,
        averageDaily: elapsedDays ? (BigInt(totals.total) / BigInt(elapsedDays)).toString() : "0",
        averageTransaction: totals.count
          ? (BigInt(totals.total) / BigInt(totals.count)).toString()
          : "0",
        largestTransaction: largest ? serialize(largest.transaction, largest.category) : null,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
