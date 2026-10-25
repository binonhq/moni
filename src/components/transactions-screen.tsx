"use client";
import { useEffect, useState } from "react";
import { SlidersHorizontal, X, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { api, useResource } from "@/hooks/use-resource";
import { addDays, displayDate, localDay } from "@/lib/dates";
import { money } from "@/lib/utils";
import type { Transaction, TransactionPage } from "@/lib/types";
import { PageHeading, EmptyState, ErrorNotice, RefreshButton, Skeleton, TransactionRow } from "./common";
import { AddTransaction, TransactionEditor } from "./transaction-editor";
import { Button } from "./ui/button";
export function TransactionsScreen() {
  const [query, setQuery] = useState(""); const [showFilters, setShowFilters] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const resource = useResource<TransactionPage>(`/api/transactions?limit=30${query}`);
  const [extra, setExtra] = useState<Transaction[]>([]); const [cursor, setCursor] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false); const [selected, setSelected] = useState<Transaction | null>(null);
  useEffect(() => { setExtra([]); setCursor(resource.data?.nextCursor ?? null); }, [resource.data]);
  const all = [...(resource.data?.data ?? []), ...extra];
  const groups = Map.groupBy(all, t => localDay(t.timestamp));
  function filter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFilterError(null); const data = new FormData(event.currentTarget); const params = new URLSearchParams();
    const from = String(data.get("from") || ""); const to = String(data.get("to") || "");
    const min = String(data.get("minAmount") || ""); const max = String(data.get("maxAmount") || "");
    if (from && to && from > to) { setFilterError("The end date must follow the start date."); return; }
    if (min && max && BigInt(min) > BigInt(max)) { setFilterError("Minimum amount exceeds maximum."); return; }
    if (from) params.set("from", `${from}T00:00:00+07:00`);
    if (to) params.set("to", `${addDays(to, 1)}T00:00:00+07:00`);
    if (min) params.set("minAmount", min); if (max) params.set("maxAmount", max);
    setQuery(params.size ? `&${params.toString()}` : "");
  }
  async function more() {
    if (!cursor || moreBusy) return; setMoreBusy(true);
    try { const page = await api<TransactionPage>(`/api/transactions?limit=30${query}&cursor=${encodeURIComponent(cursor)}`); setExtra(v => [...v, ...page.data]); setCursor(page.nextCursor); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not load more."); } finally { setMoreBusy(false); }
  }
  return <><PageHeading eyebrow="THE EVERYDAY DETAILS" title="Every expense, accounted for." description="Your history. A little more perspective."><RefreshButton refresh={resource.refresh} loading={resource.loading} online={resource.online} /><AddTransaction /></PageHeading>
    <div className="history-toolbar"><span className="small muted">Newest first · Vietnam time</span><Button variant="secondary" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters}><SlidersHorizontal size={17} />Filters{query && <span className="filter-dot" />}</Button></div>
    {showFilters && <form className="panel filters" onSubmit={filter}><label>From<input type="date" name="from" /></label><label>Through<input type="date" name="to" /></label><label>Minimum ₫<input type="number" name="minAmount" min="0" max={Number.MAX_SAFE_INTEGER} step="1" inputMode="numeric" placeholder="0" /></label><label>Maximum ₫<input type="number" name="maxAmount" min="0" max={Number.MAX_SAFE_INTEGER} step="1" inputMode="numeric" placeholder="No limit" /></label><Button type="submit">Apply</Button><Button type="reset" variant="ghost" onClick={() => { setQuery(""); setFilterError(null); }}><X size={16} />Clear</Button>{filterError && <p className="form-error" role="alert">{filterError}</p>}</form>}
    {resource.error && <ErrorNotice message={resource.error} retry={resource.refresh} />}
    {resource.loading && !resource.data ? <Skeleton /> : !all.length ? <section className="panel"><EmptyState title={query ? "No expenses match." : "Your first chapter awaits."} text={query ? "Try a different date range or amount." : "Add an expense, or let your iPhone take care of it."} /></section> : <div className="history-groups">{Array.from(groups.entries()).map(([date, items]) => <section className="day-group" key={date}><div className="day-heading"><h2>{date === localDay() ? "Today" : date === addDays(localDay(), -1) ? "Yesterday" : displayDate(`${date}T00:00:00+07:00`, { weekday: "short", year: "numeric" })}</h2><span>{money(items.reduce((n, t) => n + BigInt(t.amount), 0n))}<small> · {items.length} shown</small></span></div><div className="panel transaction-list">{items.map(t => <TransactionRow key={t.id} transaction={t} onSelect={setSelected} />)}</div></section>)}</div>}
    {cursor && <div className="load-more"><Button variant="secondary" onClick={more} disabled={!resource.online || moreBusy || resource.loading}><ArrowDown size={17} />{moreBusy ? "Loading…" : "Load more expenses"}</Button></div>}
    {all.length > 0 && !cursor && <p className="history-end">You’re all caught up. {all.length} expense{all.length !== 1 && "s"} shown.</p>}
    <TransactionEditor open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }} transaction={selected} /></>;
}
