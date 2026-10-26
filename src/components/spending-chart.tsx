"use client";
import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "motion/react";
import { money, shortMoney } from "@/lib/utils";
type Point = { label: string; amount: string };
export default function SpendingChart({
  points,
  kind = "area",
}: {
  points: Point[];
  kind?: "area" | "bar";
}) {
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  // Monetary calculations remain BigInt. Only normalized display coordinates are numbers.
  const max = points.reduce((m, p) => (BigInt(p.amount) > m ? BigInt(p.amount) : m), 1n);
  const data = points.map(p => ({ ...p, value: Number((BigInt(p.amount) * 10000n) / max) / 100 }));
  const children = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
      <XAxis
        dataKey="label"
        axisLine={false}
        tickLine={false}
        minTickGap={28}
        tick={{ fontSize: 11, fill: "var(--muted)" }}
        dy={10}
      />
      <YAxis
        width={46}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 11, fill: "var(--muted)" }}
        tickFormatter={v =>
          shortMoney(((BigInt(Math.round(Number(v) * 100)) * max) / 10000n).toString())
        }
      />
      <Tooltip
        cursor={{ stroke: "var(--accent)", strokeDasharray: "4 4" }}
        content={({ active, payload }) =>
          active && payload?.length ? (
            <div className="chart-tooltip">
              <span>{String(payload[0].payload.label)}</span>
              <strong>{money(String(payload[0].payload.amount))}</strong>
            </div>
          ) : null
        }
      />
    </>
  );
  return (
    <div
      className="chart-container"
      role="img"
      aria-label="Spending chart. Exact values are also available in the data table below."
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {kind === "bar" ? (
          <BarChart data={data} margin={{ top: 15, right: 4, bottom: 10, left: -8 }}>
            {children}
            <Bar
              dataKey="value"
              fill="var(--accent)"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
              isAnimationActive={!reduced}
              animationDuration={850}
              animationEasing="ease-out"
            />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 15, right: 4, bottom: 10, left: -8 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {children}
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill={`url(#${id})`}
              isAnimationActive={!reduced}
              animationDuration={900}
              animationEasing="ease-out"
              activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--surface)" }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
