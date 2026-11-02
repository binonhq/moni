import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { goldHistoryCache, goldPrices, goldPurchases } from "@/db/schema";
import { localDay } from "@/lib/dates";
import { goldPurchaseSchema } from "@/lib/validation";
import type {
  GoldHistory,
  GoldHistoryPoint,
  GoldPortfolio,
  GoldPrice,
  GoldPurchase,
} from "@/lib/types";
import { ApiError } from "./errors";

const BTMH_ENDPOINT = "https://baotinmanhhai.vn/api/graphql";
const GOLD_CODES = new Set([
  "VRTL",
  "KGB",
  "KHS",
  "999",
  "KGBG",
  "BT24K",
  "9999",
  "BT-TKC",
  "SJC9999",
]);

type RemotePrice = { code: string; name: string; buy_price: number; sell_price: number };
type RemoteHistoryPoint = { date: string; buy: number; sell: number };

async function fetchBtmhPrices(fetcher: typeof fetch = fetch): Promise<RemotePrice[]> {
  const response = await fetcher(BTMH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query:
        "query MoniGoldRates { goldRates(limit: 50) { items { code name buy_price sell_price } } }",
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("BTMH_PRICE_UNAVAILABLE");
  const body = (await response.json()) as { data?: { goldRates?: { items?: RemotePrice[] } } };
  const items = body.data?.goldRates?.items;
  if (!Array.isArray(items)) throw new Error("BTMH_PRICE_INVALID");
  return items.filter(
    item =>
      GOLD_CODES.has(item.code) &&
      item.name &&
      Number.isSafeInteger(item.buy_price) &&
      item.buy_price > 0 &&
      Number.isSafeInteger(item.sell_price) &&
      item.sell_price > 0,
  );
}

function expandHistoryDates(points: RemoteHistoryPoint[], endDate: string): GoldHistoryPoint[] {
  let year = Number(endDate.slice(0, 4));
  let nextMonthDay: number | null = null;
  const expanded: GoldHistoryPoint[] = [];
  for (let index = points.length - 1; index >= 0; index--) {
    const point = points[index];
    if (
      !/^\d{2}\/\d{2}$/.test(point.date) ||
      !Number.isSafeInteger(point.buy) ||
      point.buy <= 0 ||
      !Number.isSafeInteger(point.sell)
    )
      continue;
    const [day, month] = point.date.split("/").map(Number);
    const monthDay = month * 100 + day;
    if (nextMonthDay !== null && monthDay > nextMonthDay) year--;
    expanded.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      buy: String(point.buy),
      sell: point.sell > 1 ? String(point.sell) : null,
    });
    nextMonthDay = monthDay;
  }
  return expanded.reverse();
}

