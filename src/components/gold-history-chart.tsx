"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GoldHistoryPoint } from "@/lib/types";
import { money, shortMoney } from "@/lib/utils";

export default function GoldHistoryChart({ points }: { points: GoldHistoryPoint[] }) {
  const gradientId = useId().replace(/:/g, "");
  const reducedMotion = useReducedMotion();
  const data = points.map(point => ({
    ...point,
    label: `${point.date.slice(8, 10)}/${point.date.slice(5, 7)}/${point.date.slice(2, 4)}`,
    buyValue: Number(point.buy),
    sellValue: point.sell ? Number(point.sell) : null,
  }));
  return (
    <div
      className="gold-chart-container"
      role="img"
      aria-label="BTMH gold price history. Exact buy and sell prices are available in the table below."
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} margin={{ top: 12, right: 5, bottom: 8, left: 3 }}>
          <defs>
            <linearGradient id={`${gradientId}-buy`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b48a22" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#b48a22" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={34}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            dy={9}
          />
          <YAxis
            width={47}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={value => shortMoney(String(Math.round(Number(value))))}
          />
          <Tooltip
            cursor={{ stroke: "#b48a22", strokeDasharray: "4 4" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="chart-tooltip gold-chart-tooltip">
                  <span>{String(payload[0].payload.label)}</span>
                  <strong>Mua vào · {money(String(payload[0].payload.buy))}</strong>
                  {payload[0].payload.sell ? (
                    <strong>Bán ra · {money(String(payload[0].payload.sell))}</strong>
                  ) : null}
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="buyValue"
            name="Mua vào"
            stroke="#b48a22"
            strokeWidth={2.3}
            fill={`url(#${gradientId}-buy)`}
            isAnimationActive={!reducedMotion && points.length <= 500}
            animationDuration={850}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
          <Area
            type="monotone"
            dataKey="sellValue"
            name="Bán ra"
            stroke="var(--accent)"
            strokeWidth={1.8}
            strokeDasharray="5 4"
            fill="transparent"
            connectNulls
            isAnimationActive={!reducedMotion && points.length <= 500}
            animationDuration={850}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
