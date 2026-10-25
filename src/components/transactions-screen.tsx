"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ArrowDown } from "lucide-react";
import { api, useResource } from "@/hooks/use-resource";
import { addDays, displayDate, localDay } from "@/lib/dates";
import { money } from "@/lib/utils";
import { querySchema } from "@/lib/validation";
import type { Category, Transaction, TransactionPage } from "@/lib/types";
import { PageHeading, EmptyState, ErrorNotice, Skeleton, TransactionRow } from "./common";
import { TransactionEditor } from "./transaction-editor";
import { MoneyInput } from "./money-input";
import { Button } from "./ui/button";

export function TransactionsScreen() {
  const params = useSearchParams(); const initialCategory = params.get("categoryId") ?? "";
  const [query, setQuery] = useState(initialCategory ? `&categoryId=${encodeURIComponent(initialCategory)}` : "");
  const [showFilters, setShowFilters] = useState(!!initialCategory);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [min, setMin] = useState(""); const [max, setMax] = useState(""); const [categoryId, setCategoryId] = useState(initialCategory);
  const [filterError, setFilterError] = useState<string | null>(null);
  const resource = useResource<TransactionPage>(`/api/transactions?limit=30${query}`);
  const categories = useResource<{ data: Category[] }>("/api/categories");
  const [extra, setExtra] = useState<Transaction[]>([]); const [cursor, setCursor] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false); const [selected, setSelected] = useState<Transaction | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => { setCategoryId(initialCategory); setQuery(initialCategory ? `&categoryId=${encodeURIComponent(initialCategory)}` : ""); setFrom(""); setTo(""); setMin(""); setMax(""); setFilterError(null); if (initialCategory) setShowFilters(true); }, [initialCategory]);
  useEffect(() => { generation.current++; setExtra([]); setCursor(resource.data?.nextCursor ?? null); }, [resource.data, query]);
  const all = Array.from(new Map([...(resource.data?.data ?? []), ...extra].map(t => [t.id, t])).values());
  const groups = Map.groupBy(all, t => localDay(t.timestamp));
  function filter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFilterError(null); const next = new URLSearchParams();
    if (from && to && from > to) { setFilterError("The end date must follow the start date."); return; }
    if (min && max && BigInt(min) > BigInt(max)) { setFilterError("Minimum amount exceeds maximum."); return; }
    if (from) next.set("from", `${from}T00:00:00+07:00`);
    if (to) next.set("to", `${addDays(to, 1)}T00:00:00+07:00`);
    if (min) next.set("minAmount", min); if (max) next.set("maxAmount", max); if (categoryId) next.set("categoryId", categoryId);
    if (!querySchema.safeParse(Object.fromEntries(next)).success) { setFilterError("Use valid dates and whole VND amounts up to 9.007.199.254.740.991."); return; }
    setQuery(next.size ? `&${next.toString()}` : "");
  }
  function clear() { setFrom(""); setTo(""); setMin(""); setMax(""); setCategoryId(""); setQuery(""); setFilterError(null); }
  async function more() {
    if (!cursor || moreBusy) return; setMoreBusy(true); setMoreError(null); const version = generation.current;
    try { const page = await api<TransactionPage>(`/api/transactions?limit=30${query}&cursor=${encodeURIComponent(cursor)}`); if (version === generation.current) { setExtra(v => [...v, ...page.data]); setCursor(page.nextCursor); } }
    catch (e) { setMoreError(e instanceof Error ? e.message : "Could not load more."); } finally { setMoreBusy(false); }
  }
  return <><PageHeading eyebrow="THE EVERYDAY DETAILS" title="Every expense, accounted for." description="Your history. A little more perspective." />
    <div className="history-toolbar"><span className="small muted">Newest first · Vietnam time</span><Button variant="secondary" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters} aria-controls="transaction-filters"><SlidersHorizontal size={17} />Filters{query && <span className="filter-dot" />}</Button></div>
    {showFilters && <form id="transaction-filters" className="panel filters" onSubmit={filter}>
      <label>From<input type="date" name="from" value={from} onChange={e => setFrom(e.target.value)} min="1900-01-01" max="9998-12-30" /></label>
      <label>Through<input type="date" name="to" value={to} onChange={e => setTo(e.target.value)} min="1900-01-01" max="9998-12-30" /></label>
      <label>Minimum ₫<MoneyInput name="minAmount" value={min} onValueChange={setMin} allowEmpty placeholder="0" /></label>
      <label>Maximum ₫<MoneyInput name="maxAmount" value={max} onValueChange={setMax} allowEmpty placeholder="No limit" /></label>
      <label className="filter-category">Category<select value={categoryId} onChange={e => setCategoryId(e.target.value)} name="categoryId"><option value="">All categories</option><option value="uncategorized">Uncategorized</option>{categories.data?.data.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div className="filter-actions"><Button type="submit">Apply filters</Button><Button type="button" variant="ghost" onClick={clear}><X size={16} />Clear</Button></div>
      {filterError && <p className="form-error" role="alert">{filterError}</p>}
      {categories.error && <p className="form-error" role="alert">Categories could not load. <button type="button" className="text-link" onClick={() => void categories.refresh()}>Retry</button></p>}
    </form>}
    {resource.error && <ErrorNotice message={resource.error} retry={resource.refresh} />}
    {resource.loading && !resource.data ? <Skeleton /> : !all.length ? <section className="panel"><EmptyState title={query ? "No expenses match." : "Your first chapter awaits."} text={query ? "Try another date range, amount, or category." : "Add an expense, or let your iPhone take care of it."} /></section> : <div className="history-groups">{Array.from(groups.entries()).map(([date, items]) => <section className="day-group" key={date}><div className="day-heading"><h2>{date === localDay() ? "Today" : date === addDays(localDay(), -1) ? "Yesterday" : displayDate(`${date}T00:00:00+07:00`, { weekday: "short", year: "numeric" })}</h2><span>{money(items.reduce((n, t) => n + BigInt(t.amount), 0n))}<small> · {items.length} shown</small></span></div><div className="panel transaction-list">{items.map(t => <TransactionRow key={t.id} transaction={t} onSelect={setSelected} />)}</div></section>)}</div>}
    {moreError && <p className="form-error history-load-error" role="alert">{moreError}</p>}
    {cursor && <div className="load-more"><Button variant="secondary" onClick={more} disabled={!resource.online || moreBusy || resource.loading}><ArrowDown size={17} />{moreBusy ? "Loading…" : "Load more expenses"}</Button></div>}
    {all.length > 0 && !cursor && <p className="history-end">You’re all caught up. {all.length} expense{all.length !== 1 && "s"} shown.</p>}
    <TransactionEditor open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }} transaction={selected} /></>;
}
