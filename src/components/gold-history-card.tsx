"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";
import type { GoldHistory, GoldPrice } from "@/lib/types";
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
  const [tableOpen, setTableOpen] = useState(false);
  const options = useMemo(
    () => (prices.some(price => price.productCode === "KGB") ? prices : [KGB_FALLBACK, ...prices]),
    [prices],
  );
  const history = useResource<{ data: GoldHistory }>(
    `/api/assets/gold/history?code=${encodeURIComponent(productCode)}`,
  );
  const data = history.data?.data;
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
          <div className="gold-chart-meta">
            <span className="gold-chart-legend buy">
              <i /> Mua vào
            </span>
            {data.points.some(point => point.sell !== null) ? (
              <span className="gold-chart-legend sell">
                <i /> Bán ra
              </span>
            ) : null}
            <span className="gold-chart-count">
              {data.rangeStart.slice(0, 4)}–{data.rangeEnd.slice(0, 4)} · {data.points.length} daily
              points{data.stale ? " · cached" : ""}
            </span>
          </div>
          <GoldHistoryChart points={data.points} />
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
                    {data.points.map((point, index) => (
                      <tr key={`${point.date}-${index}`}>
                        <td>
                          {point.date.slice(8, 10)}/{point.date.slice(5, 7)}/
                          {point.date.slice(0, 4)}
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
