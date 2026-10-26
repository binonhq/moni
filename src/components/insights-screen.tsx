"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  Hash,
} from "lucide-react";
import { useResource } from "@/hooks/use-resource";
import { displayDate, localMonth, monthLabel, shiftMonth } from "@/lib/dates";
import { cn, money, percentChange } from "@/lib/utils";
import type { Stats } from "@/lib/types";
import { PageHeading, ErrorNotice, Metric, Skeleton } from "./common";
import { Button } from "./ui/button";
import { ChartCard } from "./chart-card";
export function InsightsScreen() {
  const [month, setMonth] = useState(localMonth());
  const [selectedDay, setSelectedDay] = useState<Stats["daily"][number] | null>(null);
  const { data, error, refresh, loading } = useResource<{ data: Stats }>(
    `/api/stats?month=${month}`,
  );
  const s = data?.data;
  const weekly = s ? percentChange(s.week, s.previousWeek) : null;
  const maxDay = s?.highestDay ? BigInt(s.highestDay.amount) : 0n;
  const heatOffset = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const changeMonth = (offset: number) => {
    setSelectedDay(null);
    setMonth(current => shiftMonth(current, offset));
  };
  return (
    <>
      <PageHeading
        eyebrow="SEE THE BIGGER PICTURE"
        title="A little more insight."
        description="Understand your rhythm, one day at a time."
      >
        <div className="month-selector">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={18} />
          </Button>
          <span>{monthLabel(month)}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next month"
            disabled={month >= localMonth()}
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </PageHeading>
      {error && <ErrorNotice message={error} retry={refresh} />}
      {!s ? (
        loading ? (
          <Skeleton />
        ) : null
      ) : (
        <>
          <div className="insight-metrics">
            <Metric
              label="Monthly expenses"
              value={money(s.total)}
              note={`${s.count} transactions`}
              icon={<TrendingUp size={17} />}
            />
            <Metric
              label="Largest expense"
              value={money(s.largestTransaction?.amount ?? "0")}
              note={
                s.largestTransaction
                  ? displayDate(s.largestTransaction.timestamp)
                  : "No expenses yet"
              }
              icon={<ArrowUpRight size={17} />}
            />
            <Metric
              label="Average expense"
              value={money(s.averageTransaction)}
              note="Per transaction · rounded down"
              icon={<Hash size={17} />}
            />
          </div>
          <ChartCard
            title="The longer view"
            subtitle="Monthly expenses · the last twelve months"
            kind="bar"
            points={s.monthly.map(m => ({
              label: displayDate(`${m.month}-01T00:00:00+07:00`, {
                day: undefined,
                month: "short",
                year: "2-digit",
              }),
              amount: m.amount,
            }))}
          />
          <div className="insights-columns">
            <section className="panel heatmap-panel">
              <div className="panel-heading">
                <div>
                  <h2>Your spending rhythm</h2>
                  <p>{monthLabel(month)} · tap a day for its total</p>
                </div>
                <CalendarDays size={20} className="muted" />
              </div>
              <div className="calendar-grid">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span className="calendar-weekday" key={i}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: heatOffset }, (_, i) => (
                  <span key={`blank-${i}`} />
                ))}
                {s.daily.map(d => {
                  const intensity = maxDay ? Number((BigInt(d.amount) * 4n) / maxDay) : 0;
                  return (
                    <button
                      key={d.date}
                      className={cn(
                        "heat-cell",
                        `heat-${d.count ? Math.max(1, intensity) : 0}`,
                        selectedDay?.date === d.date && "selected",
                      )}
                      aria-label={`${d.date}: ${money(d.amount)}, ${d.count} expenses`}
                      aria-pressed={selectedDay?.date === d.date}
                      onClick={() => setSelectedDay(d)}
                    >
                      {Number(d.date.slice(8))}
                    </button>
                  );
                })}
              </div>
              <p className="heatmap-selection small muted" aria-live="polite">
                {selectedDay
                  ? `${displayDate(selectedDay.date + "T00:00:00+07:00")} · ${money(selectedDay.amount)} · ${selectedDay.count} expenses`
                  : "Select a day to explore."}
              </p>
              <div className="heatmap-legend">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map(i => (
                  <i className={`heat-${i}`} key={i} />
                ))}
                <span>More</span>
              </div>
            </section>
            <section className="panel observations">
              <div className="panel-heading">
                <div>
                  <h2>Worth a look</h2>
                  <p>The details behind your month.</p>
                </div>
              </div>
              <div className="observation">
                <span>Highest spending day</span>
                <strong>{s.highestDay ? money(s.highestDay.amount) : "—"}</strong>
                <small>
                  {s.highestDay
                    ? displayDate(s.highestDay.date + "T00:00:00+07:00", { weekday: "long" })
                    : "Your month is still a blank page."}
                </small>
              </div>
              <div className="observation">
                <span>Transaction frequency</span>
                <strong>
                  {s.count} <small>expenses in {s.activeDays} days</small>
                </strong>
                <small>
                  {s.elapsedDays
                    ? `${(s.count / s.elapsedDays).toFixed(1)} transactions per calendar day`
                    : "No elapsed days"}
                </small>
              </div>
              <div className="observation">
                <span>This week vs. last week</span>
                <strong>
                  {weekly === null
                    ? "A new baseline"
                    : `${Math.abs(weekly)}% ${weekly <= 0 ? "less" : "more"}`}
                </strong>
                <small>
                  Current week {money(s.week)} · previous {money(s.previousWeek)}
                </small>
              </div>
            </section>
          </div>
          <ChartCard
            title="Day by day"
            subtitle={`Exact daily expenses for ${monthLabel(month)}`}
            points={s.daily.map(d => ({
              label: displayDate(d.date + "T00:00:00+07:00"),
              amount: d.amount,
            }))}
          />
          <div className="lifetime-strip">
            <div>
              <span>This calendar year</span>
              <strong>{money(s.year)}</strong>
            </div>
            <div>
              <span>All-time expenses</span>
              <strong>{money(s.allTime)}</strong>
            </div>
            <div>
              <span>All-time transactions</span>
              <strong>{s.allTimeCount}</strong>
            </div>
          </div>
        </>
      )}
    </>
  );
}
