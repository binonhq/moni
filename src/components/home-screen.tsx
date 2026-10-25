"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowDownRight, ArrowUpRight, CalendarDays, Sparkles, Activity, ShieldCheck } from "lucide-react";
import { useResource } from "@/hooks/use-resource";
import { localMonth, monthLabel, displayDate, shiftMonth } from "@/lib/dates";
import { money, percentChange } from "@/lib/utils";
import type { Stats, Transaction, TransactionPage } from "@/lib/types";
import { TransactionEditor } from "./transaction-editor";
import { EmptyState, ErrorNotice, Metric, PageHeading, Skeleton, TransactionRow } from "./common";
import { ChartCard } from "./chart-card";
import { CategoryBreakdown } from "./category-breakdown";

export function HomeScreen() {
  const month = localMonth(); const stats = useResource<{ data: Stats }>(`/api/stats?month=${month}`);
  const recent = useResource<TransactionPage>("/api/transactions?limit=5");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const s = stats.data?.data; const change = s ? percentChange(s.total, s.previousMonth) : null;
  const refresh = () => { void stats.refresh(); void recent.refresh(); };
  return <><PageHeading eyebrow="A LITTLE CLARITY, EVERY DAY" title="Your money, in view." description="A quiet place to keep track of what goes out." />
    {(stats.error || recent.error) && <ErrorNotice message={stats.error || recent.error!} retry={refresh} />}
    {!s ? stats.loading ? <Skeleton /> : <EmptyState title="Your overview is unavailable" text="Reconnect or try refreshing to see your expenses." /> : <>
      <div className="overview-grid"><section className="balance-card"><div className="balance-top"><span className="balance-label">MONTHLY EXPENSES</span><span className="month-pill"><CalendarDays size={14} />{monthLabel(month)}</span></div>
        <motion.div key={s.total} initial={{ opacity: .5, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }} className="balance-amount">{new Intl.NumberFormat("vi-VN").format(BigInt(s.total))}<span>₫</span></motion.div>
        <p className="balance-count">Across <strong>{s.count}</strong> transaction{s.count !== 1 && "s"}</p><div className="balance-previous"><span>Last month · {monthLabel(shiftMonth(month, -1))}</span><strong>{money(s.previousMonth)}</strong></div><div className="balance-bottom"><span className="change-pill">{change !== null && (change > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />)}{change === null ? s.total === "0" ? "No spending either month" : "No prior spending" : change === 0 ? "Same spending" : `${Math.abs(change)}% ${change < 0 ? "less" : "more"}`}</span><span>{change === null ? "Last month had no expenses." : "This month so far vs. last month’s total"}</span></div><div className="balance-decoration" aria-hidden="true"><i /><i /><i /></div>
      </section><div className="overview-side"><Metric label="Spent today" value={money(s.today)} note={displayDate(s.asOf, { weekday: "long" })} icon={<Sparkles size={17} />} /><Metric label="This week" value={money(s.week)} note="Monday to Sunday · Vietnam" icon={<Activity size={17} />} /></div></div>
      <div className="dashboard-columns"><ChartCard title="The daily picture" subtitle={`Your spending through ${monthLabel(month)}`} points={s.daily.map(d => ({ label: displayDate(d.date + "T00:00:00+07:00"), amount: d.amount }))} aside={<span className="chart-legend"><i />Expenses</span>} />
        <section className="panel average-panel"><div className="average-symbol"><Activity size={23} strokeWidth={1.5} /></div><span className="muted">Daily average</span><strong>{money(s.averageDaily)}</strong><p>Little moments add up.<br />This is your pace so far this month.</p><div className="average-footer"><span>Active spending days</span><b>{s.activeDays}<small> / {s.elapsedDays}</small></b></div></section>
      </div>
      <CategoryBreakdown groups={s.byCategory} total={s.total} month={s.month} />
      <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest expenses, all in one place.</p></div><Link href="/transactions" className="text-link">View all <ArrowRight size={16} /></Link></div>{recent.data?.data.length ? <div className="transaction-list">{recent.data.data.map(t => <TransactionRow key={t.id} transaction={t} onSelect={setSelected} />)}</div> : <EmptyState />}</section>
      <footer className="page-footer"><span><ShieldCheck size={14} /> Only you have access to your finances.</span><span>{!stats.online ? "Offline · amounts may be outdated" : stats.error ? "Refresh needed" : `Updated ${displayDate(s.asOf, { day: undefined, month: undefined, hour: "2-digit", minute: "2-digit", hour12: false })} · Vietnam time`}</span></footer>
    </>}<TransactionEditor open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }} transaction={selected} /></>;
}
