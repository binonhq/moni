"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";
import type { GoldHistory, GoldPrice } from "@/lib/types";
import { selectGoldHistory, goldHistoryLabel, type GoldHistoryInterval } from "@/lib/gold-history";
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
  const [interval, setInterval] = useState<GoldHistoryInterval>("day");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
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
    () => selectGoldHistory(data?.points ?? [], interval, start, end),
    [data?.points, interval, start, end],
  );
  const invalidRange = !!(start && end && start > end);
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
            <label htmlFor="gold-history-interval">
              View by
              <select
                id="gold-history-interval"
                value={interval}
                onChange={event => setInterval(event.target.value as GoldHistoryInterval)}
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </label>
            <label htmlFor="gold-history-start">
              From
              <input
                id="gold-history-start"
                type="date"
                value={start}
                min={data.rangeStart}
                max={end || data.rangeEnd}
                onChange={event => setStart(event.target.value)}
                aria-invalid={invalidRange}
              />
            </label>
            <label htmlFor="gold-history-end">
              To
              <input
                id="gold-history-end"
                type="date"
                value={end}
                min={start || data.rangeStart}
                max={data.rangeEnd}
                onChange={event => setEnd(event.target.value)}
                aria-invalid={invalidRange}
              />
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStart("");
                setEnd("");
              }}
              disabled={!start && !end}
            >
              All time
            </Button>
          </div>
          {interval !== "day" && (
            <p className="muted">
              Last available price in each {interval} within the selected range.
            </p>
          )}
          {invalidRange && (
            <p className="form-error" role="alert">
              Start date must be on or before end date.
            </p>
          )}
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
              {points.length}{" "}
              {interval === "day" ? "daily" : interval === "month" ? "monthly" : "yearly"} points
              {data.stale ? " · cached" : ""}
            </span>
          </div>
          {points.length ? (
            <GoldHistoryChart points={points} interval={interval} />
          ) : (
            <p className="gold-history-empty" role="status">
              No prices in this date range. Choose another range or select All time.
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
                      <th>Period / price date</th>
                      <th>Mua vào</th>
                      <th>Bán ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point, index) => (
                      <tr key={`${point.date}-${index}`}>
                        <td>
                          {goldHistoryLabel(point.date, interval)}
                          {interval !== "day" && (
                            <small> · {goldHistoryLabel(point.date, "day")}</small>
                          )}
                        </td>
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
