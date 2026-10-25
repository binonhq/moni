"use client";
import { RefreshCw, ArrowDownLeft, ArrowUpRight, Inbox } from "lucide-react";
import { Button } from "./ui/button";
import { money } from "@/lib/utils";
import { displayDate } from "@/lib/dates";
import type { Transaction } from "@/lib/types";
export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted page-description">{description}</p></div><div className="heading-actions">{children}</div></div>;
}
export function RefreshButton({ refresh, loading, online }: { refresh: () => void; loading: boolean; online: boolean }) {
  return <Button variant="secondary" size="icon" aria-label="Refresh transactions" onClick={refresh} disabled={loading || !online}><RefreshCw size={18} className={loading ? "spin" : ""} /></Button>;
}
export function ErrorNotice({ message, retry }: { message: string; retry: () => void }) {
  return <div className="error-notice" role="alert"><span>{message} Any displayed amounts may be out of date.</span><Button variant="secondary" onClick={retry}>Try again</Button></div>;
}
export function EmptyState({ title = "A fresh start.", text = "Your expenses will appear here. Add your first transaction or connect your iPhone Shortcut.", children }: { title?: string; text?: string; children?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Inbox size={25} strokeWidth={1.5} /></span><h3>{title}</h3><p>{text}</p>{children}</div>;
}
export function TransactionRow({ transaction, onSelect }: { transaction: Transaction; onSelect: (t: Transaction) => void }) {
  return <button className="transaction-row" onClick={() => onSelect(transaction)} aria-label={`Expense ${money(transaction.amount)}, ${displayDate(transaction.timestamp, { hour: "2-digit", minute: "2-digit" })}. View details`}><span className="transaction-icon"><ArrowUpRight size={20} strokeWidth={1.7} /></span><span className="transaction-info"><strong>Expense</strong><span>{displayDate(transaction.timestamp)} <span aria-hidden="true">·</span> {displayDate(transaction.timestamp, { day: undefined, month: undefined, hour: "2-digit", minute: "2-digit", hour12: false })}</span></span><strong className="transaction-amount">{money(transaction.amount)}</strong><span className="row-chevron">›</span></button>;
}
export function Skeleton() { return <div className="skeleton-page" aria-label="Loading your finances" role="status"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-hero" /><div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /></div><span className="sr-only">Loading Moni…</span></div>; }
export function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon?: React.ReactNode }) {
  return <div className="metric-card"><div className="metric-label">{label}{icon ?? <ArrowDownLeft size={16} />}</div><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span></div>;
}
