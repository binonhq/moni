"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CategoryTotal } from "@/lib/types";
import { monthLabel } from "@/lib/dates";
import { money } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { EmptyState } from "./common";

export function CategoryBreakdown({ groups, total, month }: { groups: CategoryTotal[]; total: string; month: string }) {
  return <section className="panel category-breakdown"><div className="panel-heading"><div><h2>Spending by category</h2><p>{monthLabel(month)} · where your money goes</p></div><span className="small muted">{groups.length} groups</span></div>
    {groups.length ? <div className="category-totals">{groups.map(group => {
      const share = BigInt(total) ? Number(BigInt(group.amount) * 1000n / BigInt(total)) / 10 : 0;
      return <Link className="category-total" href={`/transactions?categoryId=${group.category?.id ?? "uncategorized"}`} key={group.category?.id ?? "uncategorized"}>
        <span className="transaction-icon"><CategoryIcon name={group.category?.icon} size={21} /></span><div className="category-total-content"><div className="category-total-heading"><strong>{group.category?.name ?? "Uncategorized"}</strong><b>{money(group.amount)}</b></div><div className="category-bar" aria-hidden="true"><span style={{ width: `${Math.max(.5, share)}%` }} /></div><div className="category-total-caption"><span>{group.count} expense{group.count !== 1 && "s"}</span><span>{share}%</span></div></div><ArrowUpRight size={16} className="muted" />
      </Link>;
    })}</div> : <EmptyState title="A place for every expense." text="Choose a category when adding an expense to see your monthly spending grouped here." />}
  </section>;
}
