"use client";
import dynamic from "next/dynamic";
import { money } from "@/lib/utils";
const SpendingChart = dynamic(() => import("./spending-chart"), { ssr: false, loading: () => <div className="skeleton chart-container" /> });
export function ChartCard({ title, subtitle, points, kind, aside }: { title: string; subtitle: string; points: { label: string; amount: string }[]; kind?: "area" | "bar"; aside?: React.ReactNode }) {
  return <section className="panel chart-panel"><div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{aside}</div><SpendingChart points={points} kind={kind} /><details className="chart-table"><summary>View exact amounts</summary><div className="table-scroll"><table><thead><tr><th>Period</th><th>Expenses</th></tr></thead><tbody>{points.map(p => <tr key={p.label}><td>{p.label}</td><td>{money(p.amount)}</td></tr>)}</tbody></table></div></details></section>;
}
