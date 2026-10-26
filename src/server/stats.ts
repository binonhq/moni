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

export async function getStats(db: Database, month: string, now = new Date()): Promise<Stats> {
  const { start, end, days } = monthBounds(month);
  const todayStart = dayStart(localDay(now));
  const tomorrow = dayStart(addDays(localDay(now), 1));
  const thisWeek = weekStart(now);
  const nextWeek = new Date(thisWeek.getTime() + 7 * 86400000);
  const lastWeek = new Date(thisWeek.getTime() - 7 * 86400000);
  const previous = monthBounds(shiftMonth(month, -1));
  const elapsedDays =
    month === localMonth(now) ? Number(localDay(now).slice(8)) : month < localMonth(now) ? days : 0;
  const previousCutoff = new Date(
    Math.min(previous.end.getTime(), previous.start.getTime() + elapsedDays * 86400000),
  );
  const year = localDay(now).slice(0, 4);
  const sumBetween = (a: Date, b: Date) =>
    sql<string>`coalesce(sum(${t.amount}) filter (where ${t.timestamp} >= ${a} and ${t.timestamp} < ${b}), 0)::text`;
  // A repeatable-read snapshot prevents totals/charts disagreeing during ingestion.
  return db.transaction(
    async tx => {
      const [totals] = await tx
        .select({
          total: sumBetween(start, end),
          count: sql<number>`count(*) filter (where ${t.timestamp} >= ${start} and ${t.timestamp} < ${end})::int`,
          today: sumBetween(todayStart, tomorrow),
          week: sumBetween(thisWeek, nextWeek),
          previousWeek: sumBetween(lastWeek, thisWeek),
          year: sumBetween(dayStart(`${year}-01-01`), dayStart(`${Number(year) + 1}-01-01`)),
          allTime: sql<string>`coalesce(sum(${t.amount}), 0)::text`,
          allTimeCount: sql<number>`count(*)::int`,
          previousMonth: sumBetween(previous.start, previous.end),
          previousMonthToDate: sumBetween(previous.start, previousCutoff),
        })
        .from(t);
      const dayExpression = sql<string>`to_char(${t.timestamp} AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`;
      const grouped = await tx
        .select({
          date: dayExpression,
          amount: sql<string>`sum(${t.amount})::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(t)
        .where(and(gte(t.timestamp, start), lt(t.timestamp, end)))
        .groupBy(dayExpression)
        .orderBy(dayExpression);
      const dayMap = new Map(grouped.map(d => [d.date, d]));
      const daily: DayTotal[] = Array.from({ length: days }, (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, "0")}`;
        return dayMap.get(date) ?? { date, amount: "0", count: 0 };
      });
      const monthExpression = sql<string>`to_char(${t.timestamp} AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')`;
      const monthlyRows = await tx
        .select({
          month: monthExpression,
          amount: sql<string>`sum(${t.amount})::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(t)
        .where(
          and(gte(t.timestamp, monthBounds(shiftMonth(month, -11)).start), lt(t.timestamp, end)),
        )
        .groupBy(monthExpression)
        .orderBy(monthExpression);
      const monthlyMap = new Map(monthlyRows.map(m => [m.month, m]));
      const monthly = Array.from({ length: 12 }, (_, i) => {
        const m = shiftMonth(month, i - 11);
        return monthlyMap.get(m) ?? { month: m, amount: "0", count: 0 };
      });
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
        .where(and(gte(t.timestamp, start), lt(t.timestamp, end)))
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
        .where(and(gte(t.timestamp, start), lt(t.timestamp, end)))
        .orderBy(desc(t.amount), desc(t.timestamp), desc(t.id))
        .limit(1);
      const highestDay = grouped.reduce<DayTotal | null>(
        (highest, d) => (!highest || BigInt(d.amount) > BigInt(highest.amount) ? d : highest),
        null,
      );
      return {
        ...totals,
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
