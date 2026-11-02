import { authorize } from "@/server/api";
import { endpoint, json, readJson } from "@/server/errors";
import { createGoldPurchase, ensureDailyGoldPrices, getGoldPortfolio } from "@/server/gold";

export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    await ensureDailyGoldPrices(db);
    const id = await createGoldPurchase(db, await readJson(request), userId);
    const portfolio = await getGoldPortfolio(db, userId);
    return json({ data: portfolio.purchases.find(item => item.id === id) }, 201);
  });
}

export async function GET(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    return json({ data: await getGoldPortfolio(db, userId) });
  });
}
