"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";
import type { GoldHistory, GoldPrice } from "@/lib/types";
import {
  goldHistoryStats,
  selectGoldHistoryView,
  goldHistoryLabel,
  type GoldHistoryView,
} from "@/lib/gold-history";
import { money } from "@/lib/utils";
import { useResource } from "@/hooks/use-resource";
import { Button } from "./ui/button";

const GoldHistoryChart = dynamic(() => import("./gold-history-chart"), {
  ssr: false,
  loading: () => <div className="skeleton gold-chart-container" />,
});
const KGB_FALLBACK: GoldPrice = {
  productCode: "KGB",
  productName: "Kim Gia Bảo 24K",
  buyPrice: "0",
  sellPrice: "0",
};

export function GoldHistoryCard({ prices }: { prices: GoldPrice[] }) {
  const [productCode, setProductCode] = useState("KGB");
  const [view, setView] = useState<GoldHistoryView>("all");
  const [tableOpen, setTableOpen] = useState(false);
  const options = useMemo(
    () => (prices.some(price => price.productCode === "KGB") ? prices : [KGB_FALLBACK, ...prices]),
    [prices],
  );
  const history = useResource<{ data: GoldHistory }>(
    `/api/assets/gold/history?code=${encodeURIComponent(productCode)}`,
  );
  const data = history.data?.data;
  const points = useMemo(
    () => selectGoldHistoryView(data?.points ?? [], view),
    [data?.points, view],
  );
  const stats = useMemo(
    () => goldHistoryStats(data?.points ?? [], points[0]?.date ?? "", points.at(-1)?.date ?? ""),
    [data?.points, points],
  );
  return (
    <section className="panel gold-history-panel">
      <div className="panel-heading gold-history-heading">
        <div>
          <h2>Gold price history</h2>
          <p>Entire available history provided by BTMH</p>
        </div>
        <div className="gold-history-controls">
          <label htmlFor="gold-history-product" className="sr-only">
            Gold product
          </label>
          <select
            id="gold-history-product"
            value={productCode}
            onChange={event => setProductCode(event.target.value)}
          >
            {options.map(price => (
              <option key={price.productCode} value={price.productCode}>
                {price.productName}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh gold price history"
            onClick={history.refresh}
            disabled={history.loading || !history.online}
          >
            <RefreshCw size={17} className={history.loading ? "spin" : ""} />
          </Button>
        </div>
      </div>
      {history.error ? (
        <div className="gold-history-error" role="alert">
          <Coins size={20} />
          <span>{history.error}</span>
          <Button variant="secondary" size="sm" onClick={history.refresh}>
            Try again
          </Button>
        </div>
      ) : data ? (
        <>
          <div className="gold-history-filters">
            <label htmlFor="gold-history-view">
              View by
              <select
                id="gold-history-view"
                value={view}
                onChange={event => setView(event.target.value as GoldHistoryView)}
              >
                <option value="all">All time</option>
                <option value="year">Year · 365 days</option>
                <option value="month">Month · 30 days</option>
              </select>
            </label>
          </div>
          <p className="gold-view-note">
            Daily prices ·{" "}
            {view === "all"
              ? "Entire available history"
              : (view === "year" ? "Last 365 days" : "Last 30 days") +
                " ending on the latest available price date"}
            .
          </p>
          <section className="gold-statistics" aria-label="Gold buy-back price statistics">
            <div className="gold-statistics-heading">
              <h3>Price highlights · Mua vào</h3>
              <p>
                VND / chỉ · Based on available BTMH daily prices.
                {stats.anchor
                  ? " Rolling months end on " + goldHistoryLabel(stats.anchor, "day") + "."
                  : ""}{" "}
                Equal prices show the most recent date.
              </p>
            </div>
            {stats.latest && (
              <p className="gold-latest-price">
                Latest: <strong>{money(stats.latest.buy)}</strong> ·{" "}
                {goldHistoryLabel(stats.latest.date, "day")}
                {data.stale ? " · cached" : ""}
              </p>
            )}
            <div className="gold-statistics-grid">
              {stats.periods.map(period => (
                <section className="gold-statistic" key={period.label}>
                  <h4>{period.label === "Selected range" ? "Current view" : period.label}</h4>
                  <dl>
                    <div>
                      <dt>High</dt>
                      <dd>
                        {period.high ? (
                          <>
                            <strong>{money(period.high.buy)}</strong>
                            <span>{goldHistoryLabel(period.high.date, "day")}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Low</dt>
                      <dd>
                        {period.low ? (
                          <>
                            <strong>{money(period.low.buy)}</strong>
                            <span>{goldHistoryLabel(period.low.date, "day")}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                  {!period.high && <p>No prices in this range.</p>}
                </section>
              ))}
            </div>
          </section>
          <div className="gold-chart-meta">
            <span className="gold-chart-legend buy">
              <i /> Mua vào
            </span>
            {points.some(point => point.sell !== null) ? (
              <span className="gold-chart-legend sell">
                <i /> Bán ra
              </span>
            ) : null}
            <span className="gold-chart-count">
              {points.length} daily points
              {data.stale ? " · cached" : ""}
            </span>
          </div>
          {points.length ? (
            <GoldHistoryChart points={points} interval="day" />
          ) : (
            <p className="gold-history-empty" role="status">
              No prices available for this view.
            </p>
          )}
          <details
            className="chart-table gold-history-table"
            onToggle={event => setTableOpen(event.currentTarget.open)}
          >
            <summary>View exact prices</summary>
            {tableOpen ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Mua vào</th>
                      <th>Bán ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point, index) => (
                      <tr key={`${point.date}-${index}`}>
                        <td>{goldHistoryLabel(point.date, "day")}</td>
                        <td>{money(point.buy)}</td>
                        <td>{point.sell ? money(point.sell) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </details>
        </>
      ) : (
        <div className="skeleton gold-chart-container" />
      )}
    </section>
  );
}
