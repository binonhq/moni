"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, CalendarDays, Check, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Confirm } from "./ui/confirm";
import { Button } from "./ui/button";
import { useDevice } from "./providers";
import { api, refreshData } from "@/hooks/use-resource";
import { localInput, displayDate } from "@/lib/dates";
import type { Category, Transaction } from "@/lib/types";
import { transactionSchema } from "@/lib/validation";
import { MoneyInput } from "./money-input";
import { CategoryPicker } from "./category-picker";
import { CategoryIcon } from "./category-icon";
import { money } from "@/lib/utils";
import { formatExpenseTitle } from "@/lib/title";

export function AddTransaction() {
  const [open, setOpen] = useState(false); const { online } = useDevice();
  return <><Button className="expense-fab" aria-label="Add expense" title="Add expense" onClick={() => setOpen(true)} disabled={!online}><Plus size={27} aria-hidden="true" /></Button><TransactionEditor open={open} onOpenChange={setOpen} /></>;
}
export function TransactionEditor({ open, onOpenChange, transaction }: { open: boolean; onOpenChange: (open: boolean) => void; transaction?: Transaction | null }) {
  const [amount, setAmount] = useState("0"); const [timestamp, setTimestamp] = useState("");
  const [title, setTitle] = useState("Expense"); const [category, setCategory] = useState<Category | null>(null); const [categoryBusy, setCategoryBusy] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [confirm, setConfirm] = useState(false);
  const { online } = useDevice(); const retry = useRef<{ body: string; key: string } | null>(null);
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (open) { setAmount(transaction?.amount ?? "0"); setTitle(formatExpenseTitle(transaction?.title)); setCategory(transaction?.category ?? null); setTimestamp(localInput(transaction?.timestamp ?? new Date().toISOString())); setError(null); setConfirm(false); retry.current = null; } }, [open, transaction]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!online || busy || categoryBusy) return;
    const parsed = transactionSchema.safeParse({ amount: Number(amount), title, categoryId: category?.id ?? null, timestamp: timestamp ? `${timestamp.length === 16 ? timestamp + ":00" : timestamp}+07:00` : "" });
    if (!/^\d+$/.test(amount) || !parsed.success) { setError("Enter a positive whole VND amount and a valid date and time."); return; }
    setBusy(true); setError(null);
    const body = JSON.stringify(parsed.data);
    if (retry.current?.body !== body) retry.current = { body, key: `manual-${crypto.randomUUID()}` };
    try {
      await api(transaction ? `/api/transactions/${transaction.id}` : "/api/dashboard/transactions", { method: transaction ? "PATCH" : "POST", body, headers: { "Idempotency-Key": retry.current!.key } });
      refreshData(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the expense."); } finally { setBusy(false); }
  }
  async function remove() {
    if (!online || !transaction) return; setBusy(true);
    try { await api(`/api/transactions/${transaction.id}`, { method: "DELETE" }); refreshData(); setConfirm(false); onOpenChange(false); }
    catch (e) { setConfirm(false); setError(e instanceof Error ? e.message : "Could not delete expense."); } finally { setBusy(false); }
  }
  return <><Dialog open={open} onOpenChange={v => { if (!busy && !categoryBusy) onOpenChange(v); }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); dialogTitle.current?.focus({ preventScroll: true }); }}><span className="dialog-symbol"><CalendarDays size={24} /></span><DialogTitle ref={dialogTitle} tabIndex={-1} className="dialog-title">{transaction ? "Your expense" : "Add an expense"}</DialogTitle><DialogDescription className="muted">A small detail. A clearer picture.</DialogDescription>
    <form onSubmit={save} className="expense-form"><label htmlFor="expense-amount">Amount <span>Vietnamese dong</span></label><div className="amount-input-wrap"><MoneyInput id="expense-amount" placeholder="0" value={amount} onValueChange={setAmount} required disabled={busy} /><span>₫</span></div>
      <label htmlFor="expense-title">Title</label><input id="expense-title" value={title} onChange={e => setTitle(e.target.value)} onBlur={() => setTitle(formatExpenseTitle(title))} onFocus={e => { if (title === "Expense") e.currentTarget.select(); }} maxLength={120} placeholder="Expense" autoCapitalize="words" disabled={busy} />
      {open && <CategoryPicker value={category} onChange={setCategory} disabled={!online || busy} onBusyChange={setCategoryBusy} />}
      <label htmlFor="expense-date">Date & time <span>Vietnam · UTC+7</span></label><input id="expense-date" type="datetime-local" step="1" value={timestamp} onChange={e => setTimestamp(e.target.value)} required min="1900-01-01T00:00" max="9998-12-31T23:59" />
      {transaction && <p className="small muted">Recorded {displayDate(transaction.createdAt, { hour: "2-digit", minute: "2-digit" })}</p>}
      <div className="expense-preview" aria-label="Expense preview"><span className="transaction-icon"><CategoryIcon name={category?.icon} size={20} /></span><div><strong>{formatExpenseTitle(title)}</strong><span>{category?.name ?? "Uncategorized"}</span></div><b>{money(amount || "0")}</b></div>
      {error && <p className="form-error" role="alert">{error}</p>}{!online && <p className="form-error">Reconnect to save changes.</p>}
      <div className="dialog-actions">{transaction && <Button type="button" variant="ghost" className="danger-text" onClick={() => setConfirm(true)} disabled={!online || busy || categoryBusy}><Trash2 size={18} />Delete</Button>}<Button type="submit" disabled={!online || busy || categoryBusy}>{busy ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />}{transaction ? "Save changes" : "Add expense"}</Button></div>
    </form></DialogContent></Dialog><Confirm open={confirm} onOpenChange={setConfirm} title="Delete this expense?" description="This expense will be permanently removed and your totals will update. This cannot be undone." onConfirm={remove} busy={busy} /></>;
}
