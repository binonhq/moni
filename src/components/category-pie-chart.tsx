"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryTotal } from "@/lib/types";
import { money } from "@/lib/utils";

const colors = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--accent-3)",
  "var(--accent-4)",
  "color-mix(in srgb, var(--accent) 58%, var(--accent-2))",
  "color-mix(in srgb, var(--accent-3) 58%, var(--accent-4))",
];

export default function CategoryPieChart({
  groups,
  total,
}: {
  groups: CategoryTotal[];
  total: string;
}) {
  const reducedMotion = useReducedMotion();
  const totalAmount = BigInt(total);
  const data = groups.map((group, index) => ({
    ...group,
    color: colors[index % colors.length],
    label: group.category?.name ?? "Uncategorized",
    share: totalAmount ? Number((BigInt(group.amount) * 1000n) / totalAmount) / 10 : 0,
    value: totalAmount ? Number((BigInt(group.amount) * 10000n) / totalAmount) / 100 : 0,
  }));

  return (
    <div className="category-pie-layout">
      <div
        className="category-pie-visual"
        role="img"
        aria-label="Pie chart showing this month's expenses by category. Exact values are listed beside the chart."
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={3}
              isAnimationActive={!reducedMotion}
              animationDuration={850}
              animationEasing="ease-out"
            >
              {data.map(item => (
                <Cell key={item.category?.id ?? "uncategorized"} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <span>{String(payload[0].payload.label)}</span>
                    <strong>{money(String(payload[0].payload.amount))}</strong>
                    <small>{payload[0].payload.share}% of the month</small>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="category-pie-center" aria-hidden="true">
          <span>Monthly total</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      <div className="category-pie-legend" aria-label="Category totals">
        {data.map(item => (
          <Link
            href={`/transactions?categoryId=${item.category?.id ?? "uncategorized"}`}
            className="category-pie-row"
            key={item.category?.id ?? "uncategorized"}
          >
            <i style={{ background: item.color }} aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>
                {item.count} expense{item.count !== 1 && "s"} · {item.share}%
              </small>
            </span>
            <b>{money(item.amount)}</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