async function fetchBtmhHistory(code: string, endDate: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(BTMH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query:
        'query MoniGoldHistory($code: String!, $toDate: String!) { goldChartData(code: $code, from_date: "1900-01-01", to_date: $toDate) { data_points { date buy sell } product_options { label value } } }',
      variables: { code, toDate: endDate },
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("BTMH_HISTORY_UNAVAILABLE");
  const body = (await response.json()) as {
    data?: {
      goldChartData?: {
        data_points?: RemoteHistoryPoint[];
        product_options?: Array<{ label: string; value: string }>;
      };
    };
  };
  const chart = body.data?.goldChartData;
  if (!Array.isArray(chart?.data_points) || !chart.data_points.length)
    throw new Error("BTMH_HISTORY_INVALID");
  const points = expandHistoryDates(chart.data_points, endDate);
  if (!points.length) throw new Error("BTMH_HISTORY_INVALID");
  const productName = chart.product_options?.find(option => option.value === code)?.label ?? code;
  return { productName, points };
}

export async function getGoldHistory(
  db: Database,
  code: string,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<GoldHistory> {
  if (!GOLD_CODES.has(code))
    throw new ApiError(400, "INVALID_GOLD_PRODUCT", "Choose a supported BTMH gold product.");
  let [cached] = await db
    .select()
    .from(goldHistoryCache)
    .where(eq(goldHistoryCache.productCode, code))
    .limit(1);
  const today = localDay(now);
  if (!cached || localDay(cached.fetchedAt) !== today) {
    try {
      const history = await fetchBtmhHistory(code, today, fetcher);
      [cached] = await db
        .insert(goldHistoryCache)
        .values({
          productCode: code,
          productName: history.productName,
          points: history.points,
          fetchedAt: now,
        })
        .onConflictDoUpdate({
          target: goldHistoryCache.productCode,
          set: {
            productName: history.productName,
            points: history.points,
            fetchedAt: now,
          },
        })
        .returning();
    } catch {
      // Keep serving the previous successful history snapshot.
    }
  }
  if (!cached)
    throw new ApiError(
      503,
      "GOLD_HISTORY_UNAVAILABLE",
      "BTMH price history is temporarily unavailable.",
    );
  return {
    productCode: cached.productCode,
    productName: cached.productName,
    rangeStart: cached.points[0].date,
    rangeEnd: cached.points.at(-1)?.date ?? cached.points[0].date,
    fetchedAt: cached.fetchedAt.toISOString(),
    stale: localDay(cached.fetchedAt) !== today,
    points: cached.points,
  };
}

async function pricesForDate(db: Database, priceDate: string) {
  return db
    .select()
    .from(goldPrices)
    .where(eq(goldPrices.priceDate, priceDate))
    .orderBy(goldPrices.productName);
}

export async function ensureDailyGoldPrices(
  db: Database,
  now = new Date(),
  fetcher: typeof fetch = fetch,
) {
  const today = localDay(now);
  let rows = await pricesForDate(db, today);
  if (!rows.length) {
    try {
      const remote = await fetchBtmhPrices(fetcher);
      if (remote.length) {
        await db
          .insert(goldPrices)
          .values(
            remote.map(item => ({
              priceDate: today,
              productCode: item.code,
              productName: item.name,
              buyPrice: BigInt(item.buy_price),
              sellPrice: BigInt(item.sell_price),
              fetchedAt: now,
            })),
          )
          .onConflictDoNothing();
        rows = await pricesForDate(db, today);
      }
    } catch {
      // A cached value is more useful than making the entire assets page unavailable.
    }
  }
  if (!rows.length) {
    const [latest] = await db
      .select({ priceDate: goldPrices.priceDate })
      .from(goldPrices)
      .orderBy(desc(goldPrices.priceDate))
      .limit(1);
    if (latest) rows = await pricesForDate(db, latest.priceDate);
  }
  return rows;
}

const serializePrice = (row: typeof goldPrices.$inferSelect): GoldPrice => ({
  productCode: row.productCode,
  productName: row.productName,
  buyPrice: row.buyPrice.toString(),
  sellPrice: row.sellPrice.toString(),
});

export async function getGoldPortfolio(
  db: Database,
  userId?: string,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<GoldPortfolio> {
  const priceRows = await ensureDailyGoldPrices(db, now, fetcher);
  const purchaseRows = await db
    .select()
    .from(goldPurchases)
    .where(userId ? eq(goldPurchases.userId, userId) : undefined)
    .orderBy(desc(goldPurchases.purchasedAt), desc(goldPurchases.id));
  const priceByCode = new Map(priceRows.map(row => [row.productCode, row]));
  let totalCost = 0n;
  let currentValue = 0n;
  let hasEveryPrice = true;
  const purchases: GoldPurchase[] = purchaseRows.map(row => {
    totalCost += row.purchasePrice;
    const price = priceByCode.get(row.productCode);
    const value = price ? (price.buyPrice * BigInt(row.weightMilliChi)) / 1000n : null;
    if (value === null) hasEveryPrice = false;
    else currentValue += value;
    return {
      id: row.id,
      productCode: row.productCode,
      productName: row.productName,
      weightMilliChi: row.weightMilliChi,
      purchasePrice: row.purchasePrice.toString(),
      currentValue: value?.toString() ?? null,
      purchasedAt: row.purchasedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  });
  const priceDate = priceRows[0]?.priceDate ?? null;
  const fetchedAt = priceRows.reduce<Date | null>(
    (latest, row) => (!latest || row.fetchedAt > latest ? row.fetchedAt : latest),
    null,
  );
  return {
    priceDate,
    priceFetchedAt: fetchedAt?.toISOString() ?? null,
    priceStale: priceDate !== null && priceDate !== localDay(now),
    prices: priceRows.map(serializePrice),
    purchases,
    totalCost: totalCost.toString(),
    currentValue: hasEveryPrice ? currentValue.toString() : null,
  };
}

export async function createGoldPurchase(db: Database, input: unknown, userId?: string) {
  const data = goldPurchaseSchema.parse(input);
  const [product] = await db
    .select({ code: goldPrices.productCode, name: goldPrices.productName })
    .from(goldPrices)
    .where(eq(goldPrices.productCode, data.productCode))
    .orderBy(desc(goldPrices.priceDate))
    .limit(1);
  if (!product)
    throw new ApiError(
      400,
      "INVALID_GOLD_PRODUCT",
      "Choose a BTMH gold product with a current price.",
    );
  const [row] = await db
    .insert(goldPurchases)
    .values({
      userId,
      productCode: product.code,
      productName: product.name,
      weightMilliChi: data.weightMilliChi,
      purchasePrice: BigInt(data.purchasePrice),
      purchasedAt: new Date(data.purchasedAt),
    })
    .returning();
  return row.id;
}

export async function deleteGoldPurchase(db: Database, id: string, userId?: string) {
  const purchaseId = z.uuid().parse(id);
  const conditions = [eq(goldPurchases.id, purchaseId)];
  if (userId) conditions.push(eq(goldPurchases.userId, userId));
  const removed = await db
    .delete(goldPurchases)
    .where(and(...conditions))
    .returning({ id: goldPurchases.id });
  if (!removed.length)
    throw new ApiError(404, "GOLD_PURCHASE_NOT_FOUND", "This gold purchase no longer exists.");
}
