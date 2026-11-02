import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { testDatabase } from "./helpers";
import {
  createGoldPurchase,
  deleteGoldPurchase,
  ensureDailyGoldPrices,
  getGoldHistory,
  getGoldPortfolio,
} from "@/server/gold";
import {
  createAssetCheckpoint,
  deleteAssetCheckpoint,
  listAssetCheckpoints,
} from "@/server/checkpoints";

let test: Awaited<ReturnType<typeof testDatabase>>;
const remotePrices = {
  data: {
    goldRates: {
      items: [
        {
          code: "KGB",
          name: "Kim Gia Bảo 24K",
          buy_price: 13_450_000,
          sell_price: 13_850_000,
        },
        {
          code: "BAC-999",
          name: "Silver",
          buy_price: 1_500_000,
          sell_price: 1_600_000,
        },
      ],
    },
  },
};
const remoteHistory = {
  data: {
    goldChartData: {
      data_points: [
        { date: "31/12", buy: 13_100_000, sell: 13_500_000 },
        { date: "01/01", buy: 13_200_000, sell: 13_600_000 },
        { date: "01/11", buy: 13_300_000, sell: 13_700_000 },
        { date: "02/11", buy: 13_450_000, sell: 13_850_000 },
      ],
      product_options: [{ label: "Kim Gia Bảo 24K", value: "KGB" }],
    },
  },
};

beforeAll(async () => {
  test = await testDatabase();
});
afterAll(async () => {
  await test.client.close();
});
beforeEach(async () => {
  await test.db.execute(
    sql`TRUNCATE gold_purchases, gold_prices, gold_history_cache, asset_checkpoint_items, asset_checkpoints CASCADE`,
  );
});

describe("BTMH gold accumulation", () => {
  it("fetches once per Vietnam day, filters non-gold products and values holdings at buy-back price", async () => {
    const fetcher = vi.fn(async () => Response.json(remotePrices)) as unknown as typeof fetch;
    const now = new Date("2026-11-02T02:00:00Z");
    await ensureDailyGoldPrices(test.db, now, fetcher);
    await ensureDailyGoldPrices(test.db, new Date("2026-11-02T10:00:00Z"), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await createGoldPurchase(test.db, {
      productCode: "KGB",
      weightMilliChi: 2500,
      purchasePrice: "30000000",
      purchasedAt: "2026-11-01T09:00:00+07:00",
    });
    const portfolio = await getGoldPortfolio(test.db, undefined, now, fetcher);
    expect(portfolio.priceDate).toBe("2026-11-02");
    expect(portfolio.prices).toHaveLength(1);
    expect(portfolio.totalCost).toBe("30000000");
    expect(portfolio.currentValue).toBe("33625000");
    expect(portfolio.purchases[0]).toMatchObject({
      productName: "Kim Gia Bảo 24K",
      weightMilliChi: 2500,
      currentValue: "33625000",
    });
  });

  it("keeps the latest cached price when the daily source is unavailable", async () => {
    const ok = vi.fn(async () => Response.json(remotePrices)) as unknown as typeof fetch;
    await ensureDailyGoldPrices(test.db, new Date("2026-11-01T02:00:00Z"), ok);
    const unavailable = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const portfolio = await getGoldPortfolio(
      test.db,
      undefined,
      new Date("2026-11-02T02:00:00Z"),
      unavailable,
    );
    expect(portfolio.priceDate).toBe("2026-11-01");
    expect(portfolio.priceStale).toBe(true);
    expect(unavailable).toHaveBeenCalledTimes(1);
  });

  it("deletes only an existing purchase", async () => {
    const fetcher = vi.fn(async () => Response.json(remotePrices)) as unknown as typeof fetch;
    const now = new Date("2026-11-02T02:00:00Z");
    await ensureDailyGoldPrices(test.db, now, fetcher);
    const id = await createGoldPurchase(test.db, {
      productCode: "KGB",
      weightMilliChi: 1000,
      purchasePrice: 13_800_000,
      purchasedAt: "2026-11-02T09:00:00+07:00",
    });
    await deleteGoldPurchase(test.db, id);
    await expect(deleteGoldPurchase(test.db, id)).rejects.toMatchObject({ status: 404 });
  });

  it("requests the entire available history once per day and serves the cached snapshot", async () => {
    const fetchMock = vi.fn(async (..._args: Parameters<typeof fetch>) =>
      Response.json(remoteHistory),
    );
    const fetcher = fetchMock as unknown as typeof fetch;
    const now = new Date("2026-11-02T02:00:00Z");
    const first = await getGoldHistory(test.db, "KGB", now, fetcher);
    const second = await getGoldHistory(test.db, "KGB", new Date("2026-11-02T10:00:00Z"), fetcher);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('from_date: \\"1900-01-01\\"');
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      productCode: "KGB",
      productName: "Kim Gia Bảo 24K",
      rangeStart: "2025-12-31",
      rangeEnd: "2026-11-02",
      stale: false,
      points: [
        { date: "2025-12-31", buy: "13100000", sell: "13500000" },
        { date: "2026-01-01", buy: "13200000", sell: "13600000" },
        { date: "2026-11-01", buy: "13300000", sell: "13700000" },
        { date: "2026-11-02", buy: "13450000", sell: "13850000" },
      ],
    });
  });

  it("falls back to stale chart history when BTMH is temporarily unavailable", async () => {
    const ok = vi.fn(async () => Response.json(remoteHistory)) as unknown as typeof fetch;
    await getGoldHistory(test.db, "KGB", new Date("2026-11-01T02:00:00Z"), ok);
    const unavailable = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const cached = await getGoldHistory(
      test.db,
      "KGB",
      new Date("2026-11-02T02:00:00Z"),
      unavailable,
    );
    expect(cached.stale).toBe(true);
    expect(cached.points).toHaveLength(4);
  });
});

describe("asset checkpoints", () => {
  it("creates an immutable timestamped snapshot and totals all entries exactly", async () => {
    const id = await createAssetCheckpoint(test.db, {
      items: [
        { name: "Emergency fund", amount: "9007199254740991" },
        { name: "Bank account", amount: "25000000" },
      ],
    });
    const checkpoints = await listAssetCheckpoints(test.db);
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0]).toMatchObject({
      id,
      total: "9007199279740991",
      items: [
        { name: "Emergency fund", amount: "9007199254740991" },
        { name: "Bank account", amount: "25000000" },
      ],
    });
    expect(checkpoints[0].createdAt).toBeTruthy();
    await deleteAssetCheckpoint(test.db, id);
    expect(await listAssetCheckpoints(test.db)).toEqual([]);
  });
});
