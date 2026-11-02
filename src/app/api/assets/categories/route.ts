import { authorize } from "@/server/api";
import { endpoint, json, readJson } from "@/server/errors";
import { listAssetCategories, saveAssetCategory } from "@/server/asset-categories";
export async function GET(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    return json({ data: await listAssetCategories(db, userId) });
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, userId } = await authorize(request);
    return json({ data: await saveAssetCategory(db, userId, await readJson(request)) }, 201);
  });
}
